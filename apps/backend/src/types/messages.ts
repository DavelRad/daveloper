/**
 * WebSocket message type definitions for the API Gateway
 */

export interface LogMessage {
  jobId: string;
  timestamp: string;
  msg: string;
  level?: 'info' | 'error' | 'warning' | 'debug';
}

export interface ChatMessage {
  sessionId: string;
  token: string;
  done: boolean;
  error?: boolean;
  metadata?: {
    toolCalls?: string[];
    sources?: string[];
    reasoning?: string;
  };
}

export interface ErrorMessage {
  error: true;
  code: string;
  message: string;
  timestamp: string;
}

export interface ScrapeRequest {
  source: string;
  maxArticles?: number;
  categories?: string[];
}

export interface ScrapeResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  message: string;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  useTools?: boolean;
  maxTokens?: number;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    redis: boolean;
    scraper: boolean;
    agent: boolean;
    document: boolean;
    session: boolean;
    rateLimit: boolean;
    supabase: boolean;
  };
} 