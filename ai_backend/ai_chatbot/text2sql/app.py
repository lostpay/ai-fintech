"""
Text-to-SQL Service.
Converts natural language queries into structured database operations.
Uses pattern matching to identify query intent and executes safe operations
through Supabase service. Supports spending summaries, budget status,
transaction history, and category-specific queries.
"""
import os
import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from dotenv import load_dotenv
import sys
from pathlib import Path

# Add chatbot directory to path to import supabase service
current_dir = Path(__file__).parent
chatbot_dir = current_dir.parent
sys.path.insert(0, str(chatbot_dir))

from supabase_service import SupabaseService

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MAX_ROWS = int(os.getenv("MAX_SQL_ROWS", "100"))

app = FastAPI(
    title="Text-to-SQL Service",
    description="Converts natural language to SQL for expense data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class SQLRequest(BaseModel):
    query: str
    user_id: str
    lang: str = "zh"

class SQLResponse(BaseModel):
    sql: str
    data: Optional[List[Dict[str, Any]]]
    columns: Optional[List[str]]
    row_count: int
    success: bool
    error: Optional[str] = None

# Supabase service instance
supabase_service: Optional[SupabaseService] = None

def validate_user_id(user_id: str) -> str:
    """
    Validate and sanitize user_id to prevent injection attacks.
    Only allows alphanumeric characters, underscores, and hyphens.

    Args:
        user_id: User identifier string to validate

    Returns:
        Validated user_id string

    Raises:
        ValueError: If user_id contains invalid characters
    """
    # Only allow alphanumeric, underscore, and hyphen
    if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
        raise ValueError("Invalid user_id format")
    return user_id

def process_query_with_supabase(query: str, user_id: str, lang: str = "zh") -> Dict[str, Any]:
    """
    Process natural language query using pattern matching and Supabase.
    Identifies query intent through keyword matching and routes to appropriate
    database operations. Supports multiple languages (Chinese and English).

    Args:
        query: Natural language query string
        user_id: User identifier for data filtering
        lang: Language code ("zh" for Chinese, "en" for English)

    Returns:
        Dictionary with query_type, data, and description
    """
    query_lower = query.lower()
    user_id = validate_user_id(user_id)

    if not supabase_service:
        raise ValueError("Supabase service not initialized")

    # Create user-specific service instance
    service = SupabaseService(user_id=user_id)

    # Pattern matching to identify query intent
    # Checks for keywords in both Chinese and English

    # Pattern 1: Total spending query
    if any(pattern in query_lower for pattern in ["总支出", "总共花", "total spend", "how much.*spent", "总花费"]):
        # Get all-time spending totals with category breakdown
        summary = service.get_spending_summary()
        return {
            "query_type": "total_spending",
            "data": {
                "total_amount": summary["total_amount"],
                "transaction_count": summary["transaction_count"],
                "category_breakdown": summary["category_breakdown"]
            },
            "description": "总支出统计" if lang == "zh" else "Total spending summary"
        }

    # Pattern 2: Current month spending
    elif any(pattern in query_lower for pattern in ["本月", "这个月", "this month", "current month"]):
        # Calculate spending for current calendar month
        from datetime import datetime
        start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        summary = service.get_spending_summary(start_date=start_date)
        return {
            "query_type": "monthly_spending",
            "data": {
                "total_amount": summary["total_amount"],
                "transaction_count": summary["transaction_count"],
                "category_breakdown": summary["category_breakdown"],
                "period": "current_month"
            },
            "description": "本月支出统计" if lang == "zh" else "Current month spending"
        }

    # Pattern 3: Last month spending
    elif any(pattern in query_lower for pattern in ["上个月", "上月", "last month", "previous month"]):
        # Calculate spending for previous calendar month
        from datetime import datetime, timedelta
        last_month = datetime.now() - timedelta(days=30)
        start_date = last_month.replace(day=1).strftime('%Y-%m-%d')
        end_date = (datetime.now().replace(day=1) - timedelta(days=1)).strftime('%Y-%m-%d')
        summary = service.get_spending_summary(start_date=start_date, end_date=end_date)
        return {
            "query_type": "last_month_spending",
            "data": {
                "total_amount": summary["total_amount"],
                "transaction_count": summary["transaction_count"],
                "category_breakdown": summary["category_breakdown"],
                "period": "last_month"
            },
            "description": "上月支出统计" if lang == "zh" else "Last month spending"
        }

    # Pattern 4: Budget status query
    elif any(pattern in query_lower for pattern in ["预算", "budget", "limit", "剩余"]):
        # Get budget limits with current spending and remaining amounts
        budgets = service.get_budgets_with_details()
        budget_data = []
        for budget in budgets:
            budget_data.append({
                "category": budget.category_name,
                "limit": budget.amount,  # NT$ values
                "spent": budget.spent_amount,
                "remaining": budget.remaining_amount,
                "percentage_used": budget.percentage_used,
                "status": "OVER" if budget.remaining_amount < 0 else
                         "WARNING" if budget.percentage_used > 80 else "OK"
            })
        return {
            "query_type": "budget_status",
            "data": budget_data,
            "description": "预算状态" if lang == "zh" else "Budget status"
        }

    # Pattern 5: Recent transactions
    elif any(pattern in query_lower for pattern in ["最近", "recent", "latest", "最新", "交易记录"]):
        # Fetch most recent 20 transactions with category details
        transactions = service.get_transactions_with_categories(limit=20)
        transaction_data = []
        for txn in transactions:
            transaction_data.append({
                "date": txn.date.strftime('%Y-%m-%d'),
                "amount": txn.amount,  # NT$ values
                "category": txn.category_name,
                "description": txn.description,
                "type": txn.transaction_type
            })
        return {
            "query_type": "recent_transactions",
            "data": transaction_data,
            "description": "最近交易记录" if lang == "zh" else "Recent transactions"
        }

    # Pattern 6: Category-specific spending
    elif any(pattern in query_lower for pattern in ["类别", "category", "分类", "餐饮", "交通", "购物", "娱乐"]):
        # Query spending for specific categories
        transactions = service.get_transactions_with_categories(limit=1000)

        # Map Chinese/English keywords to category names
        target_category = None
        category_map = {
            "餐饮": ["餐饮", "dining", "food", "restaurant"],
            "交通": ["交通", "transport", "travel", "gas"],
            "购物": ["购物", "shopping", "retail"],
            "娱乐": ["娱乐", "entertainment", "fun"],
            "医疗": ["医疗", "healthcare", "medical"],
            "教育": ["教育", "education", "learning"]
        }

        # Find which category the query is asking about
        for category, keywords in category_map.items():
            if any(keyword in query_lower for keyword in keywords):
                target_category = category
                break

        # Filter transactions to target category if found
        if target_category:
            category_transactions = [
                txn for txn in transactions
                if target_category in txn.category_name or any(
                    keyword in txn.category_name.lower()
                    for keyword in category_map[target_category]
                )
            ]
        else:
            category_transactions = transactions

        # Aggregate spending by category
        category_summary = {}
        for txn in category_transactions:
            if txn.transaction_type == "expense":
                cat_name = txn.category_name
                if cat_name not in category_summary:
                    category_summary[cat_name] = {"amount": 0, "count": 0}
                category_summary[cat_name]["amount"] += txn.amount
                category_summary[cat_name]["count"] += 1

        return {
            "query_type": "category_spending",
            "data": category_summary,
            "description": f"{target_category}支出统计" if target_category and lang == "zh"
                          else "Category spending breakdown"
        }

    # Default case: no pattern matched
    else:
        # Return recent transactions as fallback
        transactions = service.get_transactions_with_categories(limit=10)
        transaction_data = []
        for txn in transactions:
            transaction_data.append({
                "date": txn.date.strftime('%Y-%m-%d'),
                "amount": txn.amount,
                "category": txn.category_name,
                "description": txn.description,
                "type": txn.transaction_type
            })
        return {
            "query_type": "general",
            "data": transaction_data,
            "description": "交易记录" if lang == "zh" else "Transaction records"
        }

@app.on_event("startup")
async def startup_event():
    """
    Initialize Supabase service on application startup.
    Tests database connection and sets global service instance.
    Raises exception if connection fails to prevent serving requests.
    """
    global supabase_service
    try:
        # Test Supabase connection before accepting requests
        # Use a test user ID for health check
        test_service = SupabaseService(user_id="health-check-user")
        health = test_service.get_database_health()
        if health["status"] == "healthy":
            supabase_service = test_service
            logger.info("Supabase service initialized successfully")
        else:
            logger.error(f"Supabase health check failed: {health}")
            raise Exception("Supabase connection failed")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase service: {e}")
        raise

@app.get("/health")
async def health_check():
    """
    Health check endpoint for service monitoring.
    Returns service status and database health information.
    """
    try:
        # Create a temporary service for health check
        test_service = SupabaseService(user_id="health-check-user")
        health = test_service.get_database_health()
        return {
            "status": health["status"],
            "service": "text2sql",
            "database": health
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "text2sql",
            "error": str(e)
        }

@app.post("/generate", response_model=SQLResponse)
async def generate_sql(request: SQLRequest):
    """
    Main endpoint for natural language query processing.
    Converts query to structured database operations and returns formatted results.

    Args:
        request: SQLRequest with query, user_id, and language

    Returns:
        SQLResponse with data, columns, and metadata
    """
    try:
        logger.info(f"Processing query: {request.query} for user: {request.user_id}")

        if not supabase_service:
            raise HTTPException(status_code=503, detail="Supabase service not initialized")

        # Process query using pattern matching and Supabase operations
        result = process_query_with_supabase(request.query, request.user_id, request.lang)

        logger.info(f"Query processed successfully: {result['query_type']}")

        # Convert result data to table format for frontend display
        data = result["data"]
        if isinstance(data, dict):
            # Handle category breakdown format
            if "category_breakdown" in data:
                # Convert category breakdown dict to list of records
                table_data = [
                    {"category": cat, "amount": amount}
                    for cat, amount in data["category_breakdown"].items()
                ]
                # Add total row at the top
                if "total_amount" in data:
                    table_data.insert(0, {
                        "category": "TOTAL",
                        "amount": data["total_amount"],
                        "count": data.get("transaction_count", 0)
                    })
                data = table_data
            elif isinstance(data, dict) and not isinstance(data, list):
                # Convert single dict to list for consistency
                data = [data]

        # Extract column names from first record
        columns = []
        if data and len(data) > 0:
            columns = list(data[0].keys())

        return SQLResponse(
            sql=f"Supabase query: {result['query_type']}",
            data=data,
            columns=columns,
            row_count=len(data) if isinstance(data, list) else 1,
            success=True
        )

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return SQLResponse(
            sql="Error",
            data=None,
            columns=None,
            row_count=0,
            success=False,
            error=str(e)
        )

@app.get("/test/{user_id}")
async def test_user_data(user_id: str):
    """
    Test endpoint to verify user data availability.
    Returns counts and sample transactions for debugging.

    Args:
        user_id: User identifier to test

    Returns:
        Dictionary with transaction, budget, and category counts
    """
    try:
        if not supabase_service:
            raise HTTPException(status_code=503, detail="Supabase service not initialized")

        # Initialize service with user_id
        service = SupabaseService(user_id=user_id)

        # Get basic stats
        transactions = service.get_transactions_with_categories(limit=5)
        budgets = service.get_budgets_with_details()
        categories = service.get_categories()

        return {
            "user_id": user_id,
            "transaction_count": len(transactions),
            "budget_count": len(budgets),
            "category_count": len(categories),
            "recent_transactions": [
                {
                    "date": txn.date.strftime('%Y-%m-%d'),
                    "amount": txn.amount,
                    "category": txn.category_name,
                    "description": txn.description
                }
                for txn in transactions[:3]
            ]
        }

    except Exception as e:
        logger.error(f"Error testing user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7001, reload=True)