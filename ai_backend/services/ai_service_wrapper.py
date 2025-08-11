"""
AI Service Wrapper
Wraps the existing AI PoC service for use with FastAPI
"""
import logging
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

# Add AI PoC modules to Python path (updated for new structure)
ai_poc_path = Path(__file__).parent.parent / "ai_poc" if (Path(__file__).parent.parent / "ai_poc").exists() else Path(__file__).parent.parent.parent / "ai_poc"
sys.path.insert(0, str(ai_poc_path))

# Also add the current backend path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

logger = logging.getLogger(__name__)

# Verify paths exist
if not ai_poc_path.exists():
    logger.error(f"AI PoC directory not found at: {ai_poc_path}")
else:
    logger.info(f"AI PoC path: {ai_poc_path}")
    logger.info(f"Backend path: {backend_path}")

try:
    # Import AI PoC components
    from services.ai_service import AIService
    from models.data_types import QueryType as AIQueryType, ProcessingType as AIProcessingType
except ImportError as e:
    logger.error(f"Failed to import AI PoC modules from {ai_poc_path}: {e}")
    raise ImportError(f"Cannot find AI PoC modules. Please ensure {ai_poc_path} exists and contains the required files.")

# Import API models
from ..api.models import (
    AIQueryResponse, AIQueryContext, EmbeddedComponentData,
    QueryType, ProcessingType, ComponentType
)

logger = logging.getLogger(__name__)

class AIServiceWrapper:
    """
    Wrapper class that adapts the AI PoC service for FastAPI use
    """
    
    def __init__(self, api_key: str):
        """Initialize the AI service wrapper"""
        try:
            self.ai_service = AIService(api_key)
            self.session_contexts = {}  # Store session contexts
            self.api_key = api_key
            logger.info("AI Service Wrapper initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI Service: {e}")
            raise
    
    async def process_query(
        self, 
        query: str, 
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> AIQueryResponse:
        """
        Process a financial query and return API-compatible response
        """
        try:
            logger.info(f"Processing query for session {session_id}: {query}")
            
            # Create or get session context
            if session_id:
                session_context = self._get_or_create_session_context(session_id)
            else:
                session_context = None
            
            # Process query using AI PoC service
            ai_response = await self.ai_service.process_query(query, session_context)
            
            # Convert AI PoC response to API response format
            api_response = AIQueryResponse(
                message=ai_response.message,
                confidence=ai_response.confidence,
                query_type=self._convert_query_type(ai_response.query_type),
                processing_type=self._convert_processing_type(ai_response.processing_type),
                embedded_data=self._convert_embedded_data(ai_response.embedded_data),
                suggested_actions=ai_response.suggested_actions or [],
                conversation_context=self._convert_context(ai_response.conversation_context),
                model_used=ai_response.model_used
            )
            
            # Update session context if available
            if session_id and ai_response.conversation_context:
                self.session_contexts[session_id] = ai_response.conversation_context
            
            return api_response
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            # Return fallback response
            return AIQueryResponse(
                message=f"I apologize, but I encountered an issue processing your question: '{query}'. Please try rephrasing your question or contact support.",
                confidence=0.0,
                query_type=QueryType.UNKNOWN,
                processing_type=ProcessingType.ON_DEVICE,
                suggested_actions=["Try asking about your spending", "Ask about budget status", "Search for transactions"]
            )
    
    def get_conversation_history(self, session_id: str) -> Dict[str, Any]:
        """Get conversation history for a session"""
        try:
            history = self.ai_service.get_conversation_history()
            
            # Filter by session if we have session tracking
            session_history = [
                {
                    "query": exchange["query"],
                    "response": {
                        "message": exchange["response"].message,
                        "confidence": exchange["response"].confidence,
                        "query_type": exchange["response"].query_type.value,
                        "processing_type": exchange["response"].processing_type.value
                    },
                    "timestamp": exchange["timestamp"].isoformat()
                }
                for exchange in history
            ]
            
            return {
                "exchanges": session_history,
                "session_start": datetime.now()  # Placeholder - could track actual session start
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return {"exchanges": [], "session_start": datetime.now()}
    
    def clear_conversation_history(self, session_id: str) -> int:
        """Clear conversation history for a session"""
        try:
            # For now, clear all history (could be improved to track by session)
            history_count = len(self.ai_service.get_conversation_history())
            self.ai_service.clear_conversation_history()
            
            # Clear session context
            if session_id in self.session_contexts:
                del self.session_contexts[session_id]
            
            return history_count
            
        except Exception as e:
            logger.error(f"Error clearing conversation history: {e}")
            return 0
    
    def clear_all_conversations(self) -> int:
        """Clear all conversation history"""
        try:
            history_count = len(self.ai_service.get_conversation_history())
            self.ai_service.clear_conversation_history()
            self.session_contexts.clear()
            return history_count
            
        except Exception as e:
            logger.error(f"Error clearing all conversations: {e}")
            return 0
    
    def test_system(self) -> Dict[str, Any]:
        """Run system tests and return results"""
        try:
            return self.ai_service.test_system()
        except Exception as e:
            logger.error(f"System test failed: {e}")
            return {
                "overall_status": "failed",
                "database": False,
                "huggingface": {},
                "query_processor": False,
                "details": {"error": str(e)}
            }
    
    def get_models_status(self) -> Dict[str, Any]:
        """Get status of AI models"""
        try:
            test_results = self.ai_service.test_system()
            return {
                "huggingface_models": test_results.get("huggingface", {}),
                "overall_status": test_results.get("overall_status", "unknown"),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting models status: {e}")
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    def reload_models(self):
        """Reload AI models (background task)"""
        try:
            # Reinitialize the AI service
            self.ai_service = AIService(self.api_key)
            logger.info("AI models reloaded successfully")
        except Exception as e:
            logger.error(f"Error reloading models: {e}")
            raise
    
    def get_smart_suggestions(self, session_id: str) -> List[str]:
        """Get smart query suggestions based on context"""
        try:
            # Basic suggestions - could be enhanced with context awareness
            return [
                "How much did I spend this month?",
                "What's my budget status?",
                "Show me recent transactions",
                "Which category did I spend the most on?",
                "How much money do I have left?",
                "Show me my spending trends"
            ]
        except Exception as e:
            logger.error(f"Error getting suggestions: {e}")
            return []
    
    # Database access methods
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            db_service = self.ai_service.database
            
            transactions = db_service.get_transactions_with_categories()
            budgets = db_service.get_budgets_with_details()
            categories = set(t.category_name for t in transactions)
            
            date_range = {
                "earliest": min(t.date.isoformat() for t in transactions) if transactions else None,
                "latest": max(t.date.isoformat() for t in transactions) if transactions else None
            }
            
            return {
                "total_transactions": len(transactions),
                "total_categories": len(categories),
                "total_budgets": len(budgets),
                "date_range": date_range,
                "last_transaction_date": max(t.date for t in transactions) if transactions else None
            }
            
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {
                "total_transactions": 0,
                "total_categories": 0,
                "total_budgets": 0,
                "date_range": {"earliest": None, "latest": None}
            }
    
    def get_transactions(
        self, 
        limit: int = 50, 
        offset: int = 0,
        category: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get transactions with filtering"""
        try:
            db_service = self.ai_service.database
            transactions = db_service.get_transactions_with_categories(limit=limit + offset)
            
            # Apply offset
            transactions = transactions[offset:]
            
            # Convert to dict format
            result = []
            for t in transactions:
                result.append({
                    "id": t.id,
                    "amount": float(t.amount),
                    "description": t.description,
                    "category_name": t.category_name,
                    "date": t.date.isoformat(),
                    "created_at": t.created_at.isoformat() if hasattr(t, 'created_at') else None
                })
            
            return result[:limit]
            
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            return []
    
    def get_budgets(self) -> List[Dict[str, Any]]:
        """Get budget information"""
        try:
            db_service = self.ai_service.database
            budgets = db_service.get_budgets_with_details()
            
            result = []
            for b in budgets:
                result.append({
                    "id": getattr(b, 'id', None),
                    "category_name": b.category_name,
                    "amount": float(b.amount),
                    "spent_amount": float(b.spent_amount),
                    "remaining_amount": float(b.remaining_amount),
                    "percentage_used": float(b.percentage_used)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting budgets: {e}")
            return []
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get categories with spending information"""
        try:
            db_service = self.ai_service.database
            summary = db_service.get_spending_summary()
            
            result = []
            for category, amount in summary["category_breakdown"].items():
                result.append({
                    "name": category,
                    "total_spent": float(amount),
                    "transaction_count": summary.get("transaction_count", 0)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return []
    
    def get_spending_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get spending summary with optional filters"""
        try:
            db_service = self.ai_service.database
            summary = db_service.get_spending_summary()
            
            return {
                "total_amount": float(summary["total_amount"]),
                "transaction_count": summary["transaction_count"],
                "category_breakdown": {k: float(v) for k, v in summary["category_breakdown"].items()},
                "timeframe": "all_time"  # Could be enhanced with actual date filtering
            }
            
        except Exception as e:
            logger.error(f"Error getting spending summary: {e}")
            return {"total_amount": 0.0, "transaction_count": 0, "category_breakdown": {}}
    
    def execute_database_query(
        self,
        query_type: str,
        parameters: Dict[str, Any],
        limit: int = 100,
        offset: int = 0
    ) -> Any:
        """Execute custom database queries"""
        try:
            # Implement specific query types as needed
            if query_type == "transactions":
                return self.get_transactions(limit, offset)
            elif query_type == "budgets":
                return self.get_budgets()
            elif query_type == "categories":
                return self.get_categories()
            elif query_type == "spending_summary":
                return self.get_spending_summary()
            else:
                raise ValueError(f"Unsupported query type: {query_type}")
                
        except Exception as e:
            logger.error(f"Error executing database query: {e}")
            raise
    
    # Helper methods for data conversion
    def _get_or_create_session_context(self, session_id: str):
        """Get or create session context"""
        if session_id not in self.session_contexts:
            # Create new session context using AI PoC types
            from models.data_types import AIQueryContext
            self.session_contexts[session_id] = AIQueryContext(
                session_id=session_id,
                timestamp=datetime.now(),
                conversation_history=[]
            )
        return self.session_contexts[session_id]
    
    def _convert_query_type(self, ai_query_type: AIQueryType) -> QueryType:
        """Convert AI PoC query type to API query type"""
        mapping = {
            AIQueryType.SPENDING_SUMMARY: QueryType.SPENDING_SUMMARY,
            AIQueryType.BUDGET_STATUS: QueryType.BUDGET_STATUS,
            AIQueryType.TRANSACTION_SEARCH: QueryType.TRANSACTION_SEARCH,
            AIQueryType.BALANCE_INQUIRY: QueryType.BALANCE_INQUIRY,
            AIQueryType.CATEGORY_ANALYSIS: QueryType.CATEGORY_ANALYSIS,
            AIQueryType.GOAL_PROGRESS: QueryType.GOAL_PROGRESS,
            AIQueryType.UNKNOWN: QueryType.UNKNOWN
        }
        return mapping.get(ai_query_type, QueryType.UNKNOWN)
    
    def _convert_processing_type(self, ai_processing_type: AIProcessingType) -> ProcessingType:
        """Convert AI PoC processing type to API processing type"""
        mapping = {
            AIProcessingType.HUGGINGFACE: ProcessingType.HUGGINGFACE,
            AIProcessingType.ON_DEVICE: ProcessingType.ON_DEVICE,
            AIProcessingType.CLOUD: ProcessingType.CLOUD,
            AIProcessingType.HYBRID: ProcessingType.HYBRID
        }
        return mapping.get(ai_processing_type, ProcessingType.ON_DEVICE)
    
    def _convert_embedded_data(self, ai_embedded_data) -> Optional[EmbeddedComponentData]:
        """Convert AI PoC embedded data to API embedded data"""
        if not ai_embedded_data:
            return None
        
        try:
            # Map component types
            component_type_mapping = {
                "CategoryBreakdownChart": ComponentType.CATEGORY_BREAKDOWN_CHART,
                "BudgetCard": ComponentType.BUDGET_CARD,
                "TransactionList": ComponentType.TRANSACTION_LIST,
                "SpendingTrendChart": ComponentType.SPENDING_TREND_CHART,
                "GoalProgressCard": ComponentType.GOAL_PROGRESS_CARD
            }
            
            component_type = component_type_mapping.get(
                ai_embedded_data.component_type,
                ComponentType.CATEGORY_BREAKDOWN_CHART
            )
            
            return EmbeddedComponentData(
                component_type=component_type,
                title=ai_embedded_data.title,
                data=ai_embedded_data.data,
                size=ai_embedded_data.size
            )
        except Exception as e:
            logger.error(f"Error converting embedded data: {e}")
            return None
    
    def _convert_context(self, ai_context) -> Optional[AIQueryContext]:
        """Convert AI PoC context to API context"""
        if not ai_context:
            return None
        
        try:
            return AIQueryContext(
                session_id=ai_context.session_id,
                timestamp=ai_context.timestamp,
                conversation_history=ai_context.conversation_history,
                last_query_type=self._convert_query_type(ai_context.last_query_type) if ai_context.last_query_type else None
            )
        except Exception as e:
            logger.error(f"Error converting context: {e}")
            return None