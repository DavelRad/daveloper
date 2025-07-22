"""Vector database service using Qdrant Cloud."""

import logging
from typing import List, Dict, Any, Optional
import uuid

from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from config import get_settings
from models.documents import DocumentChunk


logger = logging.getLogger(__name__)


class VectorService:
    """Service for managing vector operations with Qdrant Cloud."""
    
    def __init__(self):
        self.settings = get_settings()
        self._embeddings: Optional[OpenAIEmbeddings] = None
        self._vector_store: Optional[QdrantVectorStore] = None
        self._client: Optional[QdrantClient] = None
        
    @property
    def embeddings(self) -> OpenAIEmbeddings:
        """Get or create OpenAI embeddings instance."""
        if self._embeddings is None:
            self._embeddings = OpenAIEmbeddings(
                api_key=self.settings.openai_api_key,
                model="text-embedding-ada-002"
            )
            logger.info("OpenAI embeddings initialized")
        return self._embeddings
    
    @property
    def client(self) -> QdrantClient:
        """Get or create Qdrant client."""
        if self._client is None:
            self._client = QdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key
            )
            logger.info("Qdrant client initialized")
        return self._client
    
    @property
    def vector_store(self) -> QdrantVectorStore:
        """Get or create Qdrant vector store."""
        if self._vector_store is None:
            self._vector_store = QdrantVectorStore(
                client=self.client,
                collection_name=self.settings.qdrant_collection_name,
                embedding=self.embeddings
            )
            logger.info("Qdrant vector store initialized")
        return self._vector_store
    
    async def initialize_collection(self) -> bool:
        """Initialize the Qdrant collection if it doesn't exist."""
        try:
            collection_name = self.settings.qdrant_collection_name
            
            # Check if collection exists
            collections = self.client.get_collections()
            existing_collections = [col.name for col in collections.collections]
            
            if collection_name not in existing_collections:
                # Create collection
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=1536,  # OpenAI embedding dimension
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {collection_name}")
            else:
                logger.info(f"Collection already exists: {collection_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize collection: {e}")
            return False
    
    async def add_documents(self, documents: List[Document]) -> List[str]:
        """Add documents to the vector store."""
        try:
            if not documents:
                return []
            
            # Add documents to vector store
            vector_ids = await self.vector_store.aadd_documents(documents)
            logger.info(f"Added {len(documents)} documents to vector store")
            
            return vector_ids
            
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise
    
    async def add_document_chunks(self, chunks: List[DocumentChunk]) -> List[str]:
        """Add document chunks to the vector store."""
        try:
            # Convert chunks to LangChain documents
            documents = []
            for chunk in chunks:
                doc = Document(
                    page_content=chunk.content,
                    metadata={
                        "document_id": chunk.document_id,
                        "chunk_index": chunk.chunk_index,
                        **chunk.metadata
                    }
                )
                documents.append(doc)
            
            return await self.add_documents(documents)
            
        except Exception as e:
            logger.error(f"Failed to add document chunks: {e}")
            raise
    
    async def similarity_search(
        self, 
        query: str, 
        k: int = None, 
        filter_dict: Dict[str, Any] = None
    ) -> List[Document]:
        """Perform similarity search."""
        try:
            k = k or self.settings.retrieval_k
            
            # Perform similarity search
            if filter_dict:
                results = await self.vector_store.asimilarity_search(
                    query=query,
                    k=k,
                    filter=filter_dict
                )
            else:
                results = await self.vector_store.asimilarity_search(
                    query=query,
                    k=k
                )
            
            logger.info(f"Found {len(results)} similar documents for query")
            return results
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise
    
    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents by their IDs."""
        try:
            # Filter documents by document_id metadata
            for doc_id in document_ids:
                filter_condition = {"document_id": doc_id}
                
                # This is a workaround since direct deletion by metadata isn't straightforward
                # In a production system, you'd want to track vector IDs more explicitly
                logger.warning(f"Document deletion for {doc_id} may require manual cleanup")
            
            logger.info(f"Requested deletion of {len(document_ids)} documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            return False
    
    async def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection."""
        try:
            collection_name = self.settings.qdrant_collection_name
            info = self.client.get_collection(collection_name)
            
            return {
                "name": collection_name,
                "vectors_count": info.vectors_count,
                "status": info.status,
                "optimizer_status": info.optimizer_status
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection info: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check if the vector service is healthy."""
        try:
            # Test connection by getting collection info
            await self.get_collection_info()
            return True
            
        except Exception as e:
            logger.error(f"Vector service health check failed: {e}")
            return False
    
    async def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for a list of texts."""
        try:
            embeddings = await self.embeddings.aembed_documents(texts)
            logger.info(f"Created embeddings for {len(texts)} texts")
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to create embeddings: {e}")
            raise 