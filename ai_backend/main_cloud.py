"""
FastAPI Backend for Financial AI Assistant
Cloud-native version using Supabase database only
"""
import os
import sys
from pathlib import Path
import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
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

try:
    # Import our cloud AI service and API models
    from services.ai_service_cloud import CloudAIService
    from api.models import AIQueryRequest, APIHealthResponse
    logger.info("✅ Cloud AI service imports successful")
    
except ImportError as e:
    logger.error(f"❌ Import failed: {e}")
    logger.info("Available paths:")
    for p in sys.path:
        logger.info(f"  - {p}")
    raise

# Global AI service
ai_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    global ai_service
    
    # Check for required environment variables
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not api_key:
        logger.error("HUGGINGFACE_API_KEY not found in environment variables")
        raise ValueError("HUGGINGFACE_API_KEY is required")
    
    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not found in environment variables")
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
    
    try:
        ai_service = CloudAIService(api_key)
        logger.info("🚀 Cloud AI Service initialized successfully")
        
        # Test database connection
        health = ai_service.get_database_health()
        logger.info(f"📊 Database health: {health['status']}")
        
    except Exception as e:
        logger.error(f"Failed to initialize Cloud AI Service: {e}")
        raise
    
    yield
    
    # Shutdown
    if ai_service:
        ai_service.cleanup()
    logger.info("🛑 Cloud AI Backend shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Financial AI Assistant Backend - Cloud",
    description="Cloud-native backend API using Supabase database",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=APIHealthResponse)
async def root():
    """Root endpoint"""
    return APIHealthResponse(
        status="healthy",
        message="Financial AI Assistant Cloud Backend is running",
        version="1.0.0"
    )

@app.get("/api/health")
async def health_check():
    """Comprehensive health check"""
    if not ai_service:
        return {"status": "unhealthy", "message": "AI service not initialized"}
    
    try:
        db_health = ai_service.get_database_health()
        system_status = ai_service.test_system()
        
        return {
            "status": "healthy",
            "message": "Cloud AI Backend is running",
            "database": db_health,
            "ai_system": system_status,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}

@app.get("/api/ping")
async def ping():
    """Simple connectivity test"""
    return {"message": "pong", "status": "ok", "backend": "cloud"}

@app.post("/api/ai/query")
async def process_query(request: dict):
    """Process AI query using cloud database"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        query = request.get("query", "")
        session_id = request.get("session_id")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        logger.info(f"🤖 Processing query: {query}")
        
        # Process using cloud AI service
        response = await ai_service.process_query(query)
        
        # Prepare embedded data
        embedded_data = None
        if response.embedded_data:
            embedded_data = {
                "component_type": response.embedded_data.component_type,
                "title": response.embedded_data.title,
                "data": response.embedded_data.data,
                "size": response.embedded_data.size
            }
        
        # Get database status for debugging
        db_health = ai_service.get_database_health()
        
        result = {
            "message": response.message,
            "confidence": response.confidence,
            "query_type": response.query_type.value,
            "processing_type": response.processing_type.value,
            "suggested_actions": response.suggested_actions or [],
            "embedded_data": embedded_data,
            "database_status": db_health.get("status", "unknown"),
            "session_id": session_id
        }
        
        logger.info(f"✅ Query processed successfully: {response.query_type.value}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error processing query: {e}")
        return {
            "message": f"I apologize, but I encountered an issue processing your question. Please try again.",
            "confidence": 0.0,
            "query_type": "unknown",
            "processing_type": "on_device",
            "suggested_actions": ["Try asking about your spending", "Ask about budget status"],
            "error": str(e)  # Include error for debugging
        }

@app.get("/api/database/stats")
async def get_database_stats():
    """Get database statistics"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        transactions = ai_service.database.get_transactions_with_categories(limit=1000)
        budgets = ai_service.database.get_budgets_with_details()
        categories = ai_service.database.get_categories()
        
        return {
            "total_transactions": len(transactions),
            "total_budgets": len(budgets),
            "total_categories": len(categories),
            "database_type": "supabase",
            "user_id": ai_service.user_id
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{session_id}/history")
async def get_conversation_history(session_id: str):
    """Get conversation history"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        history = ai_service.get_conversation_history()
        return {
            "session_id": session_id,
            "exchanges": [
                {
                    "query": exchange["query"],
                    "response": exchange["response"].message,
                    "timestamp": exchange["timestamp"].isoformat(),
                    "confidence": exchange["response"].confidence
                }
                for exchange in history
            ]
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations/{session_id}/history")
async def clear_conversation_history(session_id: str):
    """Clear conversation history"""
    if not ai_service:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    try:
        ai_service.clear_conversation_history()
        return {"message": f"Conversation history cleared for session {session_id}"}
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Get configuration
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"🚀 Starting Cloud AI Backend on {host}:{port}")
    
    # Run the application
    uvicorn.run(
        "main_cloud:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )