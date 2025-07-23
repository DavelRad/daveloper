# Daveloper.dev — Technical Reference

> **Purpose**  
> A live-demo portfolio platform that brings together Davel’s full-stack work into one interactive site:
> 1. **News Scraper Pipeline** with real-time streaming logs  
> 2. **Davel Agent Chat** (RAG-powered AI assistant)  
> 3. **Static sections**: Life Path timeline, Skills strip, Featured Projects  

---

## 1. Architecture Overview

```mermaid
flowchart TB
  subgraph Frontend
    direction LR
    NextJS[Next.js Frontend]
    NextJS -->|HTTP REST| NestJS[NestJS API]
    NextJS -->|WS logs| LogWS[Log WS]
    NextJS -->|WS chat| ChatWS[Chat WS]
  end

  subgraph API
    direction TB
    NestJS -->|Queue jobs| RedisQueue[Redis Queue]
    NestJS -->|Pub logs| RedisPS[Redis Pub/Sub]
    NestJS -->|gRPC scrape| ScraperSvc[Scraper Service]
    NestJS -->|gRPC chat| AgentSvc[Agent Service]
    NestJS -->|Persist meta| Supabase[Supabase Postgres]
  end

  subgraph Services
    direction LR
    ScraperSvc -->|AI & DB| Mongo[MongoDB Atlas]
    ScraperSvc -->|AI calls| Perplexity[Perplexity AI]
    ScraperSvc -->|logs→| RedisPS
    AgentSvc   -->|vectors→| VectorDB[Vector DB]
    AgentSvc   -->|LLM calls| LLM[OpenAI/Perplexity]
    AgentSvc   -->|tokens→| ChatPS[Redis ChatPubSub]
  end

  subgraph Data
    direction LR
    RedisQueue --- RedisPS --- ChatPS --- Supabase --- Mongo --- VectorDB --- LLM --- Perplexity
  end

  RedisPS --> LogWS
  ChatPS  --> ChatWS


⸻

2. Zones & Responsibilities
	•	Next.js Frontend
	•	Renders UI sections (Hero, Timeline, Skills, Projects, Scraper demo, Chat widget)
	•	Triggers scraper via REST, subscribes to two WebSocket channels for logs and chat
	•	NestJS API
	•	Orchestrates between frontend and services
	•	Enqueues scrape jobs, persists metadata, publishes and relays logs
	•	Forwards chat requests to the Agent service and streams responses
	•	Background Services
	•	Scraper Service (Python)
	•	Receives jobs (gRPC or Redis), scrapes news, calls AI for summaries, stores results, emits logs
	•	Agent Service (Python + LangChain)
	•	Handles RAG chat via gRPC, looks up embeddings, calls LLM, streams tokens
	•	Data Layer
	•	Redis for job queue and real-time Pub/Sub
	•	Supabase (Postgres) for structured job/chat metadata
	•	MongoDB Atlas for raw and summarized articles
	•	Vector DB for embeddings
	•	LLM APIs (OpenAI / Perplexity)

⸻

3. Communication Patterns

Flow	Protocol	Notes
Frontend → API (scrape)	HTTP/REST	enqueue job, get jobId
API → Scraper Service	gRPC (unary/stream)	start job, stream logs
API → Agent Service	gRPC (bi-directional)	chat request/response streams
Scraper → API logs	Redis Pub/Sub	LogLine → WebSocket clients
Agent → API chat	Redis Pub/Sub	ChatToken → WebSocket clients
API → Frontend (logs/chat)	WebSocket	live feed
API ↔ Supabase	HTTPS / JS SDK	metadata CRUD


⸻

4. End-to-End Flows

Scraper Job
	1.	User clicks Run Scraper
	2.	Frontend → POST /api/scrape { source }
	3.	API enqueues in Redis, records job in Supabase
	4.	Scraper Service picks up job, scrapes & summarizes, stores in MongoDB
	5.	Service publishes log entries → Redis Pub/Sub → API → WebSocket → Frontend

Chat Agent
	1.	User opens Chat widget, WebSocket /chat → subscribe
	2.	Frontend sends question
	3.	API calls Agent gRPC → streams tokens
	4.	Agent Service runs RAG, streams tokens → Redis Pub/Sub
	5.	API relays tokens → Frontend renders in real time

⸻

5. Tech Stack
	•	Frontend: Next.js · React · TypeScript · TailwindCSS · Framer Motion
	•	API: NestJS · TypeScript · ioredis · @supabase/supabase-js · @nestjs/microservices (gRPC)
	•	Services: Python · grpcio · LangChain · BeautifulSoup · asyncio
	•	Databases: Supabase Postgres · MongoDB Atlas · Qdrant/Pinecone (Vector DB)
	•	AI: OpenAI GPT-3.5/4 · Perplexity AI (Gemini)
	•	Orchestration: Docker + docker-compose

⸻

6. Key Environment Variables

# API
PORT=3001
REDIS_URL=redis://redis:6379
SUPABASE_URL=...
SUPABASE_KEY=...
GRPC_SCRAPER_URL=scraper-service:50051
GRPC_AGENT_URL=agent-service:50052

# Scraper Service
MONGO_URI=...
NEWSAPI_KEY=...

# Agent Service
OPENAI_API_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...


⸻

7. Observability & Security
	•	Logging: centralized via Redis → WebSocket; NestJS Logger for API
	•	Health Checks: REST /healthz and gRPC HealthCheck RPCs
	•	Security: rate limiting, CORS, optional API keys, TLS for gRPC in prod

⸻


This file is the single source of truth for Daveloper.dev’s architecture and high-level flows. Update it whenever core components or protocols change.

