"""
AI Assistant API Routes
Handles AI query processing and conversation management
"""
import logging
from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse

from ..models import (
    AIQueryRequest, AIQueryResponse, ConversationHistoryResponse,
    SessionClearRequest, SystemTestResponse, ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/ai/query", response_model=AIQueryResponse)
async def process_ai_query(request: AIQueryRequest, req: Request):
    """
    Process a natural language financial query using AI
    """
    try:
        # Get AI service from application state
        ai_service = req.app.state.ai_service()
        
        start_time = datetime.now()
        
        # Process the query using the AI service
        response = await ai_service.process_query(
            query=request.query,
            session_id=request.session_id,
            context=request.context,
            user_id=request.user_id
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        response.processing_time_ms = processing_time
        
        logger.info(f"Processed query: '{request.query}' -> {response.query_type.value} ({processing_time:.2f}ms)")
        
        return response
        
    except ValueError as e:
        logger.error(f"Invalid query request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing AI query: {e}")
        raise HTTPException(status_code=500, detail="Failed to process query")

@router.get("/ai/conversation/{session_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(session_id: str, req: Request):
    """
    Get conversation history for a specific session
    """
    try:
        ai_service = req.app.state.ai_service()
        
        history_data = ai_service.get_conversation_history(session_id)
        
        return ConversationHistoryResponse(
            session_id=session_id,
            exchanges=history_data["exchanges"],
            total_exchanges=len(history_data["exchanges"]),
            session_start=history_data.get("session_start", datetime.now())
        )
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation history")

@router.delete("/ai/conversation/{session_id}")
async def clear_conversation_history(session_id: str, req: Request):
    """
    Clear conversation history for a specific session
    """
    try:
        ai_service = req.app.state.ai_service()
        
        cleared_count = ai_service.clear_conversation_history(session_id)
        
        return JSONResponse(
            content={
                "message": f"Cleared {cleared_count} conversation exchanges",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear conversation history")

@router.post("/ai/conversation/clear")
async def clear_all_conversations(request: SessionClearRequest, req: Request):
    """
    Clear conversation history for all sessions or a specific session
    """
    try:
        ai_service = req.app.state.ai_service()
        
        if request.session_id:
            cleared_count = ai_service.clear_conversation_history(request.session_id)
            message = f"Cleared {cleared_count} exchanges for session {request.session_id}"
        else:
            cleared_count = ai_service.clear_all_conversations()
            message = f"Cleared {cleared_count} total conversation exchanges"
        
        return JSONResponse(
            content={
                "message": message,
                "cleared_count": cleared_count,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error clearing conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear conversations")

@router.get("/ai/system/test", response_model=SystemTestResponse)
async def run_system_test(req: Request, background_tasks: BackgroundTasks):
    """
    Run comprehensive system tests on AI components
    """
    try:
        ai_service = req.app.state.ai_service()
        
        # Run system tests
        test_results = ai_service.test_system()
        
        return SystemTestResponse(
            overall_status=test_results["overall_status"],
            database_status=test_results["database"],
            huggingface_status=test_results["huggingface"],
            query_processor_status=test_results["query_processor"],
            details=test_results.get("details", {})
        )
        
    except Exception as e:
        logger.error(f"Error running system test: {e}")
        raise HTTPException(status_code=500, detail="System test failed")

@router.get("/ai/models/status")
async def get_models_status(req: Request):
    """
    Get status of AI models
    """
    try:
        ai_service = req.app.state.ai_service()
        
        models_status = ai_service.get_models_status()
        
        return JSONResponse(content=models_status)
        
    except Exception as e:
        logger.error(f"Error getting models status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get models status")

@router.post("/ai/models/reload")
async def reload_models(req: Request, background_tasks: BackgroundTasks):
    """
    Reload AI models (background task)
    """
    try:
        ai_service = req.app.state.ai_service()
        
        # Add model reload as background task
        background_tasks.add_task(ai_service.reload_models)
        
        return JSONResponse(
            content={
                "message": "Model reload initiated",
                "timestamp": datetime.now().isoformat(),
                "status": "background_task_started"
            }
        )
        
    except Exception as e:
        logger.error(f"Error initiating model reload: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate model reload")

@router.get("/ai/session/{session_id}/suggestions")
async def get_query_suggestions(session_id: str, req: Request):
    """
    Get smart query suggestions based on conversation context
    """
    try:
        ai_service = req.app.state.ai_service()
        
        suggestions = ai_service.get_smart_suggestions(session_id)
        
        return JSONResponse(content={
            "session_id": session_id,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting query suggestions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get suggestions")