"""Utility functions for the Agent Service."""

# import sys
# import os
# sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import logging
import os
from typing import List, Dict, Optional
from datetime import datetime
import time

from generated import common_pb2, chat_pb2, documents_pb2
from app.models.chat import ChatMessage, ChatRequest, ChatResponse
from app.models.documents import DocumentInfo, IngestRequest, IngestResponse, DocumentStatusResponse


logger = logging.getLogger(__name__)


# Protobuf Conversion Functions

def pydantic_to_protobuf_status(success: bool, message: str = "", code: int = 0) -> common_pb2.Status:
    """Convert Python values to protobuf Status."""
    return common_pb2.Status(
        success=success,
        message=message,
        code=code
    )


def pydantic_chat_message_to_protobuf(msg: ChatMessage) -> chat_pb2.ChatMessage:
    """Convert Pydantic ChatMessage to protobuf."""
    return chat_pb2.ChatMessage(
        role=msg.role,
        content=msg.content,
        timestamp=int(msg.timestamp.timestamp()),
        session_id=msg.session_id or "",
        sources=msg.sources,
        tool_calls=msg.tool_calls
    )


def protobuf_chat_request_to_pydantic(request: chat_pb2.ChatRequest) -> ChatRequest:
    """Convert protobuf ChatRequest to Pydantic."""
    return ChatRequest(
        message=request.message,
        session_id=request.session_id if request.session_id else None,
        use_tools=request.use_tools,
        max_tokens=request.max_tokens if request.max_tokens > 0 else None
    )


def pydantic_chat_response_to_protobuf(response: ChatResponse) -> chat_pb2.ChatResponse:
    """Convert Pydantic ChatResponse to protobuf."""
    return chat_pb2.ChatResponse(
        response=response.response,
        session_id=response.session_id,
        sources=response.sources,
        tool_calls=response.tool_calls,
        reasoning=response.reasoning or "",
        status=pydantic_to_protobuf_status(True, "Success")
    )


def pydantic_document_info_to_protobuf(doc: DocumentInfo) -> documents_pb2.DocumentInfo:
    """Convert Pydantic DocumentInfo to protobuf."""
    return documents_pb2.DocumentInfo(
        id=doc.id,
        filename=doc.filename,
        document_type=doc.document_type,
        upload_date=int(doc.upload_date.timestamp()),
        chunk_count=doc.chunk_count,
        status=doc.status
    )


def protobuf_ingest_request_to_pydantic(request: documents_pb2.IngestRequest) -> IngestRequest:
    """Convert protobuf IngestRequest to Pydantic."""
    return IngestRequest(
        file_paths=list(request.file_paths),
        force_reingest=request.force_reingest
    )


def pydantic_ingest_response_to_protobuf(response: IngestResponse) -> documents_pb2.IngestResponse:
    """Convert Pydantic IngestResponse to protobuf."""
    return documents_pb2.IngestResponse(
        job_id=response.job_id,
        status=pydantic_to_protobuf_status(True, response.message)
    )


def pydantic_document_status_to_protobuf(status: DocumentStatusResponse) -> documents_pb2.StatusResponse:
    """Convert Pydantic DocumentStatusResponse to protobuf."""
    return documents_pb2.StatusResponse(
        job_id=status.job_id,
        status=status.status,
        total_documents=status.total_documents,
        processed_documents=status.processed_documents,
        error_message=status.error_message or ""
    )


# Utility Functions

def generate_session_id() -> str:
    """Generate a unique session ID."""
    timestamp = int(time.time())
    return f"session_{timestamp}"


def validate_file_path(file_path: str) -> bool:
    """Validate if a file path is safe and exists."""
    
    # Basic validation - can be expanded
    if not file_path or not isinstance(file_path, str):
        return False
    
    # Check if file exists
    if not os.path.exists(file_path):
        logger.warning(f"File does not exist: {file_path}")
        return False
    
    # Check file extension
    allowed_extensions = {'.pdf', '.docx', '.txt', '.doc'}
    _, ext = os.path.splitext(file_path.lower())
    if ext not in allowed_extensions:
        logger.warning(f"Unsupported file type: {ext}")
        return False
    
    return True


def get_file_type(file_path: str) -> str:
    """Get file type from file path."""
    _, ext = os.path.splitext(file_path.lower())
    
    type_mapping = {
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.doc': 'docx',
        '.txt': 'txt'
    }
    
    return type_mapping.get(ext, 'unknown')


def setup_logging(log_level: str = "INFO") -> None:
    """Set up structured logging."""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
        ]
    )
    
    # Suppress some noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)


def create_error_response(error_message: str, code: int = 500) -> common_pb2.Status:
    """Create a standardized error response."""
    return common_pb2.Status(
        success=False,
        message=error_message,
        code=code
    ) 