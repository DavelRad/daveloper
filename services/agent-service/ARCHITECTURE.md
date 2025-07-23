# Davel Agent Service - Architecture & Implementation Plan (LangChain + gRPC + Redis)

## Overview
The Davel Agent is a personal AI assistant that embodies Davel's persona, knowledge, and communication style for the Daveloper.dev portfolio platform. Built with LangChain and served via gRPC, it responds in first person as Davel, drawing from uploaded personal documents and live public profile data to answer questions about Davel's background, experience, and projects.

This service is a core component of the Daveloper.dev portfolio platform, providing real-time AI chat capabilities through a microservice architecture where a NestJS API Gateway orchestrates communication between the Next.js frontend and backend services. The agent streams responses in real-time via Redis Pub/Sub, enabling live chat interactions on the portfolio website.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │  Agent Service  │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│ (LangChain +    │
│                 │    │                 │    │  FastAPI +      │
│  WebSocket      │    │  WebSocket      │    │  gRPC Server)   │
│   Chat Client   │    │   Manager       │    │                 │
└─────────────────┘    │                 │    └─────────────────┘
                       │                 │    ┌─────────────────┐
                       │                 │◄──►│ Scraper Service │
                       └─────────────────┘    │ (Python +       │
                              │               │  gRPC Server)   │
                              ▼               └─────────────────┘
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Redis Pub/Sub │    │   Qdrant Cloud  │
                       │  (Real-time     │    │  (Vector Store) │
                       │   Streaming)    │    └─────────────────┘
                       └─────────────────┘    ┌─────────────────┐
                              │               │     OpenAI      │
                              ▼               │      API        │
                       ┌─────────────────┐    └─────────────────┘
                       │   Supabase      │
                       │  (Postgres)     │
                       └─────────────────┘
```

**Communication Protocols:**
- **Frontend ↔ API Gateway**: WebSocket (real-time chat) + REST (HTTP/JSON)
- **API Gateway ↔ Microservices**: gRPC (binary, type-safe)
- **Agent Service → API Gateway**: Redis Pub/Sub (token streaming)
- **Internal LangChain**: Python objects and chains

## Tech Stack
- **Backend Framework**: FastAPI (Python) + gRPC Server
- **AI Framework**: LangChain
- **Vector Database**: Qdrant Cloud (via LangChain QdrantVectorStore)
- **LLM**: OpenAI GPT (3.5-turbo or 4) via LangChain
- **Embeddings**: OpenAI text-embedding-ada-002 via LangChain
- **Document Processing**: LangChain Document Loaders (PDF, DOCX, TXT, Web)
- **Agent Framework**: LangChain AgentExecutor with Tools
- **Memory**: LangChain ConversationBufferMemory
- **RPC Framework**: gRPC (grpcio, grpcio-tools)
- **Protocol Buffers**: protobuf (service contracts)
- **Real-time Communication**: Redis Pub/Sub (redis-py)
- **HTTP Client**: httpx (for custom tools)
- **Environment**: Docker + docker-compose
- **Service Integration**: gRPC communication with NestJS API Gateway + Redis streaming

## LangChain Components

### 1. Document Ingestion Chain
- **Components**: DocumentLoaders → TextSplitter → Embeddings → QdrantVectorStore
- **Purpose**: Process and store Davel's personal documents
- **Input**: PDF, DOCX, TXT files (resume, transcripts, etc.)
- **LangChain Tools**: 
  - `PyPDFLoader`, `Docx2txtLoader`, `TextLoader`
  - `RecursiveCharacterTextSplitter`
  - `OpenAIEmbeddings`
  - `QdrantVectorStore`

### 2. Retrieval Chain (RAG)
- **Components**: VectorStoreRetriever → PromptTemplate → LLMChain
- **Purpose**: Retrieve relevant context and generate responses as Davel
- **LangChain Tools**:
  - `QdrantVectorStore.as_retriever()`
  - `PromptTemplate` with Davel persona
  - `LLMChain` with OpenAI

### 3. Agent with Tools
- **Components**: AgentExecutor → Custom Tools → LLMChain
- **Purpose**: Handle tool use for live data fetching
- **Tools**:
  - GitHub API tool (repositories, commits, profile)
  - Portfolio scraper tool
  - Web search tool (optional)
- **LangChain Tools**: `@tool` decorator, `AgentExecutor`

### 4. Memory Management
- **Components**: ConversationBufferMemory or ConversationSummaryMemory
- **Purpose**: Maintain session context and chat history
- **LangChain Tools**: `ConversationBufferMemory`
- **Best Practice**: If a tool (such as a summarization tool) needs access to chat history, use `ReadOnlySharedMemory` for the tool instead of sharing the main `ConversationBufferMemory` instance. This prevents tool actions from being recorded in the main memory buffer and avoids memory pollution.

#### Example: Using ReadOnlySharedMemory for Tools
```python
from langchain.memory import ConversationBufferMemory, ReadOnlySharedMemory

# Main memory for the agent
memory = ConversationBufferMemory(memory_key="chat_history")

# Read-only memory for a tool
readonly_memory = ReadOnlySharedMemory(memory=memory)

# Pass readonly_memory to tools that need chat history
summary_tool = SomeTool(memory=readonly_memory)
```

### 5. Prompt Engineering
- **Components**: PromptTemplate, ChatPromptTemplate
- **Purpose**: Ensure consistent Davel persona and response format
- **LangChain Tools**: `PromptTemplate`, `ChatPromptTemplate`

## File Structure

```
services/agent-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI + gRPC server entry point
│   ├── config.py              # Configuration and environment variables
│   ├── grpc_server.py         # gRPC server implementation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat.py            # Chat-related Pydantic models
│   │   └── documents.py       # Document models
│   ├── chains/
│   │   ├── __init__.py
│   │   ├── ingestion_chain.py # Document ingestion LangChain
│   │   ├── retrieval_chain.py # RAG chain for Q&A
│   │   ├── agent_chain.py     # Main agent with tools
│   │   └── memory_chain.py    # Memory management
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── github_tool.py     # GitHub API integration
│   │   ├── portfolio_tool.py  # Portfolio scraping
│   │   └── base_tool.py       # Base tool class
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── persona_prompts.py # Davel persona templates
│   │   ├── rag_prompts.py     # RAG-specific prompts
│   │   └── agent_prompts.py   # Agent/tool use prompts
│   ├── services/
│   │   ├── __init__.py
│   │   ├── vector_service.py  # Qdrant operations wrapper
│   │   ├── document_service.py # Document processing service
│   │   ├── agent_service.py   # Main agent orchestration
│   │   └── grpc_service.py    # gRPC service implementations
│   ├── api/
│   │   ├── __init__.py
│   │   └── health.py         # Health check endpoints (optional REST)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── callbacks.py      # LangChain callbacks for logging
│   │   └── utils.py          # Utility functions
│   └── data/
│       └── documents/        # Local document storage for ingestion
├── proto/
│   ├── agent_service.proto   # gRPC service definitions
│   ├── chat.proto           # Chat message types
│   ├── documents.proto      # Document management types
│   └── common.proto         # Common types and enums
├── generated/
│   ├── __init__.py
│   ├── agent_service_pb2.py # Generated protobuf classes
│   ├── agent_service_pb2_grpc.py # Generated gRPC stubs
│   ├── chat_pb2.py
│   ├── documents_pb2.py
│   └── common_pb2.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── scripts/
│   └── generate_proto.sh    # Script to generate Python files from .proto
├── README.md
└── ARCHITECTURE.md (this file)
```

## gRPC Service Definitions

### Agent Service Proto
```protobuf
syntax = "proto3";

package agent_service;

import "chat.proto";
import "documents.proto";
import "common.proto";

service AgentService {
  // Chat operations
  rpc SendMessage(chat.ChatRequest) returns (chat.ChatResponse);
  rpc GetChatHistory(chat.GetChatHistoryRequest) returns (chat.GetChatHistoryResponse);
  rpc ClearChatHistory(chat.ClearChatHistoryRequest) returns (common.StatusResponse);
  
  // Document operations
  rpc IngestDocuments(documents.IngestRequest) returns (documents.IngestResponse);
  rpc GetDocumentStatus(documents.StatusRequest) returns (documents.StatusResponse);
  rpc ListDocuments(documents.ListRequest) returns (documents.ListResponse);
  rpc DeleteDocument(documents.DeleteRequest) returns (common.StatusResponse);
  
  // Tool operations
  rpc ListTools(common.Empty) returns (ToolsListResponse);
  rpc TestTool(ToolTestRequest) returns (ToolTestResponse);
  
  // Health check
  rpc HealthCheck(common.Empty) returns (common.HealthResponse);
}

message ToolsListResponse {
  repeated ToolInfo tools = 1;
}

message ToolInfo {
  string name = 1;
  string description = 2;
  bool available = 3;
}

message ToolTestRequest {
  string tool_name = 1;
  map<string, string> parameters = 2;
}

message ToolTestResponse {
  bool success = 1;
  string result = 2;
  string error_message = 3;
}
```

### Chat Proto
```protobuf
syntax = "proto3";

package chat;

import "common.proto";

message ChatRequest {
  string message = 1;
  string session_id = 2;
  bool use_tools = 3;
  int32 max_tokens = 4;
}

message ChatResponse {
  string response = 1;
  string session_id = 2;
  repeated string sources = 3;
  repeated string tool_calls = 4;
  string reasoning = 5;
  common.Status status = 6;
}

message GetChatHistoryRequest {
  string session_id = 1;
}

message GetChatHistoryResponse {
  repeated ChatMessage messages = 1;
  common.Status status = 2;
}

message ClearChatHistoryRequest {
  string session_id = 1;
}

message ChatMessage {
  string role = 1;
  string content = 2;
  int64 timestamp = 3;
  string session_id = 4;
  repeated string sources = 5;
  repeated string tool_calls = 6;
}
```

### Documents Proto
```protobuf
syntax = "proto3";

package documents;

import "common.proto";

message IngestRequest {
  repeated string file_paths = 1;
  bool force_reingest = 2;
}

message IngestResponse {
  string job_id = 1;
  common.Status status = 2;
}

message StatusRequest {
  string job_id = 1;
}

message StatusResponse {
  string job_id = 1;
  string status = 2; // "processing", "completed", "failed"
  int32 total_documents = 3;
  int32 processed_documents = 4;
  string error_message = 5;
}

message ListRequest {
  // Empty for now, could add filtering options later
}

message ListResponse {
  repeated DocumentInfo documents = 1;
  common.Status status = 2;
}

message DeleteRequest {
  string document_id = 1;
}

message DocumentInfo {
  string id = 1;
  string filename = 2;
  string document_type = 3;
  int64 upload_date = 4;
  int32 chunk_count = 5;
  string status = 6;
}
```

### Common Proto
```protobuf
syntax = "proto3";

package common;

message Empty {}

message Status {
  bool success = 1;
  string message = 2;
  int32 code = 3;
}

message StatusResponse {
  Status status = 1;
}

message HealthResponse {
  bool healthy = 1;
  string version = 2;
  map<string, string> dependencies = 3;
}
```

## Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_CHAT_CHANNEL=chat_tokens
REDIS_SESSION_CHANNEL=chat_sessions

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Qdrant Cloud
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=davel_documents

# GitHub API (for live fetching)
GITHUB_USERNAME=daveloper
GITHUB_TOKEN=optional_for_higher_rate_limits

# LangChain Configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=davel-agent

# gRPC Configuration
GRPC_PORT=50051
GRPC_MAX_WORKERS=10
GRPC_ENABLE_REFLECTION=true

# App Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
MAX_TOKENS=4096
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RETRIEVAL_K=5

# Optional REST API (for debugging)
REST_API_ENABLED=false
REST_API_PORT=8000
```

## LangChain Prompt Templates

### Davel Persona Prompt
```python
DAVEL_PERSONA_TEMPLATE = """
You are Davel, a passionate software engineer and technology enthusiast. You are responding directly to someone asking about your background, experience, and projects.

CRITICAL INSTRUCTIONS:
- Always respond in first person as Davel
- Never refer to yourself in third person or as an AI assistant
- Draw from your documented experience and projects
- Be confident but approachable in your responses
- Reference specific technologies and projects when relevant
- If you don't have specific information, acknowledge it naturally

Context from your documents and profiles:
{context}

Current conversation:
{chat_history}

Human question: {input}

Response as Davel:
"""

AGENT_PROMPT_TEMPLATE = """
You are Davel, a software engineer. You have access to tools to fetch live information about your GitHub activity and projects.

When answering questions:
1. First check if you have relevant information in your knowledge base
2. Use tools if you need live/current information (GitHub repos, recent commits, etc.)
3. Always respond as Davel in first person
4. Provide specific examples and details when possible

Tools available:
{tools}

Tool names: {tool_names}

Context from your documents: {context}
Chat history: {chat_history}
Question: {input}
{agent_scratchpad}
"""
```

### RAG Chain Prompt
```python
RAG_PROMPT_TEMPLATE = """
Based on the following context about Davel, answer the question as if you are Davel speaking in first person.

Context:
{context}

Question: {question}

Answer as Davel:
"""
```

## gRPC Server Implementation

### Main gRPC Server
```python
import grpc
from concurrent import futures
from generated import agent_service_pb2_grpc
from services.grpc_service import AgentServiceServicer

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    agent_service_pb2_grpc.add_AgentServiceServicer_to_server(
        AgentServiceServicer(), server
    )
    
    listen_addr = f'[::]:{settings.GRPC_PORT}'
    server.add_insecure_port(listen_addr)
    
    if settings.GRPC_ENABLE_REFLECTION:
        from grpc_reflection.v1alpha import reflection
        reflection.enable_server_reflection(
            agent_service_pb2.DESCRIPTOR.services_by_name.keys(),
            server
        )
    
    server.start()
    return server

if __name__ == '__main__':
    server = serve()
    server.wait_for_termination()
```

### gRPC Service Implementation
```python
import grpc
from generated import agent_service_pb2_grpc, chat_pb2, common_pb2
from services.agent_service import AgentService
from services.document_service import DocumentService

class AgentServiceServicer(agent_service_pb2_grpc.AgentServiceServicer):
    def __init__(self):
        self.agent_service = AgentService()
        self.document_service = DocumentService()
    
    async def SendMessage(self, request, context):
        try:
            response = await self.agent_service.send_message(
                message=request.message,
                session_id=request.session_id,
                use_tools=request.use_tools,
                max_tokens=request.max_tokens
            )
            return chat_pb2.ChatResponse(
                response=response.response,
                session_id=response.session_id,
                sources=response.sources,
                tool_calls=response.tool_calls,
                reasoning=response.reasoning,
                status=common_pb2.Status(success=True)
            )
        except Exception as e:
            return chat_pb2.ChatResponse(
                status=common_pb2.Status(
                    success=False,
                    message=str(e),
                    code=grpc.StatusCode.INTERNAL.value[0]
                )
            )
    
    async def IngestDocuments(self, request, context):
        # Implementation for document ingestion
        pass
    
    async def HealthCheck(self, request, context):
        return common_pb2.HealthResponse(
            healthy=True,
            version="1.0.0",
            dependencies={
                "qdrant": "connected",
                "openai": "connected",
                "langchain": "active"
            }
        )
```

## Data Flow

### Chat Request Flow (with Real-time Streaming)
1. User opens **Chat widget** on Next.js Frontend → WebSocket connection established
2. User sends message via **WebSocket** to **NestJS API Gateway**
3. **NestJS** calls **agent-service** via gRPC (SendMessage) with streaming enabled
4. **Agent Chain** determines if tools are needed
5. If tools needed: Execute tools (GitHub API, etc.)
6. **RAG Chain** retrieves relevant document chunks from Qdrant
7. **Prompt Template** assembles context + conversation history
8. **LLM** generates response as Davel with token streaming
9. **Agent Service** streams tokens via **Redis Pub/Sub** (chat_tokens channel)
10. **NestJS** subscribes to Redis channel and relays tokens via **WebSocket** to frontend
11. **Frontend** renders tokens in real-time as they arrive
12. Conversation history stored in browser localStorage + Supabase for persistence

### Document Ingestion Flow (with gRPC)
1. **NestJS** triggers document ingestion via gRPC (IngestDocuments)
2. **Document Loaders** extract text from each file
3. **Text Splitter** chunks documents semantically
4. **Embeddings** generate vectors for each chunk
5. **QdrantVectorStore** stores chunks + embeddings + metadata
6. **gRPC response** with job status sent back to NestJS
7. NestJS can poll document status via GetDocumentStatus

### Tool Communication Flow
1. **Agent Chain** determines tool use is needed
2. **Tools** make API calls to external services (GitHub, portfolio site)
3. **Tool results** integrated into LLM context
4. **Response** includes tool call information for transparency

## Implementation TODO List

### Phase 1: gRPC Foundation (Priority: High)
- [x] Set up gRPC server structure with FastAPI
- [x] Define protobuf service contracts (.proto files)
- [x] Generate Python gRPC stubs and classes
- [x] Implement basic gRPC server with health check
- [x] Create gRPC service wrapper classes
- [x] Set up gRPC error handling and status codes
- [x] Configure logging for gRPC operations

### Phase 2: LangChain Foundation (Priority: High)
- [x] Set up FastAPI project structure with LangChain
- [x] Install and configure LangChain dependencies
- [x] Create configuration for OpenAI and Qdrant via LangChain
- [x] Set up basic logging and LangSmith tracing
- [x] Create Pydantic models for internal data structures
- [x] Implement conversion between Pydantic and protobuf models

### Phase 3: Document Ingestion Chain (Priority: High)
- [x] Implement LangChain document loaders (PDF, DOCX, TXT)
- [x] Configure RecursiveCharacterTextSplitter
- [x] Set up OpenAI embeddings integration
- [x] Configure QdrantVectorStore connection
- [x] Build document ingestion chain
- [x] Implement gRPC document management endpoints
- [x] Test end-to-end document processing via gRPC

### Phase 4: RAG Chain Implementation (Priority: High)
- [x] Create retrieval chain with QdrantVectorStore
- [x] Design and implement Davel persona prompts
- [x] Build RAG chain for question answering
- [x] Implement context assembly and prompt formatting
- [x] Test RAG functionality with sample questions
- [x] Add source attribution to gRPC responses

### Phase 5: Memory and Session Management (Priority: High)
- [x] Implement ConversationBufferMemory
- [x] Create session management for chat history
- [x] Integrate memory with gRPC chat endpoints
- [x] Test conversation continuity across gRPC calls
- [x] Implement session persistence strategies

### Phase 6: Tools and Agent Chain (Priority: Medium)
- [ ] Create base tool class and structure
- [ ] Implement GitHub API tools (repos, commits, profile)
- [ ] Build portfolio scraper tool
- [ ] Configure AgentExecutor with tools
- [ ] Implement agent decision-making logic
- [ ] Test tool calling via gRPC agent responses

### Phase 7: Real-time Chat Integration (Priority: High)
- [ ] Implement SendMessage gRPC endpoint with LangChain integration
- [ ] Add Redis Pub/Sub integration for token streaming
- [ ] Implement token streaming from LangChain to Redis
- [ ] Integrate agent and RAG chains with real-time streaming
- [ ] Test complete real-time chat flow (gRPC → Redis → WebSocket)
- [ ] Add rate limiting and gRPC interceptors
- [ ] Implement session management with Redis

### Phase 8: Enhanced Features (Priority: Medium)
- [ ] Add LangSmith tracing and debugging
- [ ] Implement gRPC interceptors for logging and metrics
- [ ] Add Redis caching mechanisms for improved performance
- [ ] Enhance tool error handling
- [ ] Add agent reasoning transparency in streaming responses
- [ ] Optimize chain performance for real-time streaming
- [ ] Implement conversation persistence in Supabase

### Phase 9: Production Features (Priority: Low)
- [ ] Add comprehensive gRPC error handling
- [ ] Implement proper gRPC security (TLS, authentication)
- [ ] Add input validation and sanitization for gRPC
- [ ] Create Docker configuration with gRPC ports
- [ ] Add environment-specific configurations
- [ ] Implement health checks for gRPC and dependencies

### Phase 10: Integration Testing (Priority: Medium)
- [ ] Create gRPC client tests for all endpoints
- [ ] Test integration with NestJS API Gateway
- [ ] Add end-to-end testing with real-time streaming
- [ ] Performance testing for Redis Pub/Sub vs direct gRPC
- [ ] Load testing for concurrent WebSocket connections
- [ ] Test complete portfolio platform integration

### Phase 11: Documentation & Monitoring (Priority: Low)
- [ ] Document gRPC API and service contracts
- [ ] Create gRPC client examples for NestJS
- [ ] Add gRPC metrics and monitoring
- [ ] Create deployment and setup guides
- [ ] Add performance benchmarking

## Real-time Streaming Architecture

### Redis Integration (Synchronous)
- **Session Persistence**: Store and retrieve chat history via Redis with automatic expiration
- **Session Management**: Track chat sessions and conversation state synchronously
- **Pub/Sub Support**: Redis pub/sub for real-time streaming (when needed by NestJS API)
- **Thread-Safe**: Synchronous Redis operations work seamlessly with gRPC thread pool

### WebSocket Integration
- **Real-time Frontend**: Direct token streaming to browser
- **Low Latency**: Minimal delay between token generation and display
- **Connection Management**: Handle WebSocket connections and disconnections
- **Cross-platform**: Works across all modern browsers and devices

### Portfolio Platform Integration
- **Live Chat Widget**: Embedded chat interface on portfolio website
- **Seamless UX**: Real-time responses without page refreshes
- **Brand Consistency**: Chat maintains Davel's persona and style
- **Performance**: Optimized for portfolio website performance

## gRPC-Specific Benefits

### Performance
- **Binary Protocol**: Faster serialization/deserialization than JSON
- **HTTP/2**: Multiplexing, streaming, header compression
- **Connection Reuse**: Persistent connections reduce overhead

### Type Safety
- **Protobuf Schemas**: Strongly typed service contracts
- **Code Generation**: Automatic client/server stub generation
- **Interface Evolution**: Backward/forward compatibility with versioning

### Streaming
- **Bidirectional Streaming**: Real-time chat, live updates
- **Server Streaming**: Streaming LLM responses, progress updates
- **Client Streaming**: Batch operations, file uploads

### Microservice Integration
- **Service Discovery**: Easy integration with service mesh
- **Load Balancing**: Built-in client-side load balancing
- **Observability**: gRPC metrics, tracing, health checks

## Security Considerations

### gRPC Security
- **TLS Encryption**: Secure communication between services
- **Authentication**: Token-based auth for service-to-service calls
- **Input Validation**: Protobuf schema validation + custom validation
- **Rate Limiting**: gRPC interceptors for request throttling

### LangChain Security
- Secure tool execution with input validation
- API key management through environment variables
- Rate limiting for tool calls and LLM requests
- Input sanitization for prompt injection prevention

### Data Privacy
- Personal documents processed securely
- No sensitive information in gRPC logs (configurable)
- Secure gRPC channels for data transmission
- Proper error handling without data leakage

## Deployment Strategy

### Development
- Use docker-compose with gRPC services
- Enable gRPC reflection for testing tools (like grpcurl)
- Hot reloading for service development
- Local Qdrant instance or cloud connection

### Production
- Deploy as containerized gRPC service
- Use production LangSmith project for monitoring
- Implement TLS for gRPC communication
- Service mesh integration (Istio, Linkerd)
- Cloud-hosted Qdrant for scalability

## Integration with Daveloper.dev Portfolio Platform

### NestJS gRPC Client Configuration
```typescript
// NestJS configuration for gRPC client
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AGENT_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'agent_service',
          protoPath: join(__dirname, 'proto/agent_service.proto'),
          url: 'localhost:50051',
        },
      },
    ]),
  ],
})
export class AgentModule {}
```

### Real-time Chat Service Integration
```typescript
// NestJS service with Redis streaming
import { Injectable, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import Redis from 'ioredis';

interface AgentService {
  sendMessage(data: ChatRequest): Observable<ChatResponse>;
  ingestDocuments(data: IngestRequest): Observable<IngestResponse>;
}

@Injectable()
export class ChatService {
  private agentService: AgentService;
  private redis: Redis;

  constructor(
    @Inject('AGENT_SERVICE') private client: ClientGrpc,
    @Inject('REDIS_CLIENT') private redisClient: Redis
  ) {
    this.redis = redisClient;
  }

  onModuleInit() {
    this.agentService = this.client.getService<AgentService>('AgentService');
  }

  async sendMessage(message: string, sessionId: string): Promise<void> {
    // Call agent service via gRPC
    const response = await this.agentService.sendMessage({ 
      message, 
      sessionId,
      use_tools: true 
    }).toPromise();
    
    // Stream tokens via Redis Pub/Sub
    await this.redis.publish('chat_tokens', JSON.stringify({
      sessionId,
      tokens: response.response,
      sources: response.sources,
      tool_calls: response.tool_calls
    }));
  }

  // WebSocket handler for real-time streaming
  handleWebSocketConnection(client: any, sessionId: string) {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe('chat_tokens');
    
    subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      if (data.sessionId === sessionId) {
        client.send(JSON.stringify(data));
      }
    });
  }
}
```

### Portfolio Platform Integration Requirements
- **WebSocket Management**: Handle real-time chat connections for portfolio visitors
- **Session Management**: Track chat sessions and conversation history
- **Redis Integration**: Stream tokens from agent-service to frontend
- **Error Handling**: Graceful handling of service failures
- **Performance**: Optimize for portfolio website performance
- **Brand Consistency**: Maintain Davel's persona across all interactions

---

This gRPC-based architecture provides a modern, scalable, and maintainable foundation for the Davel Agent while leveraging the extensive LangChain ecosystem and enabling efficient microservice communication through strongly-typed service contracts. 