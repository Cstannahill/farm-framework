# apps/api/src/models/ai.py
"""
AI-related database models for FARM Framework
Using Beanie ODM with Pydantic v2 for MongoDB
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import Field, BaseModel
from beanie import Document, Indexed
from pymongo import IndexModel, ASCENDING, DESCENDING

# =============================================================================
# Base AI Models
# =============================================================================


class ChatMessage(BaseModel):
    """Individual chat message"""

    role: Literal["system", "user", "assistant"] = Field(
        ..., description="Message role"
    )
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional metadata"
    )


class AIProviderInfo(BaseModel):
    """AI provider information"""

    name: str = Field(..., description="Provider name (ollama, openai, etc.)")
    model: str = Field(..., description="Model name")
    version: Optional[str] = Field(default=None, description="Model version")
    config: Optional[Dict[str, Any]] = Field(
        default=None, description="Provider-specific config"
    )


class UsageStats(BaseModel):
    """Token/resource usage statistics"""

    prompt_tokens: Optional[int] = Field(default=None, description="Input tokens used")
    completion_tokens: Optional[int] = Field(
        default=None, description="Output tokens used"
    )
    total_tokens: Optional[int] = Field(default=None, description="Total tokens used")
    duration_ms: Optional[int] = Field(
        default=None, description="Request duration in milliseconds"
    )
    cost: Optional[float] = Field(default=None, description="Cost in USD")


# =============================================================================
# Main Document Models (MongoDB Collections)
# =============================================================================


class AIModel(Document):
    """
    AI Model registry - tracks available models and their capabilities
    Collection: ai_models
    """

    name: Indexed(str) = Field(..., description="Model name")
    provider: Indexed(str) = Field(
        ..., description="Provider (ollama, openai, huggingface)"
    )
    family: Optional[str] = Field(
        default=None, description="Model family (llama, gpt, etc.)"
    )
    size: Optional[str] = Field(default=None, description="Model size (7B, 70B, etc.)")
    description: Optional[str] = Field(default=None, description="Model description")

    # Capabilities
    capabilities: List[str] = Field(
        default_factory=list, description="Model capabilities"
    )
    context_length: Optional[int] = Field(
        default=None, description="Maximum context length"
    )
    max_tokens: Optional[int] = Field(default=None, description="Maximum output tokens")

    # Status and metadata
    status: Literal["available", "downloading", "error", "disabled"] = Field(
        default="available"
    )
    local_path: Optional[str] = Field(
        default=None, description="Local file path for downloaded models"
    )
    download_url: Optional[str] = Field(default=None, description="Download URL")
    checksum: Optional[str] = Field(
        default=None, description="File checksum for verification"
    )

    # Performance metrics
    avg_tokens_per_second: Optional[float] = Field(
        default=None, description="Average generation speed"
    )
    memory_usage_mb: Optional[int] = Field(
        default=None, description="Memory usage in MB"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = Field(
        default=None, description="Last usage timestamp"
    )

    class Settings:
        collection = "ai_models"
        indexes = [
            IndexModel([("provider", ASCENDING), ("name", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("capabilities", ASCENDING)]),
            IndexModel([("last_used", DESCENDING)]),
        ]


class Conversation(Document):
    """
    AI Conversation - represents a chat session
    Collection: conversations
    """

    title: Optional[str] = Field(default=None, description="Conversation title")
    messages: List[ChatMessage] = Field(
        default_factory=list, description="Chat messages"
    )

    # AI Configuration
    provider_info: AIProviderInfo = Field(..., description="AI provider and model used")
    system_prompt: Optional[str] = Field(default=None, description="System prompt")
    temperature: float = Field(default=0.7, description="Sampling temperature")
    max_tokens: Optional[int] = Field(default=None, description="Max tokens limit")

    # Metadata
    user_id: Optional[str] = Field(default=None, description="User ID if authenticated")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    tags: List[str] = Field(default_factory=list, description="Conversation tags")

    # Status and stats
    status: Literal["active", "completed", "archived", "error"] = Field(
        default="active"
    )
    message_count: int = Field(default=0, description="Total message count")
    total_usage: UsageStats = Field(
        default_factory=UsageStats, description="Cumulative usage stats"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: Optional[datetime] = Field(
        default=None, description="Last message timestamp"
    )

    class Settings:
        collection = "conversations"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("session_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("provider_info.provider", ASCENDING)]),
            IndexModel([("tags", ASCENDING)]),
            IndexModel([("last_message_at", DESCENDING)]),
        ]


class AIInferenceLog(Document):
    """
    AI Inference Log - tracks individual AI API calls for monitoring and analytics
    Collection: ai_inference_logs
    """

    # Request details
    provider_info: AIProviderInfo = Field(..., description="Provider and model info")
    request_type: Literal["chat", "completion", "embedding", "image"] = Field(
        ..., description="Type of request"
    )

    # Input/Output
    input_text: str = Field(..., description="Input prompt or text")
    output_text: Optional[str] = Field(default=None, description="Generated output")
    input_tokens: Optional[int] = Field(default=None, description="Input token count")
    output_tokens: Optional[int] = Field(default=None, description="Output token count")

    # Performance and quality
    duration_ms: int = Field(..., description="Request duration in milliseconds")
    success: bool = Field(default=True, description="Whether request succeeded")
    error_message: Optional[str] = Field(
        default=None, description="Error message if failed"
    )

    # Context
    conversation_id: Optional[str] = Field(
        default=None, description="Associated conversation ID"
    )
    user_id: Optional[str] = Field(default=None, description="User ID if authenticated")
    session_id: Optional[str] = Field(default=None, description="Session identifier")

    # Configuration used
    temperature: Optional[float] = Field(
        default=None, description="Temperature setting"
    )
    max_tokens: Optional[int] = Field(default=None, description="Max tokens setting")
    system_prompt: Optional[str] = Field(default=None, description="System prompt used")

    # Usage and cost tracking
    usage_stats: UsageStats = Field(
        default_factory=UsageStats, description="Detailed usage stats"
    )

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "ai_inference_logs"
        indexes = [
            IndexModel([("created_at", DESCENDING)]),
            IndexModel(
                [("provider_info.provider", ASCENDING), ("created_at", DESCENDING)]
            ),
            IndexModel([("success", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("conversation_id", ASCENDING)]),
            IndexModel([("request_type", ASCENDING)]),
        ]


class AIModelUsage(Document):
    """
    AI Model Usage Analytics - aggregated usage statistics by time period
    Collection: ai_model_usage
    """

    # Time period
    date: Indexed(datetime) = Field(..., description="Date for this usage record")
    hour: Optional[int] = Field(
        default=None, description="Hour (0-23) for hourly stats"
    )

    # Model/Provider info
    provider: Indexed(str) = Field(..., description="AI provider")
    model: Indexed(str) = Field(..., description="Model name")

    # Usage metrics
    request_count: int = Field(default=0, description="Number of requests")
    success_count: int = Field(default=0, description="Number of successful requests")
    error_count: int = Field(default=0, description="Number of failed requests")

    total_input_tokens: int = Field(default=0, description="Total input tokens")
    total_output_tokens: int = Field(default=0, description="Total output tokens")
    total_cost: float = Field(default=0.0, description="Total cost in USD")

    avg_duration_ms: Optional[float] = Field(
        default=None, description="Average response time"
    )
    unique_users: int = Field(default=0, description="Number of unique users")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "ai_model_usage"
        indexes = [
            IndexModel(
                [("date", DESCENDING), ("provider", ASCENDING), ("model", ASCENDING)]
            ),
            IndexModel([("provider", ASCENDING), ("date", DESCENDING)]),
        ]


# =============================================================================
# Utility Functions
# =============================================================================


async def get_available_models(provider: Optional[str] = None) -> List[AIModel]:
    """Get list of available AI models"""
    query = {"status": "available"}
    if provider:
        query["provider"] = provider

    return (
        await AIModel.find(query)
        .sort([("last_used", DESCENDING), ("name", ASCENDING)])
        .to_list()
    )


async def log_ai_inference(
    provider: str,
    model: str,
    request_type: str,
    input_text: str,
    output_text: Optional[str] = None,
    duration_ms: int = 0,
    success: bool = True,
    error_message: Optional[str] = None,
    **kwargs,
) -> AIInferenceLog:
    """Log an AI inference request"""

    log_entry = AIInferenceLog(
        provider_info=AIProviderInfo(name=provider, model=model),
        request_type=request_type,
        input_text=input_text,
        output_text=output_text,
        duration_ms=duration_ms,
        success=success,
        error_message=error_message,
        **kwargs,
    )

    return await log_entry.insert()


async def create_conversation(
    provider: str,
    model: str,
    title: Optional[str] = None,
    system_prompt: Optional[str] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Conversation:
    """Create a new AI conversation"""

    conversation = Conversation(
        title=title,
        provider_info=AIProviderInfo(name=provider, model=model),
        system_prompt=system_prompt,
        user_id=user_id,
        **kwargs,
    )

    return await conversation.insert()


async def add_message_to_conversation(
    conversation_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Conversation:
    """Add a message to an existing conversation"""

    conversation = await Conversation.get(conversation_id)
    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    message = ChatMessage(role=role, content=content, metadata=metadata)

    conversation.messages.append(message)
    conversation.message_count = len(conversation.messages)
    conversation.last_message_at = datetime.utcnow()
    conversation.updated_at = datetime.utcnow()

    await conversation.save()
    return conversation


# Export all models for Beanie initialization
__all__ = [
    "AIModel",
    "Conversation",
    "AIInferenceLog",
    "AIModelUsage",
    "ChatMessage",
    "AIProviderInfo",
    "UsageStats",
    "get_available_models",
    "log_ai_inference",
    "create_conversation",
    "add_message_to_conversation",
]
