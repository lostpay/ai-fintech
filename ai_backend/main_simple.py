"""
FastAPI Backend for Financial AI Assistant
Simplified version to fix import issues
"""
import os
import sys
from pathlib import Path
import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add current directory to Python path for local imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Add AI PoC to Python path (now in same directory after move)
ai_poc_path = current_dir / "ai_poc" if (current_dir / "ai_poc").exists() else current_dir.parent / "ai_poc"
sys.path.insert(0, str(ai_poc_path))

logger.info(f"Current directory: {current_dir}")
logger.info(f"AI PoC path: {ai_poc_path}")
logger.info(f"AI PoC exists: {ai_poc_path.exists()}")

# Test imports
try:
    # Test AI PoC imports
    from services.ai_service import AIService
    from models.data_types import QueryType, ProcessingType, AIResponse
    logger.info("✅ AI PoC imports successful")
    
    # Test backend imports
    from api.models import AIQueryRequest, AIQueryResponse, APIHealthResponse
    logger.info("✅ Backend model imports successful")
    
except ImportError as e:
    logger.error(f"❌ Import failed: {e}")
    logger.info("Available paths:")
    for p in sys.path:
        logger.info(f"  - {p}")
    raise

# Create FastAPI app
app = FastAPI(
    title="Financial AI Assistant Backend",
    description="Backend API for the Financial AI Assistant mobile application",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global AI service
ai_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize AI service on startup"""
    global ai_service
    
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        logger.error("HUGGINGFACE_API_KEY not found in environment variables")
        raise ValueError("HUGGINGFACE_API_KEY is required")
    
    try:
        ai_service = AIService(api_key)
        logger.info("AI Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Service: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Financial AI Assistant Backend is running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "message": "AI Backend is running"}

@app.get("/api/ping")
async def ping():
    """Simple connectivity test"""
    return {"message": "pong", "status": "ok"}

@app.post("/api/ai/query")
async def process_query(request: dict):
    """Process AI query"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        query = request.get("query", "")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Process using AI service (which now uses real database data!)
        response = await ai_service.process_query(query)
        
        # The AI service already provides enhanced responses with real data
        enhanced_message = response.message
        
        # Get real financial data for embedded components
        db_health = ai_service.get_database_health()
        embedded_data = None
        
        if response.embedded_data:
            embedded_data = {
                "component_type": response.embedded_data.component_type,
                "title": response.embedded_data.title,
                "data": response.embedded_data.data,
                "size": response.embedded_data.size
            }
        elif "budget" in query.lower():
            # Get real budget data for budget queries
            try:
                budgets = ai_service.database.get_budgets_with_details()
                if budgets:
                    budget = budgets[0]  # Show first budget
                    embedded_data = {
                        "component_type": "BudgetCard",
                        "title": f"{budget.category_name} Budget",
                        "data": {
                            "category": budget.category_name,
                            "budgeted": budget.amount,
                            "spent": budget.spent_amount,
                            "remaining": budget.remaining_amount,
                            "percentage": budget.percentage_used
                        },
                        "size": "compact"
                    }
            except Exception as e:
                logger.warning(f"Failed to get real budget data: {e}")
        
        return {
            "message": enhanced_message,
            "confidence": response.confidence,
            "query_type": response.query_type.value,
            "processing_type": response.processing_type.value,
            "suggested_actions": response.suggested_actions or [],
            "embedded_data": embedded_data,
            "database_status": db_health.get("status", "unknown")
        }
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return {
            "message": f"I apologize, but I encountered an issue processing your question. Please try again.",
            "confidence": 0.0,
            "query_type": "unknown",
            "processing_type": "on_device",
            "suggested_actions": ["Try asking about your spending", "Ask about budget status"]
        }

if __name__ == "__main__":
    # Get configuration
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Run the application
    uvicorn.run(
        "main_simple:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )