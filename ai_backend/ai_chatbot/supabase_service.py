"""
Supabase Database Service for AI Backend
Replaces SQLite with cloud-based Supabase database
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

# Default user ID for single-user mode (before authentication)
DEFAULT_USER_ID = "default-user"

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
    Service for interacting with Supabase database
    Provides the same interface as the original SQLite database service
    """
    
    def __init__(self, user_id: str = DEFAULT_USER_ID):
        """Initialize Supabase connection"""
        self.user_id = user_id
        self.client: Optional[Client] = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Supabase"""
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
        """Get transactions with category names"""
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
        """Get budgets with category names and calculated spending details"""
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
                
                spent_amount = sum(t["amount"] for t in spent_response.data) / 100.0  # Convert cents to dollars
                budget.spent_amount = spent_amount
                budget.remaining_amount = (budget.amount / 100.0) - spent_amount
                budget.percentage_used = (spent_amount / (budget.amount / 100.0)) * 100 if budget.amount > 0 else 0
                
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
                amount = row["amount"] / 100.0  # Convert cents to dollars
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
    
    def cleanup(self):
        """Cleanup resources"""
        try:
            # Supabase client doesn't need explicit cleanup
            logger.info("Supabase service cleaned up")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")