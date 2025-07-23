"""RAG (Retrieval Augmented Generation) service for Davel's agent."""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from app.config import get_settings
from app.services.vector_service import VectorService
from app.prompts.rag_prompts import (
    get_rag_prompt,
    get_chat_prompt,
    get_technical_prompt,
    get_project_prompt,
    DAVEL_SYSTEM_MESSAGE
)

logger = logging.getLogger(__name__)


class RAGService:
    """RAG service for question answering with Davel's persona."""
    
    def __init__(self):
        self.settings = get_settings()
        self.vector_service = VectorService()
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens=self.settings.max_tokens,
            api_key=self.settings.openai_api_key
        )
        self._initialized = False
        
    def initialize(self) -> bool:
        """Initialize the RAG service."""
        try:
            # Initialize vector service
            success = self.vector_service.initialize_collection()
            if success:
                self._initialized = True
                logger.info("RAG service initialized successfully")
            return success
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            return False
    
    def _retrieve_context(self, question: str, k: int = None) -> Tuple[List[Document], List[str]]:
        """Retrieve relevant context from vector store."""
        try:
            k = k or self.settings.retrieval_k
            
            # Perform similarity search
            documents = self.vector_service.similarity_search(question, k=k)
            
            # Extract content and sources
            context_parts = []
            sources = []
            
            for i, doc in enumerate(documents):
                content = doc.page_content
                source = doc.metadata.get('source', f'Document {i+1}')
                filename = doc.metadata.get('filename', 'Unknown')
                
                context_parts.append(f"Document {i+1} ({filename}):\n{content}")
                sources.append(f"{filename} - {source}")
            
            context = "\n\n".join(context_parts)
            
            logger.info(f"Retrieved {len(documents)} documents for question")
            return documents, sources
            
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
            return [], []
    
    def _assemble_context(self, documents: List[Document]) -> str:
        """Assemble context from retrieved documents."""
        try:
            if not documents:
                return "No relevant information found in Davel's documents."
            
            context_parts = []
            for i, doc in enumerate(documents):
                content = doc.page_content.strip()
                filename = doc.metadata.get('filename', f'Document {i+1}')
                
                # Add document header
                context_parts.append(f"--- {filename} ---")
                context_parts.append(content)
                context_parts.append("")  # Empty line for separation
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to assemble context: {e}")
            return "Error assembling context from documents."
    
    def _classify_question_type(self, question: str) -> str:
        """Classify the type of question to use appropriate prompt."""
        question_lower = question.lower()
        
        # Technical questions
        if any(word in question_lower for word in ['technology', 'tech', 'programming', 'code', 'framework', 'language', 'stack']):
            return 'technical'
        
        # Project questions
        if any(word in question_lower for word in ['project', 'work', 'experience', 'built', 'developed', 'created']):
            return 'project'
        
        # General questions
        return 'general'
    
    def _get_appropriate_prompt(self, question: str, context: str, chat_history: str = "") -> str:
        """Get the appropriate prompt based on question type."""
        question_type = self._classify_question_type(question)
        
        if question_type == 'technical':
            return get_technical_prompt(context, question)
        elif question_type == 'project':
            return get_project_prompt(context, question)
        elif chat_history:
            return get_chat_prompt(context, chat_history, question)
        else:
            return get_rag_prompt(context, question)
    
    def answer_question(
        self, 
        question: str, 
        chat_history: str = "",
        include_sources: bool = True,
        k: int = None
    ) -> Dict[str, Any]:
        """Answer a question using RAG with Davel's persona."""
        try:
            if not self._initialized:
                self.initialize()
            
            logger.info(f"Processing question: {question[:100]}...")
            
            # Retrieve relevant context
            documents, sources = self._retrieve_context(question, k)
            
            # Assemble context
            context = self._assemble_context(documents)
            
            # Get appropriate prompt
            prompt = self._get_appropriate_prompt(question, context, chat_history)
            
            # Generate response
            response = self.llm.invoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # Prepare result
            result = {
                "answer": answer,
                "context": context,
                "sources": sources if include_sources else [],
                "question": question,
                "timestamp": datetime.utcnow().isoformat(),
                "documents_retrieved": len(documents)
            }
            
            logger.info(f"Generated answer with {len(documents)} documents")
            return result
            
        except Exception as e:
            logger.error(f"Failed to answer question: {e}")
            return {
                "answer": "I apologize, but I'm having trouble accessing my information right now. Could you try asking your question again?",
                "context": "",
                "sources": [],
                "question": question,
                "timestamp": datetime.utcnow().isoformat(),
                "documents_retrieved": 0,
                "error": str(e)
            }
    
    def answer_with_streaming(
        self, 
        question: str, 
        chat_history: str = "",
        include_sources: bool = True,
        k: int = None
    ):
        """Answer a question with streaming response."""
        try:
            if not self._initialized:
                self.initialize()
            
            logger.info(f"Processing streaming question: {question[:100]}...")
            
            # Retrieve relevant context
            documents, sources = self._retrieve_context(question, k)
            
            # Assemble context
            context = self._assemble_context(documents)
            
            # Get appropriate prompt
            prompt = self._get_appropriate_prompt(question, context, chat_history)
            
            # Stream response
            for chunk in self.llm.stream(prompt):
                if hasattr(chunk, 'content') and chunk.content:
                    yield {
                        "token": chunk.content,
                        "sources": sources if include_sources else [],
                        "documents_retrieved": len(documents)
                    }
            
        except Exception as e:
            logger.error(f"Failed to stream answer: {e}")
            yield {
                "token": "I apologize, but I'm having trouble accessing my information right now.",
                "sources": [],
                "documents_retrieved": 0,
                "error": str(e)
            }
    
    def health_check(self) -> bool:
        """Check if the RAG service is healthy."""
        try:
            # Check vector service
            vector_health = self.vector_service.health_check()
            
            # Check LLM (simple test)
            test_response = self.llm.invoke("Hello")
            llm_health = test_response is not None
            
            return vector_health and llm_health
            
        except Exception as e:
            logger.error(f"RAG service health check failed: {e}")
            return False


# Global RAG service instance
rag_service = RAGService() 