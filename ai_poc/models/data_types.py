"""
Data types for Financial AI Assistant
"""
from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class QueryType(str, Enum):
    """Types of financial queries the AI can handle"""
    SPENDING_SUMMARY = "spending_summary"
    BUDGET_STATUS = "budget_status" 
    BALANCE_INQUIRY = "balance_inquiry"
    TRANSACTION_SEARCH = "transaction_search"
    UNKNOWN = "unknown"

class ProcessingType(str, Enum):
    """Where the AI processing occurs"""
    ON_DEVICE = "on_device"
    CLOUD = "cloud"
    HUGGINGFACE = "huggingface"

class Transaction(BaseModel):
    """Financial transaction data"""
    id: int
    amount: float  # Amount in dollars (converted from cents)
    description: str
    category_id: int
    category_name: str
    category_color: str
    transaction_type: Literal["expense", "income"]
    date: datetime
    created_at: datetime

class Budget(BaseModel):
    """Budget data with category information"""
    id: int
    category_id: int
    category_name: str
    category_color: str
    amount: float  # Budget limit in dollars
    spent_amount: float
    remaining_amount: float
    percentage_used: float
    period_start: datetime
    period_end: datetime

class Category(BaseModel):
    """Expense category"""
    id: int
    name: str
    color: str
    icon: str

class AIQueryContext(BaseModel):
    """Context for AI queries"""
    session_id: str
    user_id: str = "default"
    timestamp: datetime
    last_query_type: Optional[QueryType] = None
    relevant_timeframe: Optional[Dict[str, datetime]] = None
    focus_categories: List[str] = []
    focus_budgets: List[int] = []
    conversation_history: List[str] = []

class FinancialData(BaseModel):
    """Financial data response"""
    transactions: Optional[List[Transaction]] = None
    budgets: Optional[List[Budget]] = None
    categories: Optional[List[str]] = None
    amount: Optional[float] = None
    timeframe: Optional[str] = None
    budget_status: Optional[Dict[str, Any]] = None

class EmbeddedComponentData(BaseModel):
    """Data for embedded financial components in chat"""
    component_type: Literal["BudgetCard", "TransactionList", "CategoryBreakdownChart"]
    title: str
    data: Dict[str, Any]
    size: Literal["compact", "full"] = "compact"

class AIResponse(BaseModel):
    """AI response with embedded financial data"""
    message: str
    confidence: float
    query_type: QueryType
    processing_type: ProcessingType
    embedded_data: Optional[EmbeddedComponentData] = None
    suggested_actions: List[str] = []
    conversation_context: Optional[AIQueryContext] = None
    model_used: Optional[str] = None

class ConversationMessage(BaseModel):
    """Individual message in conversation"""
    id: str
    type: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    embedded_data: Optional[EmbeddedComponentData] = None
    processing_type: ProcessingType = ProcessingType.ON_DEVICE
    model_used: Optional[str] = None