"""
Database API Routes
Provides access to financial data and statistics
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse

from ..models import DatabaseStatsResponse, DatabaseQueryRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats(req: Request):
    """
    Get database statistics and overview
    """
    try:
        ai_service = req.app.state.ai_service()
        
        stats = ai_service.get_database_stats()
        
        return DatabaseStatsResponse(
            total_transactions=stats["total_transactions"],
            total_categories=stats["total_categories"],
            total_budgets=stats["total_budgets"],
            date_range=stats["date_range"],
            last_transaction_date=stats.get("last_transaction_date")
        )
        
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database statistics")

@router.get("/database/transactions")
async def get_transactions(
    req: Request,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    category: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    """
    Get transactions with optional filtering
    """
    try:
        ai_service = req.app.state.ai_service()
        
        transactions = ai_service.get_transactions(
            limit=limit,
            offset=offset,
            category=category,
            start_date=start_date,
            end_date=end_date
        )
        
        return JSONResponse(content={
            "transactions": transactions,
            "limit": limit,
            "offset": offset,
            "filters": {
                "category": category,
                "start_date": start_date,
                "end_date": end_date
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve transactions")

@router.get("/database/budgets")
async def get_budgets(req: Request):
    """
    Get budget information with current status
    """
    try:
        ai_service = req.app.state.ai_service()
        
        budgets = ai_service.get_budgets()
        
        return JSONResponse(content={
            "budgets": budgets,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting budgets: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve budgets")

@router.get("/database/categories")
async def get_categories(req: Request):
    """
    Get category information and spending breakdown
    """
    try:
        ai_service = req.app.state.ai_service()
        
        categories = ai_service.get_categories()
        
        return JSONResponse(content={
            "categories": categories,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve categories")

@router.get("/database/spending-summary")
async def get_spending_summary(
    req: Request,
    start_date: str = Query(None),
    end_date: str = Query(None),
    category: str = Query(None)
):
    """
    Get spending summary with optional time range and category filter
    """
    try:
        ai_service = req.app.state.ai_service()
        
        summary = ai_service.get_spending_summary(
            start_date=start_date,
            end_date=end_date,
            category=category
        )
        
        return JSONResponse(content={
            "summary": summary,
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "category": category
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting spending summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve spending summary")

@router.post("/database/query")
async def execute_database_query(request: DatabaseQueryRequest, req: Request):
    """
    Execute custom database queries (for advanced use cases)
    """
    try:
        ai_service = req.app.state.ai_service()
        
        result = ai_service.execute_database_query(
            query_type=request.query_type,
            parameters=request.parameters,
            limit=request.limit,
            offset=request.offset
        )
        
        return JSONResponse(content={
            "result": result,
            "query_type": request.query_type,
            "parameters": request.parameters,
            "timestamp": datetime.now().isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Invalid database query: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing database query: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")