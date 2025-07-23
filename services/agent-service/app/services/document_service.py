"""Document processing service using LangChain."""

import logging
import threading
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from pathlib import Path

from langchain_community.document_loaders import (
    PyPDFLoader, 
    Docx2txtLoader, 
    TextLoader,
    UnstructuredFileLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config import get_settings
from app.models.documents import (
    DocumentInfo, 
    IngestRequest, 
    IngestResponse, 
    DocumentStatusResponse,
    DocumentChunk
)
from app.services.vector_service import VectorService
from app.core.utils import validate_file_path, get_file_type


logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document processing and ingestion."""
    
    def __init__(self):
        self.settings = get_settings()
        self.vector_service = VectorService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # In-memory storage for jobs and documents (in production, use a database)
        self.ingestion_jobs: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, DocumentInfo] = {}
        
        logger.info("Document service initialized")
    
    def initialize(self) -> bool:
        """Initialize the document service."""
        try:
            # Initialize vector store collection
            success = self.vector_service.initialize_collection()
            if success:
                logger.info("Document service initialized successfully")
            return success
            
        except Exception as e:
            logger.error(f"Failed to initialize document service: {e}")
            return False
    
    def _get_document_loader(self, file_path: str):
        """Get appropriate document loader based on file type."""
        file_type = get_file_type(file_path)
        
        loaders = {
            'pdf': PyPDFLoader,
            'docx': Docx2txtLoader,
            'txt': TextLoader
        }
        
        loader_class = loaders.get(file_type)
        if not loader_class:
            # Fallback to unstructured loader
            return UnstructuredFileLoader(file_path)
        
        return loader_class(file_path)
    
    def _load_document(self, file_path: str) -> List[Document]:
        """Load a single document using appropriate loader."""
        try:
            loader = self._get_document_loader(file_path)
            documents = loader.load()
            
            # Add metadata
            for doc in documents:
                doc.metadata.update({
                    'source': file_path,
                    'filename': os.path.basename(file_path),
                    'file_type': get_file_type(file_path),
                    'loaded_at': datetime.utcnow().isoformat()
                })
            
            logger.info(f"Loaded {len(documents)} pages from {file_path}")
            return documents
            
        except Exception as e:
            logger.error(f"Failed to load document {file_path}: {e}")
            raise
    
    def _split_documents(self, documents: List[Document]) -> List[Document]:
        """Split documents into chunks."""
        try:
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Split {len(documents)} documents into {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to split documents: {e}")
            raise
    
    def _process_document(self, file_path: str, document_id: str) -> DocumentInfo:
        """Process a single document through the full pipeline."""
        try:
            # Create document info
            doc_info = DocumentInfo(
                id=document_id,
                filename=os.path.basename(file_path),
                document_type=get_file_type(file_path),
                status="processing"
            )
            
            # Load document
            documents = self._load_document(file_path)
            
            # Split into chunks
            chunks = self._split_documents(documents)
            
            # Convert to document chunks
            document_chunks = []
            for i, chunk in enumerate(chunks):
                doc_chunk = DocumentChunk(
                    document_id=document_id,
                    chunk_index=i,
                    content=chunk.page_content,
                    metadata=chunk.metadata
                )
                document_chunks.append(doc_chunk)
            
            # Add to vector store
            vector_ids = self.vector_service.add_document_chunks(document_chunks)
            
            # Update document info
            doc_info.chunk_count = len(chunks)
            doc_info.vector_ids = vector_ids
            doc_info.status = "completed"
            
            logger.info(f"Successfully processed document: {file_path}")
            return doc_info
            
        except Exception as e:
            error_msg = f"Failed to process document {file_path}: {e}"
            logger.error(error_msg)
            
            # Update document info with error
            doc_info = DocumentInfo(
                id=document_id,
                filename=os.path.basename(file_path),
                document_type=get_file_type(file_path),
                status="failed",
                error_message=error_msg
            )
            return doc_info
    
    def ingest_documents(self, request: IngestRequest) -> IngestResponse:
        """Ingest multiple documents."""
        try:
            job_id = str(uuid.uuid4())
            
            # Validate file paths
            valid_files = []
            for file_path in request.file_paths:
                if validate_file_path(file_path):
                    valid_files.append(file_path)
                else:
                    logger.warning(f"Invalid file path skipped: {file_path}")
            
            if not valid_files:
                return IngestResponse(
                    job_id=job_id,
                    status="failed",
                    message="No valid files to process"
                )
            
            # Create job
            self.ingestion_jobs[job_id] = {
                "status": "processing",
                "total_files": len(valid_files),
                "processed_files": 0,
                "files": valid_files,
                "documents": [],
                "created_at": datetime.utcnow(),
                "error_message": None
            }
            
            # Start processing in background
            threading.Thread(target=self._process_ingestion_job, args=(job_id,), daemon=True).start()
            
            return IngestResponse(
                job_id=job_id,
                status="started",
                message=f"Started processing {len(valid_files)} files"
            )
            
        except Exception as e:
            logger.error(f"Failed to start document ingestion: {e}")
            return IngestResponse(
                job_id=str(uuid.uuid4()),
                status="failed",
                message=str(e)
            )
    
    def _process_ingestion_job(self, job_id: str):
        """Process ingestion job in background."""
        try:
            job = self.ingestion_jobs[job_id]
            
            for file_path in job["files"]:
                try:
                    # Generate document ID
                    document_id = str(uuid.uuid4())
                    
                    # Process document
                    doc_info = self._process_document(file_path, document_id)
                    
                    # Store document info
                    self.documents[document_id] = doc_info
                    job["documents"].append(document_id)
                    job["processed_files"] += 1
                    
                    logger.info(f"Processed file {job['processed_files']}/{job['total_files']}: {file_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to process file {file_path}: {e}")
                    job["error_message"] = str(e)
            
            # Mark job as completed
            job["status"] = "completed"
            logger.info(f"Ingestion job {job_id} completed")
            
        except Exception as e:
            logger.error(f"Ingestion job {job_id} failed: {e}")
            if job_id in self.ingestion_jobs:
                self.ingestion_jobs[job_id]["status"] = "failed"
                self.ingestion_jobs[job_id]["error_message"] = str(e)
    
    def get_document_status(self, job_id: str) -> Optional[DocumentStatusResponse]:
        """Get the status of a document ingestion job."""
        try:
            job = self.ingestion_jobs.get(job_id)
            if not job:
                return None
            
            return DocumentStatusResponse(
                job_id=job_id,
                status=job["status"],
                total_documents=job["total_files"],
                processed_documents=job["processed_files"],
                error_message=job.get("error_message")
            )
            
        except Exception as e:
            logger.error(f"Failed to get document status: {e}")
            return None
    
    def list_documents(self) -> List[DocumentInfo]:
        """List all processed documents."""
        try:
            return list(self.documents.values())
            
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            return []
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and its chunks from the vector store."""
        try:
            doc_info = self.documents.get(document_id)
            if not doc_info:
                logger.warning(f"Document not found: {document_id}")
                return False
            
            # Delete from vector store
            success = self.vector_service.delete_documents([document_id])
            
            if success:
                # Remove from local storage
                del self.documents[document_id]
                logger.info(f"Deleted document: {document_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            return False
    
    def health_check(self) -> bool:
        """Check if the document service is healthy."""
        try:
            # Check vector service health
            vector_health = self.vector_service.health_check()
            return vector_health
            
        except Exception as e:
            logger.error(f"Document service health check failed: {e}")
            return False 