"""
Query Processor for Financial AI Assistant
Handles parsing and processing of natural language financial queries
"""
import re
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from models.data_types import QueryType, FinancialData

logger = logging.getLogger(__name__)

class QueryProcessor:
    """Processes natural language queries about finances"""
    
    def __init__(self):
        # Category keywords for matching
        self.category_keywords = {
            "groceries": ["grocery", "groceries", "food", "supermarket", "market"],
            "dining": ["dining", "restaurant", "food", "eating", "lunch", "dinner", "takeout"],
            "transportation": ["transport", "gas", "fuel", "uber", "taxi", "bus", "train", "car"],
            "entertainment": ["entertainment", "movie", "concert", "game", "streaming", "fun"],
            "utilities": ["utilities", "electric", "water", "internet", "phone", "bill"],
            "healthcare": ["health", "medical", "doctor", "pharmacy", "medicine", "dental"],
            "shopping": ["shopping", "clothes", "electronics", "purchase", "buy", "store"],
            "travel": ["travel", "vacation", "hotel", "flight", "trip", "holiday"]
        }
        
        # Time period keywords
        self.time_keywords = {
            "today": timedelta(days=0),
            "yesterday": timedelta(days=1),
            "this week": timedelta(days=7),
            "last week": timedelta(days=14),
            "this month": timedelta(days=30),
            "last month": timedelta(days=60),
            "this year": timedelta(days=365),
            "last year": timedelta(days=730)
        }
    
    def parse_query(self, query: str) -> Dict[str, Any]:
        """Parse natural language query into structured data"""
        query_lower = query.lower()
        parsed = {
            "original_query": query,
            "category": self._extract_category(query_lower),
            "timeframe": self._extract_timeframe(query_lower),
            "amount_mentioned": self._extract_amount(query_lower),
            "keywords": self._extract_keywords(query_lower)
        }
        
        logger.info(f"Parsed query: {parsed}")
        return parsed
    
    def _extract_category(self, query: str) -> Optional[str]:
        """Extract category from query text"""
        for category, keywords in self.category_keywords.items():
            if any(keyword in query for keyword in keywords):
                return category
        return None
    
    def _extract_timeframe(self, query: str) -> Optional[Dict[str, Any]]:
        """Extract time period from query text"""
        for time_phrase, delta in self.time_keywords.items():
            if time_phrase in query:
                end_date = datetime.now()
                
                if time_phrase in ["yesterday", "last week", "last month", "last year"]:
                    # For "last" periods, we want the previous period
                    if time_phrase == "yesterday":
                        start_date = end_date - timedelta(days=1)
                        end_date = start_date + timedelta(days=1)
                    elif time_phrase == "last week":
                        start_date = end_date - timedelta(days=14)
                        end_date = start_date + timedelta(days=7)
                    elif time_phrase == "last month":
                        start_date = end_date - timedelta(days=60)
                        end_date = start_date + timedelta(days=30)
                    elif time_phrase == "last year":
                        start_date = end_date - timedelta(days=730)
                        end_date = start_date + timedelta(days=365)
                else:
                    # For "this" periods, we want from start of period to now
                    start_date = end_date - delta
                
                return {
                    "phrase": time_phrase,
                    "start_date": start_date,
                    "end_date": end_date,
                    "value": time_phrase
                }
        
        # Check for specific date mentions
        date_patterns = [
            r'in (\w+)',  # "in January"
            r'(\d+) days? ago',  # "5 days ago"
            r'(\d+) weeks? ago',  # "2 weeks ago"
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, query)
            if match:
                if "days ago" in pattern:
                    days = int(match.group(1))
                    start_date = datetime.now() - timedelta(days=days)
                    return {
                        "phrase": f"{days} days ago",
                        "start_date": start_date,
                        "end_date": datetime.now(),
                        "value": f"last_{days}_days"
                    }
                elif "weeks ago" in pattern:
                    weeks = int(match.group(1))
                    start_date = datetime.now() - timedelta(weeks=weeks)
                    return {
                        "phrase": f"{weeks} weeks ago",
                        "start_date": start_date,
                        "end_date": datetime.now(),
                        "value": f"last_{weeks}_weeks"
                    }
        
        return None
    
    def _extract_amount(self, query: str) -> Optional[float]:
        """Extract dollar amounts from query text"""
        # Look for patterns like "$100", "100 dollars", "$100.50"
        amount_patterns = [
            r'\$(\d+(?:\.\d{2})?)',  # $100 or $100.50
            r'(\d+(?:\.\d{2})?) dollars?',  # 100 dollars
            r'(\d+(?:\.\d{2})?) bucks?',  # 100 bucks
        ]
        
        for pattern in amount_patterns:
            match = re.search(pattern, query)
            if match:
                return float(match.group(1))
        
        return None
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract relevant keywords from query"""
        financial_keywords = [
            "spent", "spend", "spending", "expense", "cost", "paid", "purchase", "bought",
            "budget", "budgets", "limit", "allowance", "allocated",
            "balance", "total", "sum", "amount", "money",
            "transaction", "transactions", "purchase", "purchases", "payment", "payments",
            "category", "categories", "type", "types",
            "over", "under", "exceeded", "within", "left", "remaining"
        ]
        
        found_keywords = []
        for keyword in financial_keywords:
            if keyword in query:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def generate_follow_up_questions(self, query_type: QueryType, parsed_query: Dict[str, Any]) -> List[str]:
        """Generate relevant follow-up questions based on query type"""
        follow_ups = []
        
        if query_type == QueryType.SPENDING_SUMMARY:
            follow_ups = [
                "Would you like to see a breakdown by category?",
                "Do you want to compare this to your budget?",
                "Should I show you the specific transactions?"
            ]
            
            if not parsed_query.get("timeframe"):
                follow_ups.insert(0, "Which time period are you interested in?")
        
        elif query_type == QueryType.BUDGET_STATUS:
            follow_ups = [
                "Would you like tips for staying on budget?",
                "Should I show you which categories are closest to their limits?",
                "Do you want to see your spending trends?"
            ]
        
        elif query_type == QueryType.TRANSACTION_SEARCH:
            follow_ups = [
                "Would you like me to filter by amount range?",
                "Should I group these by category?",
                "Do you want to see similar transactions?"
            ]
        
        elif query_type == QueryType.BALANCE_INQUIRY:
            follow_ups = [
                "Would you like a spending forecast for the rest of the month?",
                "Should I compare this to previous periods?",
                "Do you want budget recommendations?"
            ]
        
        return follow_ups[:3]  # Limit to 3 follow-ups
    
    def extract_category_filter(self, query: str) -> Optional[str]:
        """Extract category filter from query for database filtering"""
        category = self._extract_category(query.lower())
        if category:
            # Map internal category names to display names
            category_mapping = {
                "groceries": "Groceries",
                "dining": "Dining", 
                "transportation": "Transportation",
                "entertainment": "Entertainment",
                "utilities": "Utilities",
                "healthcare": "Healthcare",
                "shopping": "Shopping",
                "travel": "Travel"
            }
            return category_mapping.get(category, category.title())
        return None
    
    def is_comparative_query(self, query: str) -> bool:
        """Check if query is asking for comparisons"""
        comparison_words = [
            "compare", "vs", "versus", "against", "difference", "more", "less", 
            "higher", "lower", "better", "worse", "than", "last", "previous"
        ]
        query_lower = query.lower()
        return any(word in query_lower for word in comparison_words)
    
    def extract_comparison_timeframes(self, query: str) -> Optional[Dict[str, Any]]:
        """Extract multiple timeframes for comparison queries"""
        query_lower = query.lower()
        
        comparison_patterns = [
            (r'this month vs last month', ('this month', 'last month')),
            (r'this week vs last week', ('this week', 'last week')),
            (r'this year vs last year', ('this year', 'last year')),
        ]
        
        for pattern, timeframes in comparison_patterns:
            if re.search(pattern, query_lower):
                result = {}
                for i, timeframe in enumerate(timeframes):
                    tf = self._extract_timeframe(timeframe)
                    if tf:
                        result[f'period_{i+1}'] = tf
                
                if len(result) == 2:
                    return result
        
        return None