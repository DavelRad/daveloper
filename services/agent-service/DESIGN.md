# Davel Agent Service - System Design

## Overview
The Davel Agent Service is a personal AI assistant that embodies Davel's persona, knowledge, and communication style for the Daveloper.dev portfolio platform. Built with LangChain and served via gRPC, it responds in first person as Davel, drawing from uploaded personal documents and live public profile data.

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

## Core Design Principles

### 1. **Persona-Driven Responses**
- All responses must be in first person as Davel
- Maintain consistent personality and communication style
- Draw from personal documents and live data sources

### 2. **Real-Time Streaming**
- Token-by-token streaming for responsive UX
- WebSocket-based communication for low latency
- Redis Pub/Sub for reliable message delivery

### 3. **Hybrid Intelligence**
- **RAG (Retrieval Augmented Generation)**: Document-based responses
- **Tool-Based**: Live data fetching from external APIs
- **Memory**: Conversation history and context preservation

### 4. **Microservice Architecture**
- gRPC for type-safe service communication
- Clear separation of concerns
- Independent scaling and deployment

## Component Design

### Agent Service Core

#### **Agent Orchestrator**
```python
class AgentOrchestrator:
    def __init__(self):
        self.rag_service = RAGService()
        self.tool_service = ToolService()
        self.memory_service = MemoryService()
        self.persona_service = PersonaService()
    
    async def process_message(self, message: str, session_id: str) -> StreamingResponse:
        # 1. Analyze intent and context
        # 2. Choose appropriate response strategy
        # 3. Execute and stream response
        # 4. Update memory and session
```

#### **Response Strategy Selection**
```python
class ResponseStrategy:
    RAG_ONLY = "rag_only"           # Document-based questions
    TOOL_ONLY = "tool_only"         # Live data requests
    HYBRID = "hybrid"               # Combined approach
    MEMORY_ONLY = "memory_only"     # Conversation continuation
```

### RAG Service Design

#### **Document Processing Pipeline**
```
Document Upload → Text Extraction → Chunking → Embedding → Vector Storage
```

#### **Retrieval Strategy**
- **Semantic Search**: Find relevant document chunks
- **Source Attribution**: Track document sources
- **Context Assembly**: Combine multiple chunks intelligently

#### **Response Generation**
- **Persona Prompting**: Ensure Davel's voice
- **Context Integration**: Seamlessly blend retrieved information
- **Source Citation**: Provide transparency

### Tool Service Design

#### **Tool Categories**
1. **GitHub Tools**: Profile, repositories, commits
2. **Portfolio Tools**: Project data, live updates
3. **Web Search**: Current information (optional)
4. **Custom Tools**: Davel-specific data sources

#### **Tool Execution**
```python
class ToolExecutor:
    async def execute_tool(self, tool_name: str, params: dict) -> ToolResult:
        # Validate parameters
        # Execute tool with timeout
        # Format result for LLM consumption
        # Handle errors gracefully
```

### Memory Service Design

#### **Memory Types**
- **Conversation Memory**: Chat history per session
- **Session Memory**: User preferences and context
- **Long-term Memory**: Persistent user data

#### **Memory Storage**
- **Redis**: Fast access for active sessions
- **Supabase**: Persistent storage for long-term data
- **Vector Store**: Semantic memory for context retrieval

### Streaming Architecture

#### **Token Streaming Pipeline**
```
LLM Generation → Token Buffer → Redis Pub/Sub → WebSocket → Frontend
```

#### **Metadata Streaming**
- Tool calls and results
- Source citations
- Reasoning steps
- Processing status

## Data Flow Design

### Chat Request Flow
1. **Frontend** sends message via WebSocket
2. **NestJS Gateway** validates and routes to Agent Service
3. **Agent Service** analyzes intent and selects strategy
4. **RAG/Tool Services** execute based on strategy
5. **Response** streams back via Redis → WebSocket → Frontend
6. **Memory** updated with conversation context

### Document Ingestion Flow
1. **Upload** documents via gRPC
2. **Process** documents with LangChain loaders
3. **Chunk** documents semantically
4. **Embed** chunks and store in Qdrant
5. **Index** for fast retrieval
6. **Notify** completion status

## Security Design

### **Authentication & Authorization**
- gRPC interceptors for service-to-service auth
- API key validation for external services
- Session-based user authentication

### **Data Privacy**
- Personal documents encrypted at rest
- Secure transmission via TLS
- No sensitive data in logs
- GDPR-compliant data handling

### **Rate Limiting**
- Per-session request limits
- Tool execution rate limiting
- LLM API rate limiting
- DDoS protection

## Performance Design

### **Caching Strategy**
- **Redis Cache**: Session data, tool results
- **Vector Cache**: Frequently accessed embeddings
- **Response Cache**: Similar question responses

### **Scaling Strategy**
- **Horizontal Scaling**: Multiple agent service instances
- **Load Balancing**: gRPC client-side load balancing
- **Database Sharding**: Vector store partitioning
- **CDN**: Static document delivery

### **Monitoring & Observability**
- **Metrics**: Request latency, success rates, tool usage
- **Tracing**: Distributed tracing across services
- **Logging**: Structured logging with correlation IDs
- **Health Checks**: Service and dependency health

## Technology Stack

### **Core Framework**
- **Python 3.11+**: Main runtime
- **FastAPI**: HTTP server (optional)
- **gRPC**: Service communication
- **LangChain**: AI framework

### **AI/ML Stack**
- **OpenAI GPT-4**: Primary LLM
- **OpenAI Embeddings**: Text embeddings
- **Qdrant Cloud**: Vector database
- **LangSmith**: Tracing and debugging

### **Data Layer**
- **Redis**: Caching and Pub/Sub
- **Supabase**: Persistent storage
- **Qdrant**: Vector storage

### **Infrastructure**
- **Docker**: Containerization
- **Docker Compose**: Local development
- **Kubernetes**: Production orchestration

## Design Decisions

### **Why gRPC?**
- **Type Safety**: Protobuf schemas prevent runtime errors
- **Performance**: Binary protocol, HTTP/2 multiplexing
- **Streaming**: Native support for real-time communication
- **Service Discovery**: Easy integration with service mesh

### **Why LangChain?**
- **Tool Integration**: Seamless tool calling
- **Memory Management**: Built-in conversation memory
- **Document Processing**: Rich document loader ecosystem
- **Agent Framework**: Flexible agent orchestration

### **Why Redis Pub/Sub?**
- **Real-time**: Low-latency message delivery
- **Reliability**: Persistent message queues
- **Scalability**: Horizontal scaling support
- **Flexibility**: Multiple subscriber patterns

### **Why Qdrant Cloud?**
- **Performance**: Fast similarity search
- **Scalability**: Cloud-native vector database
- **Features**: Filtering, metadata support
- **Integration**: Native LangChain support

## Future Design Considerations

### **Multi-Modal Support**
- Image and document understanding
- Voice input/output capabilities
- Video content processing

### **Advanced Memory**
- Episodic memory for long conversations
- Semantic memory for knowledge retention
- Emotional memory for personalized responses

### **Enhanced Tools**
- Calendar integration
- Email management
- Social media monitoring
- Real-time notifications

### **Personalization**
- Learning user preferences
- Adaptive response styles
- Contextual awareness
- Proactive suggestions 