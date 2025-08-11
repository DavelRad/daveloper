/**
 * Rate limiting configuration
 */

export interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip successful requests from count
  skipFailedRequests?: boolean; // Skip failed requests from count
}

export interface RateLimitConfig {
  // Global rate limits
  global: RateLimitRule;
  
  // Per-endpoint rate limits
  endpoints: {
    [key: string]: RateLimitRule;
  };
  
  // Per-IP rate limits
  perIP: RateLimitRule;
  
  // Per-session rate limits
  perSession: RateLimitRule;
  
  // WebSocket specific limits
  websocket: {
    connectionsPerIP: RateLimitRule;
    messagesPerSession: RateLimitRule;
  };
  
  // Rate limit response headers
  headers: {
    total: string; // Header name for total requests allowed
    remaining: string; // Header name for remaining requests
    reset: string; // Header name for reset time
    retryAfter: string; // Header name for retry after
  };
  
  // Skip rate limiting for certain conditions
  skip: {
    whitelistedIPs: string[];
    healthCheckEndpoints: string[];
  };
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes globally
  },
  
  endpoints: {
    // Health check endpoints - very permissive
    'GET /health': {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      skipSuccessfulRequests: true,
    },
    'GET /health/*': {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute
      skipSuccessfulRequests: true,
    },
    
    // Chat endpoints - moderate limits
    'POST /agent/chat': {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 20, // 20 messages per minute
    },
    'GET /agent/chat/history/*': {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 10, // 10 history requests per minute
    },
    
    // Document endpoints - stricter limits
    'POST /documents/ingest': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 5, // 5 uploads per 5 minutes
    },
    'POST /documents/ingest/file': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 file uploads per 5 minutes
    },
    'GET /documents': {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 30, // 30 list requests per minute
    },
    
    // Scraper endpoints - very strict limits
    'POST /scrape': {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 2, // 2 scrape jobs per 10 minutes
    },
  },
  
  perIP: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // 500 requests per IP per 15 minutes
  },
  
  perSession: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per session per minute
  },
  
  websocket: {
    connectionsPerIP: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 10, // 10 connections per IP per minute
    },
    messagesPerSession: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 25, // 25 messages per session per minute
    },
  },
  
  headers: {
    total: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    retryAfter: 'Retry-After',
  },
  
  skip: {
    whitelistedIPs: ['127.0.0.1', '::1'], // Localhost
    healthCheckEndpoints: ['/health', '/health/redis', '/health/agent', '/health/scraper', '/health/document', '/health/session'],
  },
};

/**
 * Environment-based rate limit configuration
 */
export function getRateLimitConfig(): RateLimitConfig {
  const config = { ...DEFAULT_RATE_LIMIT_CONFIG };
  
  // Override with environment variables if present
  if (process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) {
    config.global.windowMs = parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS);
  }
  
  if (process.env.RATE_LIMIT_GLOBAL_MAX_REQUESTS) {
    config.global.maxRequests = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX_REQUESTS);
  }
  
  if (process.env.RATE_LIMIT_PER_IP_WINDOW_MS) {
    config.perIP.windowMs = parseInt(process.env.RATE_LIMIT_PER_IP_WINDOW_MS);
  }
  
  if (process.env.RATE_LIMIT_PER_IP_MAX_REQUESTS) {
    config.perIP.maxRequests = parseInt(process.env.RATE_LIMIT_PER_IP_MAX_REQUESTS);
  }
  
  if (process.env.RATE_LIMIT_PER_SESSION_WINDOW_MS) {
    config.perSession.windowMs = parseInt(process.env.RATE_LIMIT_PER_SESSION_WINDOW_MS);
  }
  
  if (process.env.RATE_LIMIT_PER_SESSION_MAX_REQUESTS) {
    config.perSession.maxRequests = parseInt(process.env.RATE_LIMIT_PER_SESSION_MAX_REQUESTS);
  }
  
  if (process.env.RATE_LIMIT_WEBSOCKET_MESSAGES_MAX) {
    config.websocket.messagesPerSession.maxRequests = parseInt(process.env.RATE_LIMIT_WEBSOCKET_MESSAGES_MAX);
  }
  
  if (process.env.RATE_LIMIT_WHITELISTED_IPS) {
    config.skip.whitelistedIPs = process.env.RATE_LIMIT_WHITELISTED_IPS.split(',').map(ip => ip.trim());
  }
  
  return config;
}
