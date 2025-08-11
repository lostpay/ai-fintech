"""
Main AI Service for Financial Assistant Proof of Concept
Orchestrates all AI components to process financial queries
"""
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from models.data_types import (
    QueryType, ProcessingType, AIResponse, AIQueryContext, 
    FinancialData, EmbeddedComponentData
)
from services.mock_database import MockDatabaseService
from services.huggingface_manager import HuggingFaceManager
from services.query_processor import QueryProcessor

logger = logging.getLogger(__name__)

class AIService:
    """Main AI service that orchestrates financial query processing"""
    
    def __init__(self, api_key: str):
        # Initialize components
        self.database = MockDatabaseService()
        self.huggingface = HuggingFaceManager(api_key)
        self.query_processor = QueryProcessor()
        
        # Service state
        self.conversation_history = []
        self.current_context = None
        
        logger.info("AI Service initialized successfully")
    
    async def process_query(self, query: str, context: Optional[AIQueryContext] = None) -> AIResponse:
        """Process a natural language financial query"""
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
            
            # Step 3: Get relevant financial data
            financial_data = await self._get_financial_data(query_type, parsed_query)
            
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
            
            logger.info(f"Query processed successfully: {query_type.value} with confidence {confidence:.2f}")
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
    
    async def _get_financial_data(self, query_type: QueryType, parsed_query: Dict[str, Any]) -> Dict[str, Any]:
        """Get relevant financial data based on query type"""
        financial_data = {}
        
        try:
            if query_type == QueryType.SPENDING_SUMMARY:
                # Get spending summary
                timeframe = parsed_query.get("timeframe")
                start_date = timeframe["start_date"] if timeframe else None
                end_date = timeframe["end_date"] if timeframe else None
                
                summary = self.database.get_spending_summary(start_date, end_date)
                financial_data = {
                    "total_amount": summary["total_amount"],
                    "transactions": summary["transactions"][:10],  # Limit for display
                    "category_breakdown": summary["category_breakdown"],
                    "timeframe": timeframe["value"] if timeframe else "recent"
                }
            
            elif query_type == QueryType.BUDGET_STATUS:
                # Get budget information
                budgets = self.database.get_budgets_with_details()
                financial_data = {
                    "budgets": [
                        {
                            "category": budget.category_name,
                            "budgeted": budget.amount,
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
                    "total_budgeted": sum(budget.amount for budget in budgets),
                    "total_spent": sum(budget.spent_amount for budget in budgets)
                }
            
            elif query_type == QueryType.TRANSACTION_SEARCH:
                # Search transactions
                category_filter = parsed_query.get("category")
                timeframe = parsed_query.get("timeframe")
                
                transactions = self.database.get_transactions_with_categories(
                    start_date=timeframe["start_date"] if timeframe else None,
                    end_date=timeframe["end_date"] if timeframe else None,
                    limit=20
                )
                
                # Filter by category if specified
                if category_filter:
                    transactions = [
                        t for t in transactions 
                        if category_filter.lower() in t.category_name.lower()
                    ]
                
                financial_data = {
                    "transactions": transactions,
                    "total_amount": sum(t.amount for t in transactions),
                    "categories": list(set(t.category_name for t in transactions))
                }
            
            elif query_type == QueryType.BALANCE_INQUIRY:
                # Get balance/spending overview
                summary = self.database.get_spending_summary()
                budgets = self.database.get_budgets_with_details()
                
                financial_data = {
                    "total_spent": summary["total_amount"],
                    "total_budgeted": sum(budget.amount for budget in budgets),
                    "remaining_budget": sum(budget.remaining_amount for budget in budgets),
                    "categories": list(summary["category_breakdown"].keys()),
                    "transaction_count": summary["transaction_count"]
                }
            
            logger.info(f"Retrieved financial data for {query_type.value}")
            return financial_data
            
        except Exception as e:
            logger.error(f"Error getting financial data: {e}")
            return {}
    
    def _create_embedded_component(self, financial_data: Dict[str, Any], query_type: QueryType) -> Optional[EmbeddedComponentData]:
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
            results["database"] = len(transactions) > 0 and len(budgets) > 0
            
            # Test HuggingFace models
            results["huggingface"] = self.huggingface.test_models()
            
            # Test query processor
            test_query = "How much did I spend on groceries this month?"
            parsed = self.query_processor.parse_query(test_query)
            results["query_processor"] = parsed["category"] == "groceries"
            
            # Overall status
            hf_working = any(results["huggingface"].values())
            results["overall_status"] = "working" if (
                results["database"] and hf_working and results["query_processor"]
            ) else "issues_detected"
            
        except Exception as e:
            logger.error(f"System test failed: {e}")
            results["overall_status"] = "failed"
        
        return results