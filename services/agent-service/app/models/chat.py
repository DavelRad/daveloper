from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChatMessage(BaseModel):
    """Chat message model."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    session_id: Optional[str] = Field(None, description="Session identifier")
    sources: List[str] = Field(default_factory=list, description="Document sources used")
    tool_calls: List[str] = Field(default_factory=list, description="Tools used in response")


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., description="User message")
    session_id: Optional[str] = Field(None, description="Session identifier")
    use_tools: bool = Field(default=True, description="Allow tool use")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens in response")


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str = Field(..., description="Assistant response")
    session_id: str = Field(..., description="Session identifier")
    sources: List[str] = Field(default_factory=list, description="Document sources used")
    tool_calls: List[str] = Field(default_factory=list, description="Tools executed")
    reasoning: Optional[str] = Field(None, description="Agent reasoning (debug)")


class GetChatHistoryRequest(BaseModel):
    """Get chat history request model."""
    session_id: str = Field(..., description="Session identifier")


class GetChatHistoryResponse(BaseModel):
    """Get chat history response model."""
    messages: List[ChatMessage] = Field(default_factory=list, description="Chat messages")


class ClearChatHistoryRequest(BaseModel):
    """Clear chat history request model."""
    session_id: str = Field(..., description="Session identifier") 