from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class DocumentInfo(BaseModel):
    """Document information model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Document ID")
    filename: str = Field(..., description="Original filename")
    document_type: str = Field(..., description="Document type (pdf, docx, txt)")
    upload_date: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")
    chunk_count: int = Field(default=0, description="Number of chunks created")
    status: str = Field(default="pending", description="Processing status")
    vector_ids: List[str] = Field(default_factory=list, description="Qdrant vector IDs")
    error_message: Optional[str] = Field(None, description="Error message if processing failed")


class IngestRequest(BaseModel):
    """Document ingestion request model."""
    file_paths: List[str] = Field(..., description="List of file paths to ingest")
    force_reingest: bool = Field(default=False, description="Force re-ingestion of existing files")


class IngestResponse(BaseModel):
    """Document ingestion response model."""
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Ingestion job ID")
    status: str = Field(default="started", description="Job status")
    message: str = Field(default="", description="Status message")


class DocumentStatusRequest(BaseModel):
    """Document status request model."""
    job_id: str = Field(..., description="Ingestion job ID")


class DocumentStatusResponse(BaseModel):
    """Document status response model."""
    job_id: str = Field(..., description="Ingestion job ID")
    status: str = Field(..., description="Job status: 'processing', 'completed', 'failed'")
    total_documents: int = Field(default=0, description="Total documents to process")
    processed_documents: int = Field(default=0, description="Documents processed so far")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class ListDocumentsRequest(BaseModel):
    """List documents request model."""
    # Empty for now, could add filtering options later
    pass


class ListDocumentsResponse(BaseModel):
    """List documents response model."""
    documents: List[DocumentInfo] = Field(default_factory=list, description="List of documents")


class DeleteDocumentRequest(BaseModel):
    """Delete document request model."""
    document_id: str = Field(..., description="Document ID to delete")


class DocumentChunk(BaseModel):
    """Document chunk model for internal processing."""
    document_id: str = Field(..., description="Parent document ID")
    chunk_index: int = Field(..., description="Chunk index within document")
    content: str = Field(..., description="Chunk content")
    metadata: dict = Field(default_factory=dict, description="Chunk metadata")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding") 