import grpc
import logging
from typing import Dict, Any

from generated import (
    agent_service_pb2_grpc, 
    agent_service_pb2,
    common_pb2, 
    chat_pb2, 
    documents_pb2
)
from app.config import get_settings
from app.services.document_service import DocumentService
from app.services.vector_service import VectorService
from app.services.rag_service import rag_service
from app.core.utils import (
    protobuf_ingest_request_to_pydantic,
    pydantic_ingest_response_to_protobuf,
    pydantic_document_status_to_protobuf,
    pydantic_document_info_to_protobuf,
    pydantic_to_protobuf_status,
    create_error_response
)


logger = logging.getLogger(__name__)


class AgentServiceServicer(agent_service_pb2_grpc.AgentServiceServicer):
    """gRPC servicer implementation for the Agent Service."""
    
    def __init__(self):
        self.settings = get_settings()
        self.document_service = DocumentService()
        self.vector_service = VectorService()
        self._initialized = False
        logger.info("AgentServiceServicer initialized")
    
    def _ensure_initialized(self):
        """Ensure services are initialized."""
        if not self._initialized:
            self.document_service.initialize()
            self.vector_service.initialize_collection()
            rag_service.initialize()
            self._initialized = True
    
    def HealthCheck(self, request: common_pb2.Empty, context) -> common_pb2.HealthResponse:
        """Health check endpoint."""
        try:
            self._ensure_initialized()
            
            # Check dependencies status
            dependencies = {
                "grpc_server": "active",
                "configuration": "loaded",
                "environment": self.settings.environment
            }
            
            # Check vector service health
            vector_health = self.vector_service.health_check()
            dependencies["qdrant"] = "connected" if vector_health else "disconnected"
            
            # Check document service health
            doc_health = self.document_service.health_check()
            dependencies["document_service"] = "active" if doc_health else "inactive"
            
            # Check if OpenAI key is configured
            dependencies["openai"] = "configured" if self.settings.openai_api_key else "not_configured"
            
            # Check LangChain tracing
            dependencies["langchain_tracing"] = "enabled" if self.settings.langchain_tracing_v2 else "disabled"
            
            overall_health = vector_health and doc_health
            
            return common_pb2.HealthResponse(
                healthy=overall_health,
                version="1.0.0",
                dependencies=dependencies
            )
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return common_pb2.HealthResponse(
                healthy=False,
                version="1.0.0",
                dependencies={"error": str(e)}
            )
    
    def ListTools(self, request: common_pb2.Empty, context) -> agent_service_pb2.ToolsListResponse:
        """List available tools."""
        try:
            # Placeholder tools for Phase 1-3
            tools = [
                agent_service_pb2.ToolInfo(
                    name="health_check",
                    description="Check service health",
                    available=True
                ),
                agent_service_pb2.ToolInfo(
                    name="document_ingestion",
                    description="Process and ingest documents",
                    available=True
                ),
                agent_service_pb2.ToolInfo(
                    name="vector_search",
                    description="Search document vectors",
                    available=True
                )
            ]
            
            # TODO: Add real tools in Phase 5-6
            # - GitHub API tools
            # - Portfolio scraper tools
            
            return agent_service_pb2.ToolsListResponse(tools=tools)
            
        except Exception as e:
            logger.error(f"List tools failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Failed to list tools: {e}")
            return agent_service_pb2.ToolsListResponse()
    
    def TestTool(self, request: agent_service_pb2.ToolTestRequest, context) -> agent_service_pb2.ToolTestResponse:
        """Test a specific tool."""
        try:
            tool_name = request.tool_name
            
            if tool_name == "health_check":
                return agent_service_pb2.ToolTestResponse(
                    success=True,
                    result="Health check tool is working",
                    error_message=""
                )
            elif tool_name == "document_ingestion":
                # Test document service health
                healthy = self.document_service.health_check()
                return agent_service_pb2.ToolTestResponse(
                    success=healthy,
                    result="Document ingestion service is ready" if healthy else "Document service unavailable",
                    error_message="" if healthy else "Vector service not accessible"
                )
            elif tool_name == "vector_search":
                # Test vector service health
                healthy = self.vector_service.health_check()
                return agent_service_pb2.ToolTestResponse(
                    success=healthy,
                    result="Vector search is ready" if healthy else "Vector service unavailable",
                    error_message="" if healthy else "Qdrant connection failed"
                )
            else:
                return agent_service_pb2.ToolTestResponse(
                    success=False,
                    result="",
                    error_message=f"Tool '{tool_name}' not found"
                )
                
        except Exception as e:
            logger.error(f"Test tool failed: {e}")
            return agent_service_pb2.ToolTestResponse(
                success=False,
                result="",
                error_message=str(e)
            )
    
    # Document management endpoints (Phase 3)
    
    def IngestDocuments(self, request: documents_pb2.IngestRequest, context) -> documents_pb2.IngestResponse:
        """Ingest documents."""
        try:
            self._ensure_initialized()
            
            # Convert protobuf to Pydantic
            pydantic_request = protobuf_ingest_request_to_pydantic(request)
            
            # Process ingestion
            response = self.document_service.ingest_documents(pydantic_request)
            
            # Convert back to protobuf
            return pydantic_ingest_response_to_protobuf(response)
            
        except Exception as e:
            logger.error(f"Document ingestion failed: {e}")
            return documents_pb2.IngestResponse(
                job_id="",
                status=create_error_response(str(e))
            )
    
    def GetDocumentStatus(self, request: documents_pb2.StatusRequest, context) -> documents_pb2.StatusResponse:
        """Get document status."""
        try:
            status = self.document_service.get_document_status(request.job_id)
            
            if status is None:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(f"Job not found: {request.job_id}")
                return documents_pb2.StatusResponse()
            
            return pydantic_document_status_to_protobuf(status)
            
        except Exception as e:
            logger.error(f"Get document status failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return documents_pb2.StatusResponse()
    
    def ListDocuments(self, request: documents_pb2.ListRequest, context) -> documents_pb2.ListResponse:
        """List documents."""
        try:
            self._ensure_initialized()
            
            documents = self.document_service.list_documents()
            
            # Convert to protobuf
            protobuf_docs = [pydantic_document_info_to_protobuf(doc) for doc in documents]
            
            return documents_pb2.ListResponse(
                documents=protobuf_docs,
                status=pydantic_to_protobuf_status(True, f"Found {len(documents)} documents")
            )
            
        except Exception as e:
            logger.error(f"List documents failed: {e}")
            return documents_pb2.ListResponse(
                documents=[],
                status=create_error_response(str(e))
            )
    
    def DeleteDocument(self, request: documents_pb2.DeleteRequest, context) -> common_pb2.StatusResponse:
        """Delete document."""
        try:
            self._ensure_initialized()
            
            success = self.document_service.delete_document(request.document_id)
            
            if success:
                return common_pb2.StatusResponse(
                    status=pydantic_to_protobuf_status(True, f"Document {request.document_id} deleted")
                )
            else:
                return common_pb2.StatusResponse(
                    status=pydantic_to_protobuf_status(False, f"Failed to delete document {request.document_id}")
                )
                
        except Exception as e:
            logger.error(f"Delete document failed: {e}")
            return common_pb2.StatusResponse(
                status=create_error_response(str(e))
            )
    
    # RAG Chat Implementation (Phase 4)
    
    def SendMessage(self, request: chat_pb2.ChatRequest, context) -> chat_pb2.ChatResponse:
        """Send chat message using RAG with Davel's persona."""
        try:
            self._ensure_initialized()
            
            # Get question and session info
            question = request.message
            session_id = request.session_id if request.session_id else "default_session"
            
            # Answer question using RAG
            result = rag_service.answer_question(
                question=question,
                chat_history="",  # TODO: Implement session management in Phase 5
                include_sources=True,
                k=request.max_tokens if request.max_tokens > 0 else None
            )
            
            # Convert sources to list of strings
            sources = result.get("sources", [])
            if isinstance(sources, list):
                source_strings = [str(s) for s in sources]
            else:
                source_strings = [str(sources)] if sources else []
            
            return chat_pb2.ChatResponse(
                response=result.get("answer", "I apologize, but I couldn't generate a response."),
                session_id=session_id,
                sources=source_strings,
                tool_calls=[],  # TODO: Implement tools in Phase 6
                reasoning=f"Retrieved {result.get('documents_retrieved', 0)} documents from vector store",
                status=common_pb2.Status(success=True, message="RAG response generated successfully")
            )
            
        except Exception as e:
            logger.error(f"SendMessage failed: {e}")
            return chat_pb2.ChatResponse(
                response="I apologize, but I'm experiencing technical difficulties right now.",
                session_id=request.session_id if request.session_id else "default_session",
                sources=[],
                tool_calls=[],
                reasoning="Error occurred during RAG processing",
                status=common_pb2.Status(
                    success=False,
                    message=str(e),
                    code=grpc.StatusCode.INTERNAL.value[0]
                )
            )
    
    def GetChatHistory(self, request: chat_pb2.GetChatHistoryRequest, context) -> chat_pb2.GetChatHistoryResponse:
        """Get chat history - placeholder for Phase 4-5."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Chat history will be implemented in Phase 4-5")
        return chat_pb2.GetChatHistoryResponse()
    
    def ClearChatHistory(self, request: chat_pb2.ClearChatHistoryRequest, context) -> common_pb2.StatusResponse:
        """Clear chat history - placeholder for Phase 4-5."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Chat history management will be implemented in Phase 4-5")
        return common_pb2.StatusResponse() 