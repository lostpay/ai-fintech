"""
SQLite database service for AI proof of concept
Connects to the actual React Native app's SQLite database
"""
import sqlite3
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import logging
from models.data_types import Transaction, Budget, Category

logger = logging.getLogger(__name__)

class SQLiteDatabaseService:
    """Real database service connecting to React Native SQLite database"""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or self._find_database_path()
        self.connection = None
        
    def _find_database_path(self) -> str:
        """Find the React Native SQLite database file"""
        # Check environment variable first
        env_path = os.getenv("RN_DATABASE_PATH")
        if env_path and Path(env_path).exists():
            logger.info(f"Using database path from environment: {env_path}")
            return env_path
        
        # Common Expo SQLite locations on Windows
        possible_paths = [
            # Current app directory (for development)
            Path(__file__).parent.parent.parent / "budget_tracker.db",
            # Expo SQLite default locations
            Path.home() / "AppData" / "Local" / "Expo" / "budget_tracker.db",
            Path.home() / ".expo" / "budget_tracker.db",
            # Alternative development paths
            Path(__file__).parent.parent.parent / "app" / "budget_tracker.db",
            Path(__file__).parent.parent.parent / "src" / "budget_tracker.db",
        ]
        
        for path in possible_paths:
            if path.exists():
                logger.info(f"Found database at: {path}")
                return str(path)
        
        # If not found, create a fallback path for development
        fallback_path = Path(__file__).parent.parent.parent / "budget_tracker.db"
        logger.warning(f"Database not found, will use fallback: {fallback_path}")
        return str(fallback_path)
    
    def connect(self):
        """Connect to the SQLite database"""
        try:
            self.connection = sqlite3.connect(self.db_path, timeout=10.0)
            self.connection.row_factory = sqlite3.Row  # Enable dict-like access
            # Enable foreign key constraints
            self.connection.execute("PRAGMA foreign_keys = ON")
            logger.info(f"Connected to database: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to connect to database {self.db_path}: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def _ensure_connected(self):
        """Ensure database connection is active"""
        if not self.connection:
            self.connect()
    
    def _execute_query(self, query: str, params: tuple = ()) -> List[sqlite3.Row]:
        """Execute a query and return results with fresh data"""
        try:
            # Create a fresh connection for each query to ensure we get latest data
            # This fixes the issue where React Native app writes don't immediately 
            # appear in existing connections
            fresh_connection = sqlite3.connect(self.db_path, timeout=10.0)
            fresh_connection.row_factory = sqlite3.Row
            fresh_connection.execute("PRAGMA foreign_keys = ON")
            
            cursor = fresh_connection.cursor()
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Close the fresh connection
            fresh_connection.close()
            
            return results
        except Exception as e:
            logger.error(f"Query failed: {query}, Error: {e}")
            raise
    
    def _dict_from_row(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert sqlite3.Row to dictionary"""
        return dict(row)
    
    def get_transactions_with_categories(self, 
                                       category_id: Optional[int] = None,
                                       transaction_type: Optional[str] = None,
                                       start_date: Optional[datetime] = None,
                                       end_date: Optional[datetime] = None,
                                       limit: Optional[int] = None) -> List[Transaction]:
        """Get transactions with category information"""
        
        # Base query with JOIN to get category details
        query = """
        SELECT 
            t.id, 
            t.amount, 
            t.description, 
            t.category_id, 
            t.transaction_type, 
            t.date, 
            t.created_at,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE 1=1
        """
        
        params = []
        
        # Add filters
        if category_id:
            query += " AND t.category_id = ?"
            params.append(category_id)
        
        if transaction_type:
            query += " AND t.transaction_type = ?"
            params.append(transaction_type)
        
        if start_date:
            query += " AND t.date >= ?"
            params.append(start_date.strftime('%Y-%m-%d'))
        
        if end_date:
            query += " AND t.date <= ?"
            params.append(end_date.strftime('%Y-%m-%d'))
        
        # Order by date (newest first)
        query += " ORDER BY t.date DESC, t.created_at DESC"
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        rows = self._execute_query(query, tuple(params))
        
        transactions = []
        for row in rows:
            transaction = Transaction(
                id=row['id'],
                # Convert cents back to dollars (React Native stores as INTEGER cents)
                amount=row['amount'] / 100.0,
                description=row['description'],
                category_id=row['category_id'],
                category_name=row['category_name'],
                category_color=row['category_color'],
                transaction_type=row['transaction_type'],
                date=datetime.strptime(row['date'], '%Y-%m-%d'),
                created_at=datetime.strptime(row['created_at'], '%Y-%m-%d %H:%M:%S')
            )
            transactions.append(transaction)
        
        return transactions
    
    def get_budgets_with_details(self) -> List[Budget]:
        """Get all budgets with calculated spending details"""
        query = """
        SELECT 
            b.id,
            b.category_id,
            b.amount,
            b.period_start,
            b.period_end,
            b.created_at,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        ORDER BY c.name
        """
        
        rows = self._execute_query(query)
        budgets = []
        
        for row in rows:
            # Calculate spent amount for this budget period
            spent_query = """
            SELECT COALESCE(SUM(amount), 0) as spent_amount
            FROM transactions 
            WHERE category_id = ? 
            AND transaction_type = 'expense'
            AND date >= ? 
            AND date <= ?
            """
            
            spent_params = (row['category_id'], row['period_start'], row['period_end'])
            spent_rows = self._execute_query(spent_query, spent_params)
            spent_amount = spent_rows[0]['spent_amount'] / 100.0 if spent_rows else 0.0
            
            # Convert budget amount from cents to dollars
            budget_amount = row['amount'] / 100.0
            remaining_amount = max(0, budget_amount - spent_amount)
            percentage_used = min(100, (spent_amount / budget_amount) * 100) if budget_amount > 0 else 0
            
            budget = Budget(
                id=row['id'],
                category_id=row['category_id'],
                category_name=row['category_name'],
                category_color=row['category_color'],
                amount=budget_amount,
                spent_amount=spent_amount,
                remaining_amount=remaining_amount,
                percentage_used=percentage_used,
                period_start=datetime.strptime(row['period_start'], '%Y-%m-%d'),
                period_end=datetime.strptime(row['period_end'], '%Y-%m-%d')
            )
            budgets.append(budget)
        
        return budgets
    
    def get_categories(self) -> List[Category]:
        """Get all categories"""
        query = """
        SELECT id, name, color, icon, is_default, is_hidden, created_at
        FROM categories 
        WHERE is_hidden = 0
        ORDER BY is_default DESC, name
        """
        
        rows = self._execute_query(query)
        categories = []
        
        for row in rows:
            category = Category(
                id=row['id'],
                name=row['name'],
                color=row['color'],
                icon=row['icon']
            )
            categories.append(category)
        
        return categories
    
    def get_spending_summary(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> dict:
        """Get spending summary for a date range"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)  # Last 30 days
        if not end_date:
            end_date = datetime.now()
        
        # Get filtered transactions
        transactions = self.get_transactions_with_categories(
            transaction_type="expense",
            start_date=start_date,
            end_date=end_date
        )
        
        total_amount = sum(t.amount for t in transactions)
        
        # Group by category
        category_spending = {}
        for transaction in transactions:
            category_name = transaction.category_name
            if category_name not in category_spending:
                category_spending[category_name] = 0
            category_spending[category_name] += transaction.amount
        
        return {
            "total_amount": total_amount,
            "transactions": transactions,
            "category_breakdown": category_spending,
            "transaction_count": len(transactions),
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }
    
    def check_database_health(self) -> dict:
        """Check if database is accessible and return basic stats"""
        try:
            self._ensure_connected()
            
            # Get table counts
            stats = {}
            tables = ['categories', 'transactions', 'budgets', 'goals', 'ai_conversations']
            
            for table in tables:
                try:
                    count_query = f"SELECT COUNT(*) as count FROM {table}"
                    result = self._execute_query(count_query)
                    stats[f"{table}_count"] = result[0]['count'] if result else 0
                except Exception as e:
                    stats[f"{table}_count"] = f"Error: {e}"
            
            return {
                "status": "healthy",
                "database_path": self.db_path,
                "database_exists": Path(self.db_path).exists(),
                "connection_status": "connected" if self.connection else "disconnected",
                "stats": stats
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "database_path": self.db_path,
                "error": str(e),
                "database_exists": Path(self.db_path).exists(),
                "connection_status": "failed"
            }