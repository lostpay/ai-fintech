"""
FastAPI Backend for Financial AI Assistant
Integrates the AI proof of concept with the React Native frontend
"""
import os
import sys
from pathlib import Path
from typing import Dict, Any
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Setup logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add AI PoC modules to Python path
ai_poc_path = Path(__file__).parent.parent / "ai_poc"
sys.path.insert(0, str(ai_poc_path))

# Verify the path exists
if not ai_poc_path.exists():
    raise FileNotFoundError(f"AI PoC directory not found at: {ai_poc_path}")

logger.info(f"Added AI PoC path to sys.path: {ai_poc_path}")

# Import backend modules using relative imports
try:
    from api.routes import ai_routes, health_routes, database_routes
    from api.models import APIHealthResponse
    from services.ai_service_wrapper import AIServiceWrapper
except ImportError as e:
    logger.error(f"Failed to import backend modules: {e}")
    # Try absolute imports with current directory in path
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    from api.routes import ai_routes, health_routes, database_routes
    from api.models import APIHealthResponse  
    from services.ai_service_wrapper import AIServiceWrapper

# Global AI service instance
ai_service: AIServiceWrapper = None

# Global AI service instance
ai_service: AIServiceWrapper = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    load_dotenv()
    
    global ai_service
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        logger.error("HUGGINGFACE_API_KEY not found in environment variables")
        raise ValueError("HUGGINGFACE_API_KEY is required")
    
    try:
        ai_service = AIServiceWrapper(api_key)
        logger.info("AI Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Backend")

# Create FastAPI application
app = FastAPI(
    title="Financial AI Assistant Backend",
    description="Backend API for the Financial AI Assistant mobile application",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(health_routes.router, prefix="/api", tags=["Health"])
app.include_router(ai_routes.router, prefix="/api", tags=["AI Assistant"])
app.include_router(database_routes.router, prefix="/api", tags=["Database"])

@app.get("/", response_model=APIHealthResponse)
async def root():
    """Root endpoint"""
    return APIHealthResponse(
        status="healthy",
        message="Financial AI Assistant Backend is running",
        version="1.0.0",
        timestamp=None
    )

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    logger.error(f"ValueError: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

def get_ai_service() -> AIServiceWrapper:
    """Get the global AI service instance"""
    if ai_service is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return ai_service

# Make AI service available to routes
app.state.ai_service = get_ai_service

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Get configuration from environment
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )