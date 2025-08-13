"""
HuggingFace Model Manager for AI Proof of Concept
Manages different AI models for financial query processing
"""
import os
import logging
from typing import Dict, List, Optional, Any
from huggingface_hub import InferenceClient
from ..models.data_types import QueryType, ProcessingType
import requests
import time

logger = logging.getLogger(__name__)

class HuggingFaceManager:
    """Manages HuggingFace models for different AI tasks"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = InferenceClient(token=api_key)
        
        # Model configuration
        self.models = {
            "classification": os.getenv("HF_CLASSIFICATION_MODEL", "facebook/bart-large-mnli"),
            "conversational": os.getenv("HF_CONVERSATIONAL_MODEL", "openai/gpt-oss-20b"),
            "financial": os.getenv("HF_FINANCIAL_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest"),
            "general": os.getenv("HF_GENERAL_MODEL", "openai/gpt-oss-20b")
        }
        
        logger.info(f"Initialized HuggingFace Manager with models: {self.models}")
    
    def classify_query(self, query: str) -> tuple[QueryType, float]:
        """Classify the type of financial query"""
        try:
            # Define possible query types for zero-shot classification
            candidate_labels = [
                "spending summary",
                "budget status", 
                "balance inquiry",
                "transaction search",
                "general question"
            ]
            
            result = self.client.zero_shot_classification(
                query,
                candidate_labels,
                model=self.models["classification"]
            )
            
            # Map results to QueryType
            label_mapping = {
                "spending summary": QueryType.SPENDING_SUMMARY,
                "budget status": QueryType.BUDGET_STATUS,
                "balance inquiry": QueryType.BALANCE_INQUIRY, 
                "transaction search": QueryType.TRANSACTION_SEARCH,
                "general question": QueryType.UNKNOWN
            }
            
            # Handle different response formats from HuggingFace
            if isinstance(result, dict) and "labels" in result and "scores" in result:
                top_label = result["labels"][0]
                confidence = result["scores"][0]
            elif isinstance(result, list) and len(result) > 0:
                # Sometimes HuggingFace returns a list format
                top_result = result[0]
                if isinstance(top_result, dict):
                    top_label = top_result.get("label", "general question")
                    confidence = top_result.get("score", 0.5)
                else:
                    top_label = "general question"
                    confidence = 0.5
            else:
                # Fallback for unexpected format
                top_label = "general question"
                confidence = 0.5
                
            query_type = label_mapping.get(top_label, QueryType.UNKNOWN)
            
            logger.info(f"Query classified as {query_type.value} with confidence {confidence:.2f}")
            return query_type, confidence
            
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return QueryType.UNKNOWN, 0.5
    
    def generate_financial_response(self, 
                                  query: str, 
                                  financial_data: Dict[str, Any],
                                  query_type: QueryType) -> str:
        """Generate a conversational response about financial data"""
        try:
            # Debug: Log the incoming financial data
            logger.info(f"🔍 Processing query: '{query}' | Type: {query_type.value}")
            logger.info(f"📋 Raw financial data keys: {list(financial_data.keys())}")
            
            # Create a context-aware prompt
            context = self._build_financial_context(financial_data, query_type)
            logger.info(f"📊 Generated context: {context}")
            
            # Try OpenAI GPT OSS model with chat completion first
            try:
                logger.info("🤖 Attempting GPT OSS model...")
                response = self._generate_with_gpt_oss(query, context)
                if response:
                    logger.info(f"✅ GPT OSS success: {response[:100]}...")
                    return response
                else:
                    logger.warning("⚠️ GPT OSS returned empty response")
            except Exception as gpt_error:
                logger.warning(f"❌ GPT OSS model failed: {gpt_error}")
            
            # Fallback to traditional text generation
            prompt = f"""You are a financial assistant. CRITICAL: You MUST use the specific financial data provided below in your response. Always include actual dollar amounts, category names, and specific numbers from the user's financial context. Never give generic responses.

User Question: {query}

User's Financial Data: {context}

Response (use the specific financial data above - include actual numbers and amounts):"""

            # Try conversational model
            try:
                logger.info("🤖 Attempting conversational model...")
                result = self.client.text_generation(
                    prompt=prompt,
                    model=self.models["conversational"],
                    max_new_tokens=200,
                    temperature=0.7,
                    do_sample=True,
                    return_full_text=False
                )
                
                response = result.strip()
                if response:
                    logger.info(f"✅ Conversational model success: {response[:100]}...")
                    return response
                else:
                    logger.warning("⚠️ Conversational model returned empty response")
                    
            except Exception as conv_error:
                logger.warning(f"❌ Conversational model failed: {conv_error}")
            
            # Fallback to general model
            try:
                logger.info("🤖 Attempting general model...")
                result = self.client.text_generation(
                    prompt=prompt,
                    model=self.models["general"],
                    max_new_tokens=150,
                    temperature=0.6,
                    return_full_text=False
                )
                
                response = result.strip()
                if response:
                    logger.info(f"✅ General model success: {response[:100]}...")
                    return response
                else:
                    logger.warning("⚠️ General model returned empty response")
                    
            except Exception as gen_error:
                logger.warning(f"❌ General model failed: {gen_error}")
            
            # Final fallback to template response
            logger.info("🔧 Using template fallback with actual data...")
            template_response = self._generate_template_response(query, financial_data, query_type)
            logger.info(f"✅ Template response: {template_response[:100]}...")
            return template_response
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return self._generate_template_response(query, financial_data, query_type)
    
    def _generate_with_gpt_oss(self, query: str, context: str) -> str:
        """Generate response using OpenAI GPT OSS 20B model with chat completion API"""
        try:
            messages = [
                {
                    "role": "system", 
                    "content": "You are a financial assistant. CRITICAL: You MUST use the specific financial data provided in your response. Always include actual dollar amounts, category names, and specific numbers from the user's financial context. Never give generic responses - use the real data provided. Be conversational but always reference the specific financial information given."
                },
                {
                    "role": "user",
                    "content": f"Question: {query}\n\nMy Financial Data: {context}\n\nIMPORTANT: Use the specific numbers and details from my financial data above in your response. Include actual dollar amounts and category names."
                }
            ]
            
            # Use chat completion API for GPT OSS model
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=messages,
                max_tokens=200,
                temperature=0.7,
                stream=False
            )
            
            if response and hasattr(response, 'choices') and response.choices:
                content = response.choices[0].message.content
                if content:
                    logger.info("✅ GPT OSS model generated response successfully")
                    return content.strip()
            
            return ""
            
        except Exception as e:
            logger.error(f"GPT OSS chat completion failed: {e}")
            # Try fallback text generation method
            try:
                prompt = f"""<|im_start|>system
You are a financial assistant. CRITICAL: You MUST use the specific financial data provided. Always include actual dollar amounts, category names, and numbers from the user's data. Never give generic responses.<|im_end|>
<|im_start|>user
Question: {query}

My Financial Data: {context}

IMPORTANT: Use the specific numbers and details from my financial data above in your response.<|im_end|>
<|im_start|>assistant"""
                
                result = self.client.text_generation(
                    prompt=prompt,
                    model="openai/gpt-oss-20b",
                    max_new_tokens=200,
                    temperature=0.7,
                    stop=["<|im_end|>"],
                    return_full_text=False
                )
                
                if result:
                    logger.info("✅ GPT OSS text generation fallback successful")
                    return result.strip()
                    
            except Exception as fallback_error:
                logger.error(f"GPT OSS fallback also failed: {fallback_error}")
            
            return ""
    
    def _build_financial_context(self, financial_data: Dict[str, Any], query_type: QueryType) -> str:
        """Build context string from financial data with validation"""
        context_parts = []
        has_real_data = False
        
        # Validate and build total spending info
        if "total_amount" in financial_data and financial_data["total_amount"] > 0:
            context_parts.append(f"Total spending: ${financial_data['total_amount']:.2f}")
            has_real_data = True
        
        # Validate and build category breakdown
        if "category_breakdown" in financial_data and financial_data["category_breakdown"]:
            top_categories = sorted(
                financial_data["category_breakdown"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]  # Show top 5 instead of 3 for more detail
            if top_categories and top_categories[0][1] > 0:  # Ensure we have real amounts
                category_info = ", ".join([f"{cat}: ${amt:.2f}" for cat, amt in top_categories])
                context_parts.append(f"Spending by category: {category_info}")
                has_real_data = True
        
        # Validate and build transaction details
        if "transactions" in financial_data and financial_data["transactions"]:
            transactions = financial_data["transactions"]
            if len(transactions) > 0:
                transaction_count = len(transactions)
                context_parts.append(f"Found {transaction_count} recent transactions")
                
                # Add details about recent transactions for more context
                if hasattr(transactions[0], 'amount') and hasattr(transactions[0], 'description'):
                    recent_tx = transactions[0]
                    context_parts.append(f"Most recent: ${recent_tx.amount:.2f} for {recent_tx.description}")
                    has_real_data = True
        
        # Validate and build budget information  
        if "budgets" in financial_data and financial_data["budgets"]:
            budgets = financial_data["budgets"]
            if budgets:
                total_budgeted = sum(b.get("budgeted", 0) for b in budgets)
                total_spent = sum(b.get("spent", 0) for b in budgets)
                over_budget = [b for b in budgets if b.get("percentage", 0) > 100]
                
                context_parts.append(f"Total budget: ${total_budgeted:.2f}, spent: ${total_spent:.2f}")
                if over_budget:
                    over_budget_categories = [b.get("category", "Unknown") for b in over_budget]
                    context_parts.append(f"Over-budget in: {', '.join(over_budget_categories)}")
                has_real_data = True
        
        # Enhanced validation - ensure we have meaningful data
        if not has_real_data or not context_parts:
            logger.warning("⚠️  No real financial data found - context may be empty")
            return "No specific financial data available - please check database connection"
        
        context = "; ".join(context_parts)
        logger.info(f"📊 Built financial context: {context}")
        return context
    
    def _generate_template_response(self, query: str, financial_data: Dict[str, Any], query_type: QueryType) -> str:
        """Generate template response based on query type"""
        templates = {
            QueryType.SPENDING_SUMMARY: self._template_spending_summary,
            QueryType.BUDGET_STATUS: self._template_budget_status,
            QueryType.TRANSACTION_SEARCH: self._template_transaction_search,
            QueryType.BALANCE_INQUIRY: self._template_balance_inquiry,
            QueryType.UNKNOWN: self._template_unknown
        }
        
        template_func = templates.get(query_type, self._template_unknown)
        return template_func(financial_data)
    
    def _template_spending_summary(self, data: Dict[str, Any]) -> str:
        """Template for spending summary responses using actual data"""
        if "total_amount" in data and data["total_amount"] > 0:
            total = data["total_amount"]
            response_parts = [f"You've spent ${total:.2f} in total"]
            
            if "category_breakdown" in data and data["category_breakdown"]:
                categories = sorted(data["category_breakdown"].items(), key=lambda x: x[1], reverse=True)[:3]
                if categories and categories[0][1] > 0:
                    top_categories = ", ".join([f"{cat} (${amt:.2f})" for cat, amt in categories])
                    response_parts.append(f"Your top spending categories are: {top_categories}")
            
            if "timeframe" in data and data["timeframe"]:
                response_parts.append(f"for {data['timeframe']}")
                
            return ". ".join(response_parts) + "."
        
        # Fallback only if no real data
        return "I'd like to help you analyze your spending, but I'm not finding transaction data. Please make sure you have recorded some expenses first."
    
    def _template_budget_status(self, data: Dict[str, Any]) -> str:
        """Template for budget status responses using actual data"""
        if "budgets" in data and data["budgets"]:
            budgets = data["budgets"]
            response_parts = []
            
            # Calculate budget statistics
            total_budgets = len(budgets)
            over_budget = [b for b in budgets if b.get("percentage", 0) > 100]
            near_limit = [b for b in budgets if 80 <= b.get("percentage", 0) <= 100]
            
            if over_budget:
                over_budget_names = [b.get("category", "Unknown") for b in over_budget]
                response_parts.append(f"⚠️ You're over budget in {len(over_budget)} category(ies): {', '.join(over_budget_names)}")
            elif near_limit:
                near_limit_names = [b.get("category", "Unknown") for b in near_limit]
                response_parts.append(f"You're close to your budget limit in: {', '.join(near_limit_names)}")
            else:
                response_parts.append(f"✅ All {total_budgets} budgets are on track")
            
            # Add specific budget details
            if budgets:
                total_budgeted = sum(b.get("budgeted", 0) for b in budgets)
                total_spent = sum(b.get("spent", 0) for b in budgets)
                remaining = total_budgeted - total_spent
                response_parts.append(f"Total budgeted: ${total_budgeted:.2f}, spent: ${total_spent:.2f}, remaining: ${remaining:.2f}")
            
            return ". ".join(response_parts) + "."
        
        # Fallback only if no real data
        return "I can help you check your budget status, but I don't see any budgets set up yet. Would you like to create some budgets first?"
    
    def _template_transaction_search(self, data: Dict[str, Any]) -> str:
        """Template for transaction search responses using actual data"""
        if "transactions" in data and data["transactions"]:
            transactions = data["transactions"]
            count = len(transactions)
            if count > 0:
                response_parts = [f"I found {count} transactions"]
                
                # Add details about the most recent transaction
                if hasattr(transactions[0], 'amount') and hasattr(transactions[0], 'description'):
                    latest = transactions[0]
                    response_parts.append(f"Most recent: ${latest.amount:.2f} for {latest.description}")
                    
                    # Add date if available
                    if hasattr(latest, 'date'):
                        response_parts.append(f"on {latest.date}")
                
                # Add total amount if available
                if "total_amount" in data:
                    total = data["total_amount"]
                    response_parts.append(f"Total amount: ${total:.2f}")
                
                # Add categories if available
                if "categories" in data and data["categories"]:
                    unique_categories = data["categories"][:3]  # Limit to 3 for brevity
                    response_parts.append(f"Categories: {', '.join(unique_categories)}")
                
                return ". ".join(response_parts) + "."
        
        # Fallback only if no real data
        return "I can help you search through your transactions, but I'm not finding any transaction data. Please make sure you have recorded some expenses first."
    
    def _template_balance_inquiry(self, data: Dict[str, Any]) -> str:
        """Template for balance inquiry responses using actual data"""
        response_parts = []
        
        if "total_spent" in data and data["total_spent"] > 0:
            response_parts.append(f"You've spent ${data['total_spent']:.2f} in total")
        
        if "total_budgeted" in data and data["total_budgeted"] > 0:
            total_budgeted = data["total_budgeted"]
            response_parts.append(f"with a total budget of ${total_budgeted:.2f}")
            
            if "remaining_budget" in data:
                remaining = data["remaining_budget"]
                response_parts.append(f"You have ${remaining:.2f} remaining in your budgets")
        
        if "transaction_count" in data and data["transaction_count"] > 0:
            count = data["transaction_count"]
            response_parts.append(f"across {count} transactions")
        
        if "categories" in data and data["categories"]:
            category_count = len(data["categories"])
            response_parts.append(f"in {category_count} different categories")
        
        if response_parts:
            return ". ".join(response_parts) + "."
        
        # Fallback with actual total if available
        if "total_amount" in data and data["total_amount"] > 0:
            return f"Based on your recent activity, you've spent ${data['total_amount']:.2f}. I can provide more detailed information about specific time periods or categories."
        
        # Final fallback only if no real data
        return "I can help you check your balance and spending patterns, but I need some transaction data first. Please add some expenses to get started."
    
    def _template_unknown(self, data: Dict[str, Any]) -> str:
        """Template for unknown query types"""
        return "I'm here to help with your financial questions! I can provide information about your spending, budgets, transactions, and financial patterns. What would you like to know?"
    
    def test_models(self) -> Dict[str, bool]:
        """Test if all configured models are accessible"""
        results = {}
        
        for model_type, model_name in self.models.items():
            try:
                logger.info(f"Testing {model_type} model: {model_name}")
                
                if model_type == "classification":
                    result = self.client.zero_shot_classification(
                        text="How much did I spend on groceries?",
                        labels=["spending", "budget"],
                        model=model_name
                    )
                    results[model_type] = True
                    
                elif model_type in ["conversational", "general"]:
                    # Test GPT OSS model with chat completion if available
                    if "openai/gpt-oss-20b" in model_name:
                        try:
                            test_response = self.client.chat.completions.create(
                                model=model_name,
                                messages=[
                                    {"role": "system", "content": "You are a helpful assistant."},
                                    {"role": "user", "content": "Hello, how can I help?"}
                                ],
                                max_tokens=10,
                                temperature=0.5
                            )
                            results[model_type] = True
                        except Exception as chat_error:
                            logger.warning(f"Chat completion failed for {model_name}, trying text generation: {chat_error}")
                            # Fallback to text generation
                            result = self.client.text_generation(
                                prompt="Hello, how can I help?",
                                model=model_name,
                                max_new_tokens=10,
                                return_full_text=False
                            )
                            results[model_type] = True
                    else:
                        result = self.client.text_generation(
                            prompt="Hello, how can I help?",
                            model=model_name,
                            max_new_tokens=10,
                            return_full_text=False
                        )
                        results[model_type] = True
                    
                elif model_type == "financial":
                    result = self.client.text_classification(
                        text="I spent too much money",
                        model=model_name
                    )
                    results[model_type] = True
                
                logger.info(f"✅ {model_type} model working")
                time.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                logger.error(f"❌ {model_type} model failed: {e}")
                results[model_type] = False
        
        return results