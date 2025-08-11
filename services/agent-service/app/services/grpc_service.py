import grpc
import logging
from typing import Dict, Any
import uuid
import time

from generated.agent_service_pb2_grpc import AgentServiceServicer as BaseAgentServiceServicer
from generated import (
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
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
from app.services.redis_service import redis_service
from datetime import datetime
from app.services.agent_service import AgentService

# MVP: Enhanced error handling and validation
class ValidationError(Exception):
    """Custom exception for input validation errors."""
    pass

class ServiceTimeoutError(Exception):
    """Custom exception for service timeout errors."""
    pass

class ServiceUnavailableError(Exception):
    """Custom exception for service unavailable errors."""
    pass

logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages ConversationBufferMemory per session, with Redis persistence."""
    def __init__(self):
        self.memories = {}

    def get_memory(self, session_id: str):
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        return self.memories[session_id]

    def load_history(self, session_id: str):
        data = redis_service.get_session_data(session_id)
        if data and "history" in data:
            memory = self.get_memory(session_id)
            # Clear and repopulate memory
            memory.clear()
            for msg in data["history"]:
                if msg["role"] == "user":
                    memory.chat_memory.add_message(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    memory.chat_memory.add_message(AIMessage(content=msg["content"]))
        return self.get_memory(session_id)

    def save_history(self, session_id: str):
        memory = self.get_memory(session_id)
        # Serialize history for Redis
        history = []
        for msg in memory.chat_memory.messages:
            if isinstance(msg, HumanMessage):
                history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "assistant", "content": msg.content})
        redis_service.store_session_data(session_id, {"history": history})

    def clear_history(self, session_id: str):
        if session_id in self.memories:
            self.memories[session_id].clear()
        redis_service.delete_session_data(session_id)

memory_manager = MemoryManager()

class AgentServiceServicer(BaseAgentServiceServicer):
    """gRPC servicer implementation for the Agent Service."""
    
    def __init__(self):
        self.settings = get_settings()
        self.document_service = DocumentService()
        self.vector_service = VectorService()
        self.agent_service = AgentService()
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
    
    def _validate_chat_request(self, request: chat_pb2.ChatRequest) -> None:
        """MVP: Validate chat request input."""
        if not request.message or not request.message.strip():
            raise ValidationError("Message cannot be empty")
        
        if len(request.message) > 10000:  # 10k char limit
            raise ValidationError("Message too long (max 10,000 characters)")
            
        if request.session_id and len(request.session_id) > 100:
            raise ValidationError("Session ID too long (max 100 characters)")
            
        if request.max_tokens and (request.max_tokens < 1 or request.max_tokens > 8192):
            raise ValidationError("Max tokens must be between 1 and 8192")

    def _create_error_response(self, error: Exception, correlation_id: str) -> chat_pb2.ChatResponse:
        """MVP: Create standardized error response."""
        if isinstance(error, ValidationError):
            error_code = grpc.StatusCode.INVALID_ARGUMENT.value[0]
            error_message = f"Invalid input: {str(error)}"
        elif isinstance(error, ServiceTimeoutError):
            error_code = grpc.StatusCode.DEADLINE_EXCEEDED.value[0]
            error_message = "Request timed out. Please try again."
        elif isinstance(error, ServiceUnavailableError):
            error_code = grpc.StatusCode.UNAVAILABLE.value[0]
            error_message = "Service temporarily unavailable. Please try again later."
        else:
            error_code = grpc.StatusCode.INTERNAL.value[0]
            error_message = "An unexpected error occurred. Please try again."
            
        logger.error(f"[{correlation_id}] Error in SendMessage: {error_message} - {str(error)}")
        
        return chat_pb2.ChatResponse(
            response="I'm sorry, I encountered an error processing your request. Please try again.",
            session_id="",
            sources=[],
            tool_calls=[],
            reasoning=f"Error: {error_message}",
            status=common_pb2.Status(
                success=False,
                message=error_message,
                code=error_code
            )
        )

    def SendMessage(self, request: chat_pb2.ChatRequest, context) -> chat_pb2.ChatResponse:
        """Send chat message using agent streaming with Redis pub/sub for real-time tokens."""
        # MVP: Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        logger.info(f"[{correlation_id}] SendMessage started - session: {request.session_id}, message_len: {len(request.message)}")
        
        try:
            # MVP: Input validation
            self._validate_chat_request(request)
            
            # MVP: Ensure services are initialized with timeout
            try:
                self._ensure_initialized()
            except Exception as e:
                raise ServiceUnavailableError(f"Service initialization failed: {str(e)}")
            
            # MVP: Set default values for missing optional fields
            session_id = request.session_id if request.session_id else f"session_{correlation_id}"
            max_tokens = request.max_tokens if request.max_tokens else 4096
            use_tools = request.use_tools if hasattr(request, 'use_tools') else True
            
            # MVP: Process with timeout (30 seconds for MVP)
            timeout_start = time.time()
            timeout_seconds = 30
            
            # Collect all streaming tokens while publishing to Redis
            full_response = ""
            tool_calls = []
            sources = []
            reasoning = ""
            
            logger.info(f"[{correlation_id}] Starting agent streaming for session: {session_id}")
            
            for token in self.agent_service.send_message_streaming(
                message=request.message,
                session_id=session_id,
                use_tools=use_tools,
                max_tokens=max_tokens
            ):
                # MVP: Check timeout during streaming
                if time.time() - timeout_start > timeout_seconds:
                    raise ServiceTimeoutError("Request processing timed out")
                    
                full_response += token
            
            processing_time = time.time() - start_time
            logger.info(f"[{correlation_id}] SendMessage completed - response_len: {len(full_response)}, time: {processing_time:.2f}s")
            
            # MVP: Enhanced response with better metadata
            return chat_pb2.ChatResponse(
                response=full_response,
                session_id=session_id,
                sources=sources,
                tool_calls=tool_calls,
                reasoning=f"Processed in {processing_time:.2f}s via streaming",
                status=common_pb2.Status(
                    success=True,
                    message="Message processed successfully"
                )
            )
            
        except ValidationError as e:
            return self._create_error_response(e, correlation_id)
        except ServiceTimeoutError as e:
            return self._create_error_response(e, correlation_id)
        except ServiceUnavailableError as e:
            return self._create_error_response(e, correlation_id)
        except Exception as e:
            # MVP: Log unexpected errors with full context
            logger.error(f"[{correlation_id}] Unexpected error in SendMessage: {str(e)}", exc_info=True)
            return self._create_error_response(e, correlation_id)

    def GetChatHistory(self, request: chat_pb2.GetChatHistoryRequest, context) -> chat_pb2.GetChatHistoryResponse:
        """Get chat history for a session from Redis."""
        try:
            session_id = request.session_id if request.session_id else "default_session"
            data = redis_service.get_session_data(session_id)
            messages = []
            if data and "history" in data:
                for msg in data["history"]:
                    messages.append(chat_pb2.ChatMessage(
                        role=msg["role"],
                        content=msg["content"],
                        timestamp=int(datetime.utcnow().timestamp()),
                        session_id=session_id,
                        sources=[],
                        tool_calls=[]
                    ))
            return chat_pb2.GetChatHistoryResponse(messages=messages, status=common_pb2.Status(success=True))
        except Exception as e:
            logger.error(f"GetChatHistory failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return chat_pb2.GetChatHistoryResponse()

    def ClearChatHistory(self, request: chat_pb2.ClearChatHistoryRequest, context) -> common_pb2.StatusResponse:
        """Clear chat history for a session in Redis and memory."""
        try:
            session_id = request.session_id if request.session_id else "default_session"
            memory_manager.clear_history(session_id)
            return common_pb2.StatusResponse(status=common_pb2.Status(success=True, message="Chat history cleared"))
        except Exception as e:
            logger.error(f"ClearChatHistory failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return common_pb2.StatusResponse(status=common_pb2.Status(success=False, message=str(e))) 