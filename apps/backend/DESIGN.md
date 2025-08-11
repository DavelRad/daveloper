# 🏗️ **Backend Design Document**

## **Overview**
The Daveloper backend is a **hybrid microservices architecture** built with NestJS as an API Gateway that orchestrates Python AI microservices via gRPC. The system provides real-time AI chat capabilities, document processing, and web scraping with WebSocket support for live updates.

## **🏛️ Architecture Principles**

### **1. API Gateway Pattern**
- **Single Entry Point**: All client requests go through NestJS
- **Service Orchestration**: NestJS routes requests to appropriate microservices
- **Protocol Translation**: HTTP/REST ↔ gRPC ↔ WebSocket
- **Load Balancing**: Future-ready for horizontal scaling

### **2. Microservices Communication**
- **gRPC**: High-performance inter-service communication
- **Protocol Buffers**: Strongly-typed data contracts
- **Bidirectional Streaming**: Real-time data flow
- **Service Discovery**: Dynamic service registration

### **3. Real-Time First**
- **WebSocket Priority**: Primary communication channel
- **Redis Pub/Sub**: Message distribution and caching
- **Event-Driven**: Asynchronous processing
- **Live Updates**: Real-time user experience

## **🔧 System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   External API  │
│   (Next.js)     │    │   (React Native)│    │   Consumers     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API Gateway                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │   REST API  │ │  WebSocket  │ │   Health   │ │  Admin   │ │
│  │  Controllers│ │  Gateways   │ │  Checks    │ │  Panel   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        gRPC Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │   Agent     │ │   Scraper   │ │  Document  │ │  Vector  │ │
│  │  Service    │ │  Service    │ │  Service   │ │  Service │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │    Redis    │ │   Qdrant    │ │   OpenAI    │ │  GitHub  │ │
│  │  (Cache +   │ │ (Vector DB) │ │   (LLM)    │ │   API    │ │
│  │   Pub/Sub)  │ │             │ │             │ │          │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## **📡 Communication Patterns**

### **1. Client → Backend**
```
HTTP Request → NestJS Controller → Service → gRPC Call → Python Microservice
WebSocket → NestJS Gateway → Redis Pub/Sub → Python Microservice
```

### **2. Backend → Client**
```
Python Microservice → gRPC Response → NestJS Service → HTTP Response
Python Microservice → Redis Pub/Sub → NestJS Gateway → WebSocket → Client
```

### **3. Inter-Service**
```
Service A → gRPC → Service B
Service A → Redis Pub/Sub → Service B
Service A → Direct HTTP → Service B (for external APIs)
```

## **🏗️ Component Design**

### **1. NestJS API Gateway**

#### **Core Modules**
- **AppModule**: Main application orchestrator
- **AgentModule**: AI agent service integration
- **ScraperModule**: Web scraping service integration
- **SessionModule**: Session-based messaging management
- **RedisModule**: Caching and pub/sub management
- **HealthModule**: System health monitoring

#### **Controllers**
- **HealthController**: System status and health checks
- **AgentController**: AI chat and agent management
- **ScraperController**: Web scraping job management
- **DocumentController**: Document processing management

#### **Services**
- **AgentService**: gRPC client for agent service
- **ScraperService**: gRPC client for scraper service
- **SessionService**: Session-based message management
- **RedisService**: Redis operations and pub/sub
- **HealthService**: Health check orchestration

#### **Gateways**
- **ChatGateway**: Real-time chat communication
- **LogsGateway**: Real-time log streaming

### **2. gRPC Integration Layer**

#### **Service Clients**
- **AgentServiceClient**: AI agent communication
- **ScraperServiceClient**: Web scraping communication
- **DocumentServiceClient**: Document processing communication

#### **Protocol Buffers**
- **agent_service.proto**: AI agent service contracts
- **scraper_service.proto**: Web scraping service contracts
- **common.proto**: Shared message types
- **chat.proto**: Chat message contracts

### **3. Infrastructure Services**

#### **Redis Service**
- **Caching**: Response caching and session storage
- **Pub/Sub**: Real-time message distribution
- **Rate Limiting**: Request throttling by IP/session
- **Session Storage**: Anonymous session data persistence

#### **Health Monitoring**
- **Service Health**: Individual service status
- **Dependency Health**: External service status
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Error rates and patterns

## **🔒 Security Design**

### **1. Session & API Security**
- **Session-Based Messaging**: Browser session management
- **API Key Management**: External API access control
- **Session Security**: Secure session handling and cleanup
- **No User Accounts**: Anonymous session-based access

### **2. Input Validation**
- **Request Validation**: DTO-based validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Rate Limiting**: Abuse prevention

### **3. Data Protection**
- **Encryption**: Data in transit and at rest
- **PII Handling**: Personal data protection
- **Audit Logging**: Access and modification tracking
- **Data Retention**: Automated cleanup policies

## **📊 Data Flow Design**

### **1. Chat Flow**
```
User Input → WebSocket → ChatGateway → Session Service → Redis Pub/Sub → Agent Service
Agent Service → gRPC Response → Redis Pub/Sub → ChatGateway → Session Service → WebSocket → User
```

### **2. Document Processing Flow**
```
File Upload → HTTP → DocumentController → gRPC → Document Service
Document Service → Vector Service → Qdrant → Success Response
```

### **3. Scraping Flow**
```
Scrape Request → HTTP → ScraperController → gRPC → Scraper Service
Scraper Service → External APIs → Processing → Redis Pub/Sub → LogsGateway
```

## **🚀 Performance Design**

### **1. Caching Strategy**
- **Response Caching**: Frequently requested data
- **Session Caching**: User session data
- **Tool Result Caching**: External API responses
- **Vector Caching**: Document embeddings

### **2. Load Balancing**
- **Horizontal Scaling**: Multiple NestJS instances
- **Service Discovery**: Dynamic service registration
- **Health Checks**: Automatic failover
- **Circuit Breakers**: Fault tolerance

### **3. Async Processing**
- **Background Jobs**: Long-running tasks
- **Event Queues**: Message processing
- **Streaming Responses**: Real-time data flow
- **Connection Pooling**: Database optimization

## **🔧 Configuration Management**

### **1. Environment Configuration**
- **Development**: Local development settings
- **Staging**: Pre-production testing
- **Production**: Live environment settings
- **Docker**: Containerized configuration

### **2. Service Configuration**
- **gRPC Endpoints**: Service addresses and ports
- **Redis Configuration**: Connection settings
- **API Keys**: External service credentials
- **Feature Flags**: A/B testing and rollouts

### **3. Dynamic Configuration**
- **Runtime Updates**: Configuration hot-reloading
- **Feature Toggles**: Dynamic feature enablement
- **A/B Testing**: Traffic splitting
- **Monitoring**: Configuration change tracking

## **📈 Monitoring & Observability**

### **1. Metrics Collection**
- **Application Metrics**: Request rates, response times
- **Business Metrics**: User engagement, feature usage
- **Infrastructure Metrics**: CPU, memory, network
- **Custom Metrics**: Business-specific KPIs

### **2. Logging Strategy**
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Debug, info, warn, error
- **Correlation IDs**: Request tracing
- **Log Aggregation**: Centralized log storage

### **3. Distributed Tracing**
- **Request Tracing**: End-to-end request flow
- **Service Dependencies**: Inter-service communication
- **Performance Analysis**: Bottleneck identification
- **Error Tracking**: Root cause analysis

## **🧪 Testing Strategy**

### **1. Test Types**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **End-to-End Tests**: Full system testing
- **Performance Tests**: Load and stress testing

### **2. Test Environment**
- **Test Data**: Isolated test datasets
- **Mock Services**: External service simulation
- **Test Databases**: Isolated data storage
- **CI/CD Integration**: Automated testing pipeline

### **3. Quality Gates**
- **Code Coverage**: Minimum 80% coverage
- **Performance Benchmarks**: Response time targets
- **Security Scans**: Vulnerability detection
- **Dependency Checks**: Security updates

## **🚀 Deployment & DevOps**

### **1. Containerization**
- **Docker Images**: Service containerization
- **Multi-Stage Builds**: Optimized image sizes
- **Health Checks**: Container health monitoring
- **Resource Limits**: Memory and CPU constraints

### **2. Orchestration**
- **Docker Compose**: Local development
- **Kubernetes**: Production deployment
- **Service Mesh**: Inter-service communication
- **Auto-scaling**: Dynamic resource allocation

### **3. CI/CD Pipeline**
- **Automated Testing**: Pre-deployment validation
- **Security Scanning**: Vulnerability detection
- **Automated Deployment**: Zero-downtime updates
- **Rollback Strategy**: Quick failure recovery

## **🔮 Future Considerations**

### **1. Scalability**
- **Microservices**: Service decomposition
- **Event Sourcing**: Event-driven architecture
- **CQRS**: Command-query responsibility separation
- **API Versioning**: Backward compatibility**

### **2. Advanced Features**
- **GraphQL**: Flexible data querying
- **Real-time Analytics**: Live data insights
- **Machine Learning**: Predictive capabilities
- **Multi-tenancy**: Multi-organization support

### **3. Integration**
- **Third-party APIs**: External service integration
- **Webhooks**: Event-driven integrations
- **Message Queues**: Asynchronous processing
- **API Marketplace**: Service discovery

---

## **📋 Design Decisions Log**

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|-------------------------|
| 2024-01 | NestJS + gRPC | Type safety, performance, real-time support | Express + REST, FastAPI + gRPC |
| 2024-01 | Redis Pub/Sub | Real-time messaging, caching, session storage | RabbitMQ, Apache Kafka |
| 2024-01 | WebSocket First | Real-time user experience, live updates | Server-Sent Events, Long Polling |
| 2024-01 | Protocol Buffers | Strong typing, performance, versioning | JSON Schema, OpenAPI |

---

*This design document should be updated as the system evolves and new requirements emerge.*
