"""
Supabase Database Service for AI Backend.
Provides cloud-based database operations for transactions, budgets, categories, and goals.
Includes ML-specific methods for storing predictions, budgets, and patterns.
Replaces local SQLite with cloud Supabase for multi-user support and real-time sync.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from dataclasses import dataclass
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

@dataclass
class Transaction:
    """Transaction data model matching Supabase schema"""
    id: int
    amount: int  # Stored as cents
    description: str
    category_id: int
    category_name: str  # Joined from categories table
    transaction_type: str  # 'expense' or 'income'
    date: date
    user_id: str
    created_at: datetime
    updated_at: datetime

@dataclass  
class Budget:
    """Budget data model matching Supabase schema"""
    id: int
    category_id: int
    category_name: str  # Joined from categories table
    amount: int  # Stored as cents
    period_start: date
    period_end: date
    user_id: str
    created_at: datetime
    updated_at: datetime
    spent_amount: float = 0.0  # Calculated field
    remaining_amount: float = 0.0  # Calculated field
    percentage_used: float = 0.0  # Calculated field

@dataclass
class Category:
    """Category data model matching Supabase schema"""
    id: int
    name: str
    color: str
    icon: str
    is_default: bool
    is_hidden: bool
    user_id: Optional[str]  # NULL for global categories
    created_at: datetime
    updated_at: datetime

@dataclass
class Goal:
    """Goal data model matching Supabase schema"""
    id: int
    name: str
    target_amount: int  # Stored as cents
    current_amount: int  # Stored as cents
    target_date: Optional[date]
    description: str
    is_completed: bool
    user_id: str
    created_at: datetime
    updated_at: datetime

class SupabaseService:
    """
    Service for interacting with Supabase database.
    Provides unified interface for database operations across transactions,
    budgets, categories, goals, and ML data storage.
    Maintains compatibility with original SQLite service interface.
    """

    def __init__(self, user_id: str):
        """
        Initialize Supabase connection for specific user.

        Args:
            user_id: User identifier for data filtering (required)

        Raises:
            ValueError: If user_id is empty or None
        """
        if not user_id:
            raise ValueError("SupabaseService requires a valid user_id")
        self.user_id = user_id
        self.client: Optional[Client] = None
        self._connect()
    
    def _connect(self):
        """
        Establish connection to Supabase using environment credentials.
        Uses service key for backend operations (bypasses RLS policies).
        Raises ValueError if credentials are missing.
        """
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for backend
            
            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
            
            self.client = create_client(supabase_url, supabase_key)
            logger.info("Successfully connected to Supabase")
            
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def get_transactions_with_categories(self, limit: int = 1000) -> List[Transaction]:
        """
        Get transactions with category names joined from categories table.
        Returns transactions ordered by date (most recent first).

        Args:
            limit: Maximum number of transactions to retrieve

        Returns:
            List of Transaction objects with category names
        """
        try:
            response = (self.client
                       .table("transactions")
                       .select("""
                           id, amount, description, category_id, transaction_type, 
                           date, user_id, created_at, updated_at,
                           categories(name)
                       """)
                       .eq("user_id", self.user_id)
                       .order("date", desc=True)
                       .limit(limit)
                       .execute())
            
            transactions = []
            for row in response.data:
                transactions.append(Transaction(
                    id=row["id"],
                    amount=row["amount"],
                    description=row["description"],
                    category_id=row["category_id"],
                    category_name=row["categories"]["name"] if row["categories"] else "Unknown",
                    transaction_type=row["transaction_type"],
                    date=datetime.fromisoformat(row["date"]).date(),
                    user_id=row["user_id"],
                    created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                ))
            
            return transactions
            
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            return []
    
    def get_budgets_with_details(self) -> List[Budget]:
        """
        Get budgets with category names and calculated spending metrics.
        Calculates spent_amount, remaining_amount, and percentage_used
        by querying transactions within budget period.

        Returns:
            List of Budget objects with spending calculations
        """
        try:
            # Get budgets with category names
            budget_response = (self.client
                              .table("budgets")
                              .select("""
                                  id, category_id, amount, period_start, period_end,
                                  user_id, created_at, updated_at,
                                  categories(name)
                              """)
                              .eq("user_id", self.user_id)
                              .execute())
            
            budgets = []
            for row in budget_response.data:
                budget = Budget(
                    id=row["id"],
                    category_id=row["category_id"],
                    category_name=row["categories"]["name"] if row["categories"] else "Unknown",
                    amount=row["amount"],
                    period_start=datetime.fromisoformat(row["period_start"]).date(),
                    period_end=datetime.fromisoformat(row["period_end"]).date(),
                    user_id=row["user_id"],
                    created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                )
                
                # Calculate spent amount for this budget period
                spent_response = (self.client
                                 .table("transactions")
                                 .select("amount")
                                 .eq("user_id", self.user_id)
                                 .eq("category_id", budget.category_id)
                                 .eq("transaction_type", "expense")
                                 .gte("date", budget.period_start.isoformat())
                                 .lte("date", budget.period_end.isoformat())
                                 .execute())
                
                spent_amount = sum(t["amount"] for t in spent_response.data)  # NT$ values
                budget.spent_amount = spent_amount
                budget.remaining_amount = budget.amount - spent_amount
                budget.percentage_used = (spent_amount / budget.amount) * 100 if budget.amount > 0 else 0
                
                budgets.append(budget)
            
            return budgets
            
        except Exception as e:
            logger.error(f"Error getting budgets: {e}")
            return []
    
    def get_categories(self, include_hidden: bool = False) -> List[Category]:
        """Get categories available to the user"""
        try:
            query = self.client.table("categories").select("*")
            
            # Get both global categories (user_id IS NULL) and user-specific categories
            query = query.or_(f"user_id.is.null,user_id.eq.{self.user_id}")
            
            if not include_hidden:
                query = query.eq("is_hidden", False)
            
            response = query.execute()
            
            categories = []
            for row in response.data:
                categories.append(Category(
                    id=row["id"],
                    name=row["name"],
                    color=row["color"],
                    icon=row["icon"],
                    is_default=row["is_default"],
                    is_hidden=row["is_hidden"],
                    user_id=row["user_id"],
                    created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                ))
            
            return categories
            
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return []
    
    def get_goals(self) -> List[Goal]:
        """Get goals for the user"""
        try:
            response = (self.client
                       .table("goals")
                       .select("*")
                       .eq("user_id", self.user_id)
                       .execute())
            
            goals = []
            for row in response.data:
                goals.append(Goal(
                    id=row["id"],
                    name=row["name"],
                    target_amount=row["target_amount"],
                    current_amount=row["current_amount"],
                    target_date=datetime.fromisoformat(row["target_date"]).date() if row["target_date"] else None,
                    description=row["description"],
                    is_completed=row["is_completed"],
                    user_id=row["user_id"],
                    created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                ))
            
            return goals
            
        except Exception as e:
            logger.error(f"Error getting goals: {e}")
            return []
    
    def get_spending_summary(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get spending summary with category breakdown"""
        try:
            # Build query for transactions
            query = (self.client
                    .table("transactions")
                    .select("""
                        amount, transaction_type,
                        categories(name)
                    """)
                    .eq("user_id", self.user_id))
            
            if start_date:
                query = query.gte("date", start_date)
            if end_date:
                query = query.lte("date", end_date)
                
            response = query.execute()
            
            total_amount = 0.0
            category_breakdown = {}
            transaction_count = 0
            
            for row in response.data:
                amount = row["amount"]  # NT$ values
                category_name = row["categories"]["name"] if row["categories"] else "Unknown"
                
                if row["transaction_type"] == "expense":
                    total_amount += amount
                    category_breakdown[category_name] = category_breakdown.get(category_name, 0) + amount
                
                transaction_count += 1
            
            return {
                "total_amount": total_amount,
                "transaction_count": transaction_count,
                "category_breakdown": category_breakdown
            }
            
        except Exception as e:
            logger.error(f"Error getting spending summary: {e}")
            return {
                "total_amount": 0.0,
                "transaction_count": 0,
                "category_breakdown": {}
            }
    
    def get_database_health(self) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            # Simple health check - try to count categories
            response = self.client.table("categories").select("id", count="exact").limit(1).execute()
            
            return {
                "status": "healthy",
                "connection_status": "connected",
                "database_type": "supabase",
                "user_id": self.user_id,
                "categories_count": response.count,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "error",
                "connection_status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def create_transaction(self, amount: float, description: str, category_id: int, 
                          transaction_type: str = "expense", date_str: Optional[str] = None) -> Optional[int]:
        """Create a new transaction"""
        try:
            data = {
                "amount": int(amount * 100),  # Convert to cents
                "description": description,
                "category_id": category_id,
                "transaction_type": transaction_type,
                "user_id": self.user_id
            }
            
            if date_str:
                data["date"] = date_str
            
            response = self.client.table("transactions").insert(data).execute()
            
            if response.data:
                return response.data[0]["id"]
            return None
            
        except Exception as e:
            logger.error(f"Error creating transaction: {e}")
            return None
    
    def create_budget(self, category_id: int, amount: float, period_start: str, period_end: str) -> Optional[int]:
        """Create a new budget"""
        try:
            data = {
                "category_id": category_id,
                "amount": int(amount * 100),  # Convert to cents
                "period_start": period_start,
                "period_end": period_end,
                "user_id": self.user_id
            }
            
            response = self.client.table("budgets").insert(data).execute()
            
            if response.data:
                return response.data[0]["id"]
            return None
            
        except Exception as e:
            logger.error(f"Error creating budget: {e}")
            return None
    
    def create_goal(self, name: str, target_amount: float, description: str, 
                   target_date: Optional[str] = None) -> Optional[int]:
        """Create a new goal"""
        try:
            data = {
                "name": name,
                "target_amount": int(target_amount * 100),  # Convert to cents
                "description": description,
                "user_id": self.user_id
            }
            
            if target_date:
                data["target_date"] = target_date
            
            response = self.client.table("goals").insert(data).execute()
            
            if response.data:
                return response.data[0]["id"]
            return None
            
        except Exception as e:
            logger.error(f"Error creating goal: {e}")
            return None

    def create_category(self, name: str, color: str = "#4CAF50", icon: str = "help-outline") -> Optional[int]:
        """Create a new category"""
        try:
            data = {
                "name": name,
                "color": color,
                "icon": icon,
                "is_default": False,
                "is_hidden": False,
                "user_id": self.user_id
            }

            response = self.client.table("categories").insert(data).execute()

            if response.data:
                return response.data[0]["id"]
            return None

        except Exception as e:
            logger.error(f"Error creating category: {e}")
            return None

    def find_category_by_name(self, name: str) -> Optional[int]:
        """Find category ID by name (case-insensitive)"""
        try:
            response = (self.client
                       .table("categories")
                       .select("id, name")
                       .or_(f"user_id.eq.{self.user_id},user_id.is.null")
                       .execute())

            for row in response.data:
                if row["name"].lower() == name.lower():
                    return row["id"]
            return None

        except Exception as e:
            logger.error(f"Error finding category: {e}")
            return None
    
    def cleanup(self):
        """Cleanup resources"""
        try:
            # Supabase client doesn't need explicit cleanup
            logger.info("Supabase service cleaned up")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    # ML-related methods
    async def get_user_transactions(self, user_id: str, days_back: int = 90) -> List[Dict]:
        """
        Get user transactions for ML training/prediction
        """
        try:
            from datetime import timedelta
            start_date = (datetime.now() - timedelta(days=days_back)).date()

            response = self.client.table('transactions')\
                .select('*, categories(name)')\
                .eq('user_id', user_id)\
                .eq('transaction_type', 'expense')\
                .gte('date', start_date.isoformat())\
                .execute()

            transactions = []
            for row in response.data:
                transactions.append({
                    'date': row['date'],
                    'amount': row['amount'],  # NT$ values
                    'category': row['categories']['name'] if row.get('categories') else 'Other',
                    'description': row['description'],
                    'type': row['transaction_type']
                })

            return transactions
        except Exception as e:
            logger.error(f"Error fetching user transactions: {e}")
            return []

    async def store_predictions(self, user_id: str, predictions: List[Dict],
                               timeframe: str, confidence: float):
        """
        Store ML predictions in database
        """
        try:
            # Create predictions table if it doesn't exist
            # This would normally be done via migrations

            prediction_data = {
                'user_id': user_id,
                'predictions': predictions,
                'timeframe': timeframe,
                'confidence': confidence,
                'created_at': datetime.now().isoformat()
            }

            # Store in ml_predictions table
            response = self.client.table('ml_predictions')\
                .upsert(prediction_data, on_conflict='user_id,timeframe')\
                .execute()

            logger.info(f"Stored predictions for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing predictions: {e}")
            # If table doesn't exist, create it
            try:
                self._create_ml_tables()
                # Retry the insert
                response = self.client.table('ml_predictions')\
                    .upsert(prediction_data, on_conflict='user_id,timeframe')\
                    .execute()
                return True
            except:
                return False

    async def store_budget(self, user_id: str, budget_data: Dict, month: str):
        """
        Store ML-generated budget recommendations
        """
        try:
            budget_record = {
                'user_id': user_id,
                'month': month,
                'categories': budget_data['categories'],
                'total_budget': budget_data['total'],
                'methodology': budget_data.get('methodology', {}),
                'confidence': budget_data.get('confidence', 0.5),
                'created_at': datetime.now().isoformat()
            }

            response = self.client.table('ml_budgets')\
                .upsert(budget_record, on_conflict='user_id,month')\
                .execute()

            logger.info(f"Stored budget for user {user_id}, month {month}")
            return True
        except Exception as e:
            logger.error(f"Error storing budget: {e}")
            # Try to create table if it doesn't exist
            try:
                self._create_ml_tables()
                response = self.client.table('ml_budgets')\
                    .upsert(budget_record, on_conflict='user_id,month')\
                    .execute()
                return True
            except:
                return False

    async def store_patterns(self, user_id: str, patterns: Dict):
        """
        Store detected spending patterns
        """
        try:
            pattern_record = {
                'user_id': user_id,
                'patterns': patterns,
                'detected_at': datetime.now().isoformat()
            }

            response = self.client.table('ml_patterns')\
                .upsert(pattern_record, on_conflict='user_id')\
                .execute()

            logger.info(f"Stored patterns for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing patterns: {e}")
            # Try to create table if it doesn't exist
            try:
                self._create_ml_tables()
                response = self.client.table('ml_patterns')\
                    .upsert(pattern_record, on_conflict='user_id')\
                    .execute()
                return True
            except:
                return False

    async def store_model_metadata(self, user_id: str, metrics: Dict, timestamp: str):
        """
        Store ML model training metadata
        """
        try:
            metadata_record = {
                'user_id': user_id,
                'metrics': metrics,
                'trained_at': timestamp,
                'model_version': '1.0.0'
            }

            response = self.client.table('ml_model_metadata')\
                .upsert(metadata_record, on_conflict='user_id')\
                .execute()

            logger.info(f"Stored model metadata for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing model metadata: {e}")
            # Try to create table if it doesn't exist
            try:
                self._create_ml_tables()
                response = self.client.table('ml_model_metadata')\
                    .upsert(metadata_record, on_conflict='user_id')\
                    .execute()
                return True
            except:
                return False

    def _create_ml_tables(self):
        """
        Create ML-related tables in Supabase
        Note: This is a fallback. Tables should be created via Supabase dashboard or migrations
        """
        logger.warning("ML tables don't exist. Please create them via Supabase dashboard:")
        logger.warning("""
        CREATE TABLE ml_predictions (
            user_id TEXT,
            timeframe TEXT,
            predictions JSONB,
            confidence FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, timeframe)
        );

        CREATE TABLE ml_budgets (
            user_id TEXT,
            month TEXT,
            categories JSONB,
            total_budget FLOAT,
            methodology JSONB,
            confidence FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, month)
        );

        CREATE TABLE ml_patterns (
            user_id TEXT PRIMARY KEY,
            patterns JSONB,
            detected_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE ml_model_metadata (
            user_id TEXT PRIMARY KEY,
            metrics JSONB,
            trained_at TIMESTAMP,
            model_version TEXT
        );
        """)
        raise Exception("ML tables need to be created in Supabase dashboard")