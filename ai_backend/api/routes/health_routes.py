"""
Health Check API Routes
Provides health and status endpoints for monitoring
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..models import APIHealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health", response_model=APIHealthResponse)
async def health_check(req: Request):
    """
    Basic health check endpoint
    """
    try:
        # Test AI service availability
        ai_service = req.app.state.ai_service()
        ai_status = "healthy" if ai_service else "unhealthy"
        
        components = {
            "ai_service": ai_status,
            "api": "healthy"
        }
        
        overall_status = "healthy" if ai_status == "healthy" else "degraded"
        
        return APIHealthResponse(
            status=overall_status,
            message="Financial AI Assistant Backend",
            version="1.0.0",
            components=components
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return APIHealthResponse(
            status="unhealthy",
            message=f"Health check failed: {str(e)}",
            version="1.0.0",
            components={"api": "unhealthy"}
        )

@router.get("/health/detailed", response_model=APIHealthResponse)
async def detailed_health_check(req: Request):
    """
    Detailed health check with component testing
    """
    try:
        ai_service = req.app.state.ai_service()
        
        # Test AI service components
        test_results = ai_service.test_system()
        
        components = {
            "ai_service": "healthy" if test_results["overall_status"] == "working" else "degraded",
            "database": "healthy" if test_results["database"] else "unhealthy",
            "huggingface": "healthy" if any(test_results["huggingface"].values()) else "degraded",
            "query_processor": "healthy" if test_results["query_processor"] else "unhealthy",
            "api": "healthy"
        }
        
        # Determine overall status
        unhealthy_count = sum(1 for status in components.values() if status == "unhealthy")
        degraded_count = sum(1 for status in components.values() if status == "degraded")
        
        if unhealthy_count > 0:
            overall_status = "unhealthy"
        elif degraded_count > 0:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        return APIHealthResponse(
            status=overall_status,
            message=f"Detailed health check - {overall_status}",
            version="1.0.0",
            components=components
        )
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return APIHealthResponse(
            status="unhealthy",
            message=f"Health check failed: {str(e)}",
            version="1.0.0",
            components={"api": "unhealthy"}
        )

@router.get("/ping")
async def ping():
    """
    Simple ping endpoint for basic connectivity testing
    """
    return JSONResponse(content={
        "message": "pong",
        "timestamp": datetime.now().isoformat(),
        "status": "ok"
    })

@router.get("/version")
async def get_version():
    """
    Get API version information
    """
    return JSONResponse(content={
        "name": "Financial AI Assistant Backend",
        "version": "1.0.0",
        "description": "Backend API for the Financial AI Assistant mobile application",
        "timestamp": datetime.now().isoformat()
    })