"""
HuggingFace Model Manager for AI Proof of Concept
Manages different AI models for financial query processing
"""
import os
import logging
from typing import Dict, List, Optional, Any
from huggingface_hub import InferenceClient
from models.data_types import QueryType, ProcessingType
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
                text=query,
                labels=candidate_labels,
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
            
            top_label = result["labels"][0]
            confidence = result["scores"][0]
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
            # Create a context-aware prompt
            context = self._build_financial_context(financial_data, query_type)
            
            # Try OpenAI GPT OSS model with chat completion first
            try:
                response = self._generate_with_gpt_oss(query, context)
                if response:
                    return response
            except Exception as gpt_error:
                logger.warning(f"GPT OSS model failed: {gpt_error}")
            
            # Fallback to traditional text generation
            prompt = f"""You are a helpful financial assistant. Based on the user's question and their financial data, provide a clear, concise response.

User Question: {query}

Financial Context: {context}

Response (be conversational and helpful):"""

            # Try conversational model
            try:
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
                    return response
                    
            except Exception as conv_error:
                logger.warning(f"Conversational model failed: {conv_error}")
            
            # Fallback to general model
            try:
                result = self.client.text_generation(
                    prompt=prompt,
                    model=self.models["general"],
                    max_new_tokens=150,
                    temperature=0.6,
                    return_full_text=False
                )
                
                response = result.strip()
                if response:
                    return response
                    
            except Exception as gen_error:
                logger.warning(f"General model failed: {gen_error}")
            
            # Final fallback to template response
            return self._generate_template_response(query, financial_data, query_type)
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return self._generate_template_response(query, financial_data, query_type)
    
    def _generate_with_gpt_oss(self, query: str, context: str) -> str:
        """Generate response using OpenAI GPT OSS 20B model with chat completion API"""
        try:
            messages = [
                {
                    "role": "system", 
                    "content": "You are a helpful financial assistant. Provide clear, concise responses about financial data. Be conversational and supportive."
                },
                {
                    "role": "user",
                    "content": f"Question: {query}\n\nFinancial Context: {context}\n\nPlease provide a helpful response based on this financial information."
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
You are a helpful financial assistant. Provide clear, concise responses about financial data.<|im_end|>
<|im_start|>user
Question: {query}

Financial Context: {context}

Please provide a helpful response based on this financial information.<|im_end|>
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
        """Build context string from financial data"""
        context_parts = []
        
        if "total_amount" in financial_data:
            context_parts.append(f"Total spending: ${financial_data['total_amount']:.2f}")
        
        if "category_breakdown" in financial_data:
            top_categories = sorted(
                financial_data["category_breakdown"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]
            category_info = ", ".join([f"{cat}: ${amt:.2f}" for cat, amt in top_categories])
            context_parts.append(f"Top categories: {category_info}")
        
        if "transactions" in financial_data and financial_data["transactions"]:
            transaction_count = len(financial_data["transactions"])
            context_parts.append(f"Recent transactions: {transaction_count} items")
        
        if "budgets" in financial_data and financial_data["budgets"]:
            over_budget = [b for b in financial_data["budgets"] if b.get("percentage_used", 0) > 100]
            if over_budget:
                context_parts.append(f"Over-budget categories: {len(over_budget)}")
        
        return "; ".join(context_parts) if context_parts else "No specific financial data available"
    
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
        """Template for spending summary responses"""
        if "total_amount" in data:
            total = data["total_amount"]
            if "category_breakdown" in data:
                top_category = max(data["category_breakdown"].items(), key=lambda x: x[1])
                return f"You've spent ${total:.2f} recently. Your highest spending category is {top_category[0]} at ${top_category[1]:.2f}."
            return f"Your total spending is ${total:.2f}."
        return "I can help you analyze your spending patterns. Let me look up your recent transactions."
    
    def _template_budget_status(self, data: Dict[str, Any]) -> str:
        """Template for budget status responses"""
        if "budgets" in data and data["budgets"]:
            over_budget = [b for b in data["budgets"] if b.get("percentage_used", 0) > 100]
            if over_budget:
                return f"You have {len(over_budget)} budget(s) that are over the limit. Consider reviewing your spending in these categories."
            return "Your budgets are looking good! You're staying within your limits."
        return "I can help you check your budget status. Let me analyze your current budget performance."
    
    def _template_transaction_search(self, data: Dict[str, Any]) -> str:
        """Template for transaction search responses"""
        if "transactions" in data and data["transactions"]:
            count = len(data["transactions"])
            if count > 0:
                latest = data["transactions"][0]
                return f"I found {count} recent transactions. Your most recent was ${latest.get('amount', 0):.2f} for {latest.get('description', 'a purchase')}."
        return "I can help you search through your transactions. What specific transactions are you looking for?"
    
    def _template_balance_inquiry(self, data: Dict[str, Any]) -> str:
        """Template for balance inquiry responses"""
        if "total_amount" in data:
            return f"Based on your recent activity, you've spent ${data['total_amount']:.2f}. I can provide more detailed balance information if you specify a time period."
        return "I can help you check your balance and spending patterns. What time period would you like to analyze?"
    
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