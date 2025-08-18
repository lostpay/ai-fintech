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
        
        # Model configuration - following AI_Finance_Chat_Workflow.md specifications
        self.models = {
            "classification": os.getenv("HF_CLASSIFICATION_MODEL", "mistralai/Mistral-7B-Instruct-v0.3"),
            "conversational": os.getenv("HF_CONVERSATIONAL_MODEL", "mistralai/Mistral-7B-Instruct-v0.3"),
            "financial": os.getenv("HF_FINANCIAL_MODEL", "ProsusAI/finbert"),
            "general": os.getenv("HF_GENERAL_MODEL", "meta-llama/Meta-Llama-3-8B-Instruct"),
            "ner": os.getenv("HF_NER_MODEL", "dslim/bert-base-NER"),
            "embeddings": os.getenv("HF_EMBEDDINGS_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        }
        
        logger.info(f"Initialized HuggingFace Manager with models: {self.models}")
    
    def classify_query_json(self, query: str) -> dict:
        """Classify query using exact JSON schema from workflow"""
        try:
            # Get current date for context
            from datetime import datetime, timedelta
            current_date = datetime.now()
            current_date_str = current_date.strftime("%Y-%m-%d")
            
            # Enhanced prompt with date context and ranking detection
            classification_prompt = f"""You are an intent classifier. Return JSON only.

Current date: {current_date_str}

User query: "{query}"

IMPORTANT RULES:
1. For date ranges, use ACTUAL ISO dates (YYYY-MM-DD), NOT placeholders
2. For "lowest/smallest/minimum" spending: use intent="spending_summary" with order="ascending"
3. For "highest/biggest/top" spending: use intent="spending_summary" with order="descending"  
4. For "last 30 days": from="{(current_date - timedelta(days=30)).strftime('%Y-%m-%d')}", to="{current_date_str}"

JSON schema:
{{
  "intent": "spending_summary | budget_status | transaction_search | balance_inquiry | general",
  "time_range": {{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "granularity": "day|week|month"}},
  "filters": {{"merchant": string|null, "category": string|null, "order": "ascending|descending|null", "top_n": number|null, "amount_min": number|null, "amount_max": number|null}},
  "confidence": 0.0-1.0
}}

Examples:
- "lowest spending category last 30 days" → intent="spending_summary", order="ascending", top_n=1
- "biggest expense this month" → intent="spending_summary", order="descending", top_n=1  
- "last 30 days transactions" → from="{(current_date - timedelta(days=30)).strftime('%Y-%m-%d')}", to="{current_date_str}"

Return JSON only:"""

            # Try with Mistral-7B for JSON classification (as specified in workflow)
            try:
                # Use chat_completion for classification
                messages = [{"role": "user", "content": classification_prompt}]
                response = self.client.chat_completion(
                    messages=messages,
                    model=self.models["classification"],
                    max_tokens=150,
                    temperature=0.1  # Low temp for factual classification
                )
                
                if response and response.choices and len(response.choices) > 0:
                    # Try to parse JSON response
                    import json
                    import re
                    
                    # Extract content from chat completion response
                    content = response.choices[0].message.content
                    
                    # Extract JSON from response
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(0)
                        result = json.loads(json_str)
                        
                        # Validate and normalize the result
                        intent = result.get("intent", "general")
                        if intent not in ["spending_summary", "budget_status", "transaction_search", "balance_inquiry", "general"]:
                            intent = "general"
                        
                        logger.info(f"Query classified as {intent} with JSON structure")
                        return {
                            "intent": intent,
                            "time_range": result.get("time_range", {}),
                            "filters": result.get("filters", {}),
                            "confidence": 0.8
                        }
                        
            except Exception as json_error:
                logger.warning(f"JSON classification failed: {json_error}")
            
            # Fallback to keyword-based classification
            return self._classify_by_keywords_json(query)
            
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return {
                "intent": "general",
                "time_range": {},
                "filters": {},
                "confidence": 0.5
            }
    
    def classify_query(self, query: str) -> tuple[QueryType, float]:
        """Legacy method - calls new JSON classifier and converts format"""
        json_result = self.classify_query_json(query)
        
        # Map intent to QueryType
        intent_mapping = {
            "spending_summary": QueryType.SPENDING_SUMMARY,
            "budget_status": QueryType.BUDGET_STATUS,
            "balance_inquiry": QueryType.BALANCE_INQUIRY,
            "transaction_search": QueryType.TRANSACTION_SEARCH,
            "general": QueryType.UNKNOWN
        }
        
        query_type = intent_mapping.get(json_result["intent"], QueryType.UNKNOWN)
        confidence = json_result.get("confidence", 0.5)
        
        logger.info(f"Query classified as {query_type.value} with confidence {confidence:.2f}")
        return query_type, confidence
    
    def _classify_by_keywords_json(self, query: str) -> dict:
        """Enhanced keyword-based classification returning JSON schema format"""
        query_lower = query.lower()
        from datetime import datetime, timedelta
        now = datetime.now()
        
        # Detect intent based on keywords
        intent = "general"
        
        # Category ranking patterns
        if any(word in query_lower for word in ["lowest", "smallest", "minimum"]) and "category" in query_lower:
            intent = "spending_summary"
        elif any(word in query_lower for word in ["highest", "biggest", "largest", "top"]) and "category" in query_lower:
            intent = "spending_summary"
        elif "budget" in query_lower:
            intent = "budget_status"
        elif any(word in query_lower for word in ["transaction", "purchase", "bought", "spent"]):
            intent = "transaction_search"
        elif any(word in query_lower for word in ["spending", "spend", "expense", "total"]):
            intent = "spending_summary"
        
        # Extract time references with actual dates
        time_range = {}
        if "this month" in query_lower:
            time_range = {
                "from": f"{now.year}-{now.month:02d}-01",
                "to": now.strftime("%Y-%m-%d"),
                "granularity": "month"
            }
        elif "last month" in query_lower:
            prev_month = now.month - 1 if now.month > 1 else 12
            prev_year = now.year if now.month > 1 else now.year - 1
            last_day = 31 if prev_month in [1,3,5,7,8,10,12] else 30 if prev_month != 2 else 28
            time_range = {
                "from": f"{prev_year}-{prev_month:02d}-01",
                "to": f"{prev_year}-{prev_month:02d}-{last_day:02d}",
                "granularity": "month"
            }
        elif "last 30 days" in query_lower or "30 days" in query_lower:
            start_date = now - timedelta(days=30)
            time_range = {
                "from": start_date.strftime("%Y-%m-%d"),
                "to": now.strftime("%Y-%m-%d"),
                "granularity": "day"
            }
        elif "last 7 days" in query_lower or "week" in query_lower:
            start_date = now - timedelta(days=7)
            time_range = {
                "from": start_date.strftime("%Y-%m-%d"),
                "to": now.strftime("%Y-%m-%d"),
                "granularity": "day"
            }
        elif "yesterday" in query_lower:
            yesterday = now - timedelta(days=1)
            time_range = {
                "from": yesterday.strftime("%Y-%m-%d"),
                "to": yesterday.strftime("%Y-%m-%d"),
                "granularity": "day"
            }
        
        # Extract filters
        filters = {}
        
        # Detect ordering and ranking
        if "lowest" in query_lower or "smallest" in query_lower or "minimum" in query_lower:
            filters["order"] = "ascending"
            filters["top_n"] = 1
        elif "highest" in query_lower or "biggest" in query_lower or "largest" in query_lower:
            filters["order"] = "descending"
            filters["top_n"] = 1
        elif "top" in query_lower:
            filters["order"] = "descending"
            # Extract number if present (e.g., "top 5")
            import re
            match = re.search(r'top\s+(\d+)', query_lower)
            filters["top_n"] = int(match.group(1)) if match else 1
        
        # Check for category mentions
        categories = ["groceries", "dining", "coffee", "gas", "shopping", "entertainment", "utilities", "rent", "food", "restaurant"]
        for category in categories:
            if category in query_lower:
                filters["category"] = category
                break
        
        # Check for merchant mentions  
        merchants = ["starbucks", "walmart", "amazon", "target", "costco"]
        for merchant in merchants:
            if merchant in query_lower:
                filters["merchant"] = merchant
                break
        
        # Classify intent by keywords
        if any(keyword in query_lower for keyword in ['transaction', 'spending', 'spent', 'latest', 'recent', 'last', 'show', 'purchased']):
            intent = "transaction_search"
        elif any(keyword in query_lower for keyword in ['budget', 'budgets', 'budgeting', 'allocated', 'limit', 'allowance']):
            intent = "budget_status"
        elif any(keyword in query_lower for keyword in ['balance', 'total', 'sum', 'amount', 'money', 'have']):
            intent = "balance_inquiry"
        elif any(keyword in query_lower for keyword in ['summary', 'breakdown', 'categories', 'analysis', 'overview']):
            intent = "spending_summary"
        else:
            intent = "general"
        
        return {
            "intent": intent,
            "time_range": time_range,
            "filters": filters,
            "confidence": 0.7
        }
    
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
            
            # Try Mistral-7B model first (as specified in workflow)
            try:
                logger.info("🤖 Attempting Mistral-7B model...")
                response = self._generate_with_mistral(query, context, query_type)
                if response:
                    logger.info(f"✅ Mistral-7B success: {response[:100]}...")
                    return response
                else:
                    logger.warning("⚠️ Mistral-7B returned empty response")
            except Exception as mistral_error:
                logger.warning(f"❌ Mistral-7B model failed: {mistral_error}")
            
            # Fallback to traditional text generation
            prompt = f"""You are a financial assistant. CRITICAL: You MUST use the specific financial data provided below in your response. Always include actual dollar amounts, category names, and specific numbers from the user's financial context. Never give generic responses.

User Question: {query}

User's Financial Data: {context}

Response (use the specific financial data above - include actual numbers and amounts):"""

            # Try conversational model (Mistral-7B)
            try:
                logger.info("🤖 Attempting Mistral-7B conversational model...")
                # Use chat_completion for conversational task
                messages = [{"role": "user", "content": prompt}]
                result = self.client.chat_completion(
                    messages=messages,
                    model=self.models["conversational"],
                    max_tokens=200,
                    temperature=0.7
                )
                
                if result and result.choices and len(result.choices) > 0:
                    response = result.choices[0].message.content.strip()
                    logger.info(f"✅ Conversational model success: {response[:100]}...")
                    return response
                else:
                    logger.warning("⚠️ Conversational model returned empty response")
                    
            except Exception as conv_error:
                logger.warning(f"❌ Conversational model failed: {conv_error}")
            
            # Fallback to general model (Meta-Llama-3-8B)
            try:
                logger.info("🤖 Attempting Meta-Llama-3-8B general model...")
                # Use chat_completion for general model
                messages = [
                    {"role": "system", "content": "You are a financial assistant. CRITICAL: You MUST use the specific financial data provided. Always include actual dollar amounts, category names, and numbers from the user's data. Never give generic responses."},
                    {"role": "user", "content": prompt}
                ]
                result = self.client.chat_completion(
                    messages=messages,
                    model=self.models["general"],
                    max_tokens=150,
                    temperature=0.6
                )
                
                if result and result.choices and len(result.choices) > 0:
                    response = result.choices[0].message.content.strip()
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
    
    def _get_optimized_prompt(self, query: str, context: str, query_type: QueryType) -> list:
        """Get optimized prompt messages based on query type"""
        
        if query_type == QueryType.BUDGET_STATUS:
            system_prompt = """You are a budget analysis expert. Your task is to analyze budget performance and provide clear, actionable insights.

CRITICAL REQUIREMENTS:
1. Use ONLY the specific budget data provided
2. Include exact dollar amounts from the data
3. Calculate percentages and remaining amounts
4. Provide clear status indicators (✅ on track, ⚠️ close to limit, 🚨 over budget)
5. Be direct and factual - no generic advice

RESPONSE FORMAT:
- Start with overall budget health summary
- List specific budget categories with amounts and percentages
- Include remaining amounts and recommendations"""

            user_prompt = f"""Analyze my budget status:

BUDGET DATA: {context}

Question: {query}

Provide a clear budget analysis using the exact numbers above. Include specific dollar amounts, percentages, and remaining budget for each category."""

        elif query_type == QueryType.TRANSACTION_SEARCH or "categories" in query.lower() or "category" in query.lower():
            system_prompt = """You are a spending category analyst. Your expertise is analyzing transaction patterns and categorizing expenses.

CRITICAL REQUIREMENTS:
1. Use ONLY the specific transaction data provided
2. Group spending by categories with exact amounts
3. Show category percentages of total spending
4. Identify top spending categories
5. Include actual transaction examples when relevant

RESPONSE FORMAT:
- List categories ranked by spending amount
- Include dollar amounts and percentages for each category
- Show total spending clearly
- Add specific transaction examples if helpful"""

            user_prompt = f"""Analyze my spending by categories:

TRANSACTION DATA: {context}

Question: {query}

Break down my spending by categories using the exact transaction data above. Show specific dollar amounts for each category and identify my top spending areas."""

        else:
            # Default optimized prompt for spending summaries and other queries
            system_prompt = """You are a financial data analyst. Your job is to provide clear, data-driven insights about spending patterns.

CRITICAL REQUIREMENTS:
1. Use ONLY the specific financial data provided
2. Include exact dollar amounts and transaction counts
3. Provide clear summary statistics
4. Be concise and factual
5. Format information clearly with specific numbers

RESPONSE FORMAT:
- Start with key totals and summary
- Break down by relevant categories or time periods
- Include specific transaction details when relevant"""

            user_prompt = f"""Analyze my financial data:

FINANCIAL DATA: {context}

Question: {query}

Provide a clear analysis using the exact financial data above. Include specific dollar amounts and transaction details."""

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    def _generate_with_mistral(self, query: str, context: str, query_type: QueryType = None) -> str:
        """Generate response using Mistral-7B model with optimized prompts per query type"""
        try:
            # Get query-type specific prompt
            messages = self._get_optimized_prompt(query, context, query_type)
            
            # Combine system and user prompts for Mistral format
            system_content = messages[0]["content"]
            user_content = messages[1]["content"]
            
            combined_prompt = f"<s>[INST] {system_content}\n\n{user_content} [/INST]"
            
            # Use chat_completion for Mistral model
            messages = [{"role": "user", "content": combined_prompt}]
            response = self.client.chat_completion(
                messages=messages,
                model=self.models["conversational"],
                max_tokens=200,
                temperature=0.7
            )
            
            if response and response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content.strip()
                logger.info("✅ Mistral-7B model generated response successfully")
                return content
            
            return ""
            
        except Exception as e:
            logger.error(f"Mistral-7B generation failed: {e}")
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
                    # Test Mistral and Llama models with chat_completion
                    messages = [{"role": "user", "content": "Hello, how can I help?"}]
                    result = self.client.chat_completion(
                        messages=messages,
                        model=model_name,
                        max_tokens=10
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