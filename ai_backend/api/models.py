"""
API Models for FastAPI Backend
Defines request/response models for the AI Assistant API
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class QueryType(str, Enum):
    """Types of financial queries"""
    SPENDING_SUMMARY = "spending_summary"
    BUDGET_STATUS = "budget_status"
    TRANSACTION_SEARCH = "transaction_search"
    BALANCE_INQUIRY = "balance_inquiry"
    CATEGORY_ANALYSIS = "category_analysis"
    GOAL_PROGRESS = "goal_progress"
    UNKNOWN = "unknown"

class ProcessingType(str, Enum):
    """Types of AI processing"""
    HUGGINGFACE = "huggingface"
    ON_DEVICE = "on_device"
    CLOUD = "cloud"
    HYBRID = "hybrid"

class ComponentType(str, Enum):
    """Types of embedded UI components"""
    CATEGORY_BREAKDOWN_CHART = "CategoryBreakdownChart"
    BUDGET_CARD = "BudgetCard"
    TRANSACTION_LIST = "TransactionList"
    SPENDING_TREND_CHART = "SpendingTrendChart"
    GOAL_PROGRESS_CARD = "GoalProgressCard"

class AIQueryRequest(BaseModel):
    """Request model for AI queries"""
    query: str = Field(..., description="Natural language query from user")
    session_id: Optional[str] = Field(None, description="Session ID for conversation context")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context data")
    user_id: Optional[str] = Field(None, description="User ID for personalization")

class EmbeddedComponentData(BaseModel):
    """Data for embedded UI components"""
    component_type: ComponentType = Field(..., description="Type of UI component to render")
    title: str = Field(..., description="Title for the component")
    data: Dict[str, Any] = Field(..., description="Component-specific data")
    size: str = Field(default="compact", description="Component size (compact, medium, large)")

class AIQueryContext(BaseModel):
    """Context information for AI queries"""
    session_id: str = Field(..., description="Unique session identifier")
    timestamp: datetime = Field(default_factory=datetime.now, description="Request timestamp")
    conversation_history: List[str] = Field(default_factory=list, description="Previous queries in conversation")
    last_query_type: Optional[QueryType] = Field(None, description="Type of the last query")

class AIQueryResponse(BaseModel):
    """Response model for AI queries"""
    message: str = Field(..., description="AI-generated response message")
    confidence: float = Field(..., description="Confidence score (0.0-1.0)")
    query_type: QueryType = Field(..., description="Detected query type")
    processing_type: ProcessingType = Field(..., description="Type of processing used")
    embedded_data: Optional[EmbeddedComponentData] = Field(None, description="Optional embedded component data")
    suggested_actions: List[str] = Field(default_factory=list, description="Suggested follow-up actions")
    conversation_context: Optional[AIQueryContext] = Field(None, description="Updated conversation context")
    model_used: Optional[str] = Field(None, description="AI model used for processing")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")

class APIHealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status (healthy, unhealthy, degraded)")
    message: str = Field(..., description="Status message")
    version: str = Field(..., description="API version")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Response timestamp")
    components: Optional[Dict[str, str]] = Field(default_factory=dict, description="Component health status")

class DatabaseStatsResponse(BaseModel):
    """Database statistics response"""
    total_transactions: int = Field(..., description="Total number of transactions")
    total_categories: int = Field(..., description="Total number of categories")
    total_budgets: int = Field(..., description="Total number of budgets")
    date_range: Dict[str, Optional[str]] = Field(..., description="Date range of data")
    last_transaction_date: Optional[datetime] = Field(None, description="Date of most recent transaction")

class ConversationHistoryResponse(BaseModel):
    """Conversation history response"""
    session_id: str = Field(..., description="Session identifier")
    exchanges: List[Dict[str, Any]] = Field(..., description="List of conversation exchanges")
    total_exchanges: int = Field(..., description="Total number of exchanges")
    session_start: datetime = Field(..., description="Session start time")

class SystemTestResponse(BaseModel):
    """System test results response"""
    overall_status: str = Field(..., description="Overall system status")
    database_status: bool = Field(..., description="Database connectivity status")
    huggingface_status: Dict[str, bool] = Field(..., description="HuggingFace model status")
    query_processor_status: bool = Field(..., description="Query processor status")
    test_timestamp: datetime = Field(default_factory=datetime.now, description="Test execution timestamp")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional test details")

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")

# Request validation models
class SessionClearRequest(BaseModel):
    """Request to clear conversation history"""
    session_id: Optional[str] = Field(None, description="Session ID to clear (all if not provided)")

class DatabaseQueryRequest(BaseModel):
    """Request for database queries"""
    query_type: str = Field(..., description="Type of database query")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Query parameters")
    limit: Optional[int] = Field(100, description="Result limit")
    offset: Optional[int] = Field(0, description="Result offset")