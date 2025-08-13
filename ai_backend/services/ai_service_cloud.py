"""
Cloud AI Service for Financial Assistant
Direct integration with Supabase database - no SQLite dependencies
"""
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Import AI PoC components directly (now that ai_poc is under ai_backend)
from ai_poc.models.data_types import (
    QueryType, ProcessingType, AIResponse, AIQueryContext, 
    EmbeddedComponentData
)
from ai_poc.services.huggingface_manager import HuggingFaceManager
from ai_poc.services.query_processor import QueryProcessor

from .supabase_service import SupabaseService

class CloudAIService:
    """
    Cloud-native AI service that uses Supabase database directly
    Simplified version without SQLite dependencies
    """
    
    def __init__(self, api_key: str, user_id: str = "default-user"):
        """Initialize the cloud AI service"""
        try:
            # Initialize Supabase database
            self.database = SupabaseService(user_id)
            
            # Initialize AI components
            self.huggingface = HuggingFaceManager(api_key)
            self.query_processor = QueryProcessor()
            
            # Service state
            self.conversation_history = []
            self.current_context = None
            self.user_id = user_id
            
            logger.info(f"🚀 Cloud AI Service initialized successfully for user: {user_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Cloud AI Service: {e}")
            raise
    
    async def process_query(self, query: str, context: Optional[AIQueryContext] = None) -> AIResponse:
        """Process a natural language financial query using cloud database"""
        try:
            logger.info(f"Processing query: {query}")
            
            # Create or update context
            if not context:
                context = AIQueryContext(
                    session_id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    conversation_history=[]
                )
            
            # Step 1: Parse the natural language query
            parsed_query = self.query_processor.parse_query(query)
            
            # Step 2: Classify query type using AI
            query_type, confidence = self.huggingface.classify_query(query)
            
            # Fallback classification based on keywords if confidence is low
            if confidence < 0.6:
                query_type = self._classify_by_keywords(query, parsed_query)
                confidence = 0.7
            
            # Step 3: Get relevant financial data from Supabase
            financial_data = await self._get_financial_data(query_type, parsed_query)
            logger.info(f"🗃️ Retrieved financial data with keys: {list(financial_data.keys())}")
            
            # Debug: Log actual data values for verification
            if "total_amount" in financial_data:
                logger.info(f"💰 Total amount: ${financial_data['total_amount']:.2f}")
            if "category_breakdown" in financial_data:
                logger.info(f"📊 Categories found: {list(financial_data['category_breakdown'].keys())}")
            if "transactions" in financial_data:
                logger.info(f"📝 Transaction count: {len(financial_data['transactions'])}")
            
            # Step 4: Generate AI response
            ai_message = self.huggingface.generate_financial_response(
                query, 
                financial_data, 
                query_type
            )
            
            # Step 5: Create embedded component if applicable
            embedded_data = self._create_embedded_component(financial_data, query_type)
            
            # Step 6: Generate follow-up suggestions
            follow_ups = self.query_processor.generate_follow_up_questions(query_type, parsed_query)
            
            # Update context
            context.last_query_type = query_type
            context.conversation_history.append(query)
            
            # Create response
            response = AIResponse(
                message=ai_message,
                confidence=confidence,
                query_type=query_type,
                processing_type=ProcessingType.HUGGINGFACE,
                embedded_data=embedded_data,
                suggested_actions=follow_ups,
                conversation_context=context,
                model_used=self.huggingface.models.get("conversational", "unknown")
            )
            
            # Store in conversation history
            self.conversation_history.append({
                "query": query,
                "response": response,
                "timestamp": datetime.now()
            })
            
            logger.info(f"Query processed successfully: {query_type} with confidence {confidence:.2f}")
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            
            # Return fallback response
            return AIResponse(
                message=f"I apologize, but I encountered an issue processing your question: '{query}'. I'm here to help with your financial information - could you try rephrasing your question?",
                confidence=0.0,
                query_type=QueryType.UNKNOWN,
                processing_type=ProcessingType.ON_DEVICE,
                suggested_actions=["Try asking about your spending", "Ask about budget status", "Search for transactions"]
            )
    
    async def _get_financial_data(self, query_type, parsed_query: Dict[str, Any]) -> Dict[str, Any]:
        """Get relevant financial data from Supabase based on query type"""
        financial_data = {}
        
        try:
            if query_type == QueryType.SPENDING_SUMMARY:
                # Get spending summary
                timeframe = parsed_query.get("timeframe")
                start_date = timeframe["start_date"] if timeframe else None
                end_date = timeframe["end_date"] if timeframe else None
                
                summary = self.database.get_spending_summary(start_date, end_date)
                transactions = self.database.get_transactions_with_categories(limit=10)
                
                financial_data = {
                    "total_amount": summary["total_amount"],
                    "transactions": [self._transaction_to_dict(t) for t in transactions],
                    "category_breakdown": summary["category_breakdown"],
                    "timeframe": timeframe["value"] if timeframe else "recent"
                }
            
            elif query_type == QueryType.BUDGET_STATUS:
                # Get budget information from Supabase
                budgets = self.database.get_budgets_with_details()
                financial_data = {
                    "budgets": [
                        {
                            "category": budget.category_name,
                            "budgeted": budget.amount / 100.0,  # Convert cents to dollars
                            "spent": budget.spent_amount,
                            "remaining": budget.remaining_amount,
                            "percentage": budget.percentage_used
                        }
                        for budget in budgets
                    ]
                }
                
                # Add summary stats
                over_budget_count = sum(1 for budget in budgets if budget.percentage_used > 100)
                financial_data["summary"] = {
                    "total_budgets": len(budgets),
                    "over_budget_count": over_budget_count,
                    "total_budgeted": sum(budget.amount / 100.0 for budget in budgets),
                    "total_spent": sum(budget.spent_amount for budget in budgets)
                }
            
            elif query_type == QueryType.TRANSACTION_SEARCH:
                # Search transactions
                category_filter = parsed_query.get("category")
                timeframe = parsed_query.get("timeframe")
                
                transactions = self.database.get_transactions_with_categories(limit=20)
                
                # Filter by category if specified
                if category_filter:
                    transactions = [
                        t for t in transactions 
                        if category_filter.lower() in t.category_name.lower()
                    ]
                
                financial_data = {
                    "transactions": [self._transaction_to_dict(t) for t in transactions],
                    "total_amount": sum(t.amount / 100.0 for t in transactions),
                    "categories": list(set(t.category_name for t in transactions))
                }
            
            elif query_type == QueryType.BALANCE_INQUIRY:
                # Get balance/spending overview
                summary = self.database.get_spending_summary()
                budgets = self.database.get_budgets_with_details()
                
                financial_data = {
                    "total_spent": summary["total_amount"],
                    "total_budgeted": sum(budget.amount / 100.0 for budget in budgets),
                    "remaining_budget": sum(budget.remaining_amount for budget in budgets),
                    "categories": list(summary["category_breakdown"].keys()),
                    "transaction_count": summary["transaction_count"]
                }
            
            logger.info(f"Retrieved financial data for {query_type}")
            return financial_data
            
        except Exception as e:
            logger.error(f"Error getting financial data: {e}")
            return {}
    
    def _transaction_to_dict(self, transaction) -> Dict[str, Any]:
        """Convert transaction object to dictionary"""
        return {
            "id": transaction.id,
            "amount": transaction.amount / 100.0,  # Convert cents to dollars
            "description": transaction.description,
            "category_name": transaction.category_name,
            "transaction_type": transaction.transaction_type,
            "date": transaction.date.isoformat(),
            "created_at": transaction.created_at.isoformat()
        }
    
    def _classify_by_keywords(self, query: str, parsed_query: Dict[str, Any]) -> QueryType:
        """Fallback classification based on keywords when AI classification fails"""
        query_lower = query.lower()
        keywords = parsed_query.get('keywords', [])
        
        # Check for transaction/spending keywords
        transaction_keywords = ['transaction', 'spending', 'spent', 'latest', 'recent', 'last', 'show', 'purchased']
        if any(keyword in query_lower for keyword in transaction_keywords):
            return QueryType.TRANSACTION_SEARCH
            
        # Check for budget keywords
        budget_keywords = ['budget', 'budgets', 'budgeting', 'allocated', 'limit', 'allowance']
        if any(keyword in query_lower for keyword in budget_keywords):
            return QueryType.BUDGET_STATUS
            
        # Check for balance/total keywords  
        balance_keywords = ['balance', 'total', 'sum', 'amount', 'money', 'have']
        if any(keyword in query_lower for keyword in balance_keywords):
            return QueryType.BALANCE_INQUIRY
            
        # Check for spending summary keywords
        summary_keywords = ['summary', 'breakdown', 'categories', 'analysis', 'overview']
        if any(keyword in query_lower for keyword in summary_keywords):
            return QueryType.SPENDING_SUMMARY
            
        # Default fallback
        return QueryType.UNKNOWN
    
    def _create_embedded_component(self, financial_data: Dict[str, Any], query_type) -> Optional[EmbeddedComponentData]:
        """Create embedded component data for rich responses"""
        try:
            if query_type == QueryType.SPENDING_SUMMARY and financial_data.get("category_breakdown"):
                return EmbeddedComponentData(
                    component_type="CategoryBreakdownChart",
                    title="Spending by Category",
                    data={
                        "categories": financial_data["category_breakdown"],
                        "total": financial_data.get("total_amount", 0)
                    },
                    size="compact"
                )
            
            elif query_type == QueryType.BUDGET_STATUS and financial_data.get("budgets"):
                # Find the most relevant budget to display
                budgets = financial_data["budgets"]
                if budgets:
                    # Show the budget with highest percentage used
                    top_budget = max(budgets, key=lambda b: b["percentage"])
                    return EmbeddedComponentData(
                        component_type="BudgetCard",
                        title=f"{top_budget['category']} Budget",
                        data={
                            "category": top_budget["category"],
                            "budgeted": top_budget["budgeted"],
                            "spent": top_budget["spent"],
                            "remaining": top_budget["remaining"],
                            "percentage": top_budget["percentage"]
                        },
                        size="compact"
                    )
            
            elif query_type == QueryType.TRANSACTION_SEARCH and financial_data.get("transactions"):
                return EmbeddedComponentData(
                    component_type="TransactionList",
                    title="Recent Transactions",
                    data={
                        "transactions": financial_data["transactions"][:10],
                        "total_amount": financial_data.get("total_amount", 0)
                    },
                    size="compact"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating embedded component: {e}")
            return None
    
    def get_conversation_history(self) -> list:
        """Get the conversation history"""
        return self.conversation_history
    
    def clear_conversation_history(self):
        """Clear the conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
    
    def test_system(self) -> Dict[str, Any]:
        """Test all system components"""
        results = {
            "database": False,
            "huggingface": {},
            "query_processor": False,
            "overall_status": "unknown"
        }
        
        try:
            # Test database
            transactions = self.database.get_transactions_with_categories(limit=1)
            budgets = self.database.get_budgets_with_details()
            results["database"] = len(transactions) >= 0 and len(budgets) >= 0  # Allow empty results
            
            # Test HuggingFace models
            results["huggingface"] = self.huggingface.test_models()
            
            # Test query processor
            test_query = "How much did I spend on groceries this month?"
            parsed = self.query_processor.parse_query(test_query)
            results["query_processor"] = parsed.get("category") == "groceries"
            
            # Overall status
            hf_working = any(results["huggingface"].values())
            results["overall_status"] = "working" if (
                results["database"] and hf_working and results["query_processor"]
            ) else "issues_detected"
            
        except Exception as e:
            logger.error(f"System test failed: {e}")
            results["overall_status"] = "failed"
        
        return results
    
    def get_database_health(self) -> Dict[str, Any]:
        """Get database health status and statistics"""
        try:
            return self.database.get_database_health()
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "connection_status": "failed"
            }
    
    def cleanup(self):
        """Cleanup resources"""
        try:
            if self.database:
                self.database.cleanup()
                logger.info("Database connection closed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def __del__(self):
        """Destructor - ensure cleanup"""
        self.cleanup()