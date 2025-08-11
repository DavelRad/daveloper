/**
 * Cache Configuration
 * Defines cache TTLs, strategies, and performance settings
 */
export interface CacheConfig {
  // Default TTL settings (in seconds)
  defaultTtl: number;
  
  // Specific TTLs for different data types
  ttl: {
    // API Response caching
    agentChat: number;
    agentTools: number;
    documentList: number;
    documentStatus: number;
    scraperStatus: number;
    healthCheck: number;
    
    // Session data caching
    sessionData: number;
    sessionHistory: number;
    
    // Performance data
    metrics: number;
    
    // Long-term caching
    staticData: number;
  };
  
  // Cache key prefixes
  keyPrefixes: {
    response: string;
    session: string;
    metrics: string;
    health: string;
    user: string;
  };
  
  // Performance settings
  performance: {
    maxMemoryUsage: number; // in MB
    compressionThreshold: number; // in bytes
    enableCompression: boolean;
    maxKeyLength: number;
    maxValueSize: number; // in bytes
  };
  
  // Cache invalidation settings
  invalidation: {
    enablePatternInvalidation: boolean;
    batchInvalidationSize: number;
    enableTimeBasedInvalidation: boolean;
  };
  
  // Monitoring settings
  monitoring: {
    enableMetrics: boolean;
    hitRateThreshold: number; // minimum acceptable hit rate (0-1)
    logCacheOperations: boolean;
    enableAlerts: boolean;
  };
}

export const defaultCacheConfig: CacheConfig = {
  defaultTtl: 300, // 5 minutes
  
  ttl: {
    // API Response caching (shorter for dynamic data)
    agentChat: 60, // 1 minute - chat responses are unique
    agentTools: 3600, // 1 hour - tool list rarely changes
    documentList: 300, // 5 minutes - document list may change
    documentStatus: 30, // 30 seconds - status changes frequently
    scraperStatus: 15, // 15 seconds - scraper status changes rapidly
    healthCheck: 60, // 1 minute - health status
    
    // Session data caching (medium duration)
    sessionData: 1800, // 30 minutes - session data
    sessionHistory: 3600, // 1 hour - chat history
    
    // Performance data (shorter for accuracy)
    metrics: 300, // 5 minutes - metrics data
    
    // Long-term caching (rarely changing data)
    staticData: 86400, // 24 hours - configuration, static content
  },
  
  keyPrefixes: {
    response: 'cache:response',
    session: 'cache:session',
    metrics: 'cache:metrics',
    health: 'cache:health',
    user: 'cache:user',
  },
  
  performance: {
    maxMemoryUsage: 512, // 512MB max cache size
    compressionThreshold: 1024, // compress values > 1KB
    enableCompression: true,
    maxKeyLength: 250,
    maxValueSize: 10 * 1024 * 1024, // 10MB max value size
  },
  
  invalidation: {
    enablePatternInvalidation: true,
    batchInvalidationSize: 100,
    enableTimeBasedInvalidation: true,
  },
  
  monitoring: {
    enableMetrics: true,
    hitRateThreshold: 0.7, // 70% minimum hit rate
    logCacheOperations: false, // Set to true in development
    enableAlerts: true,
  },
};

/**
 * Get cache configuration from environment variables
 * Allows runtime configuration override
 */
export function getCacheConfig(): CacheConfig {
  const config = { ...defaultCacheConfig };
  
  // Override with environment variables if present
  if (process.env.CACHE_DEFAULT_TTL) {
    config.defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL);
  }
  
  if (process.env.CACHE_MAX_MEMORY) {
    config.performance.maxMemoryUsage = parseInt(process.env.CACHE_MAX_MEMORY);
  }
  
  if (process.env.CACHE_ENABLE_COMPRESSION !== undefined) {
    config.performance.enableCompression = process.env.CACHE_ENABLE_COMPRESSION === 'true';
  }
  
  if (process.env.CACHE_ENABLE_METRICS !== undefined) {
    config.monitoring.enableMetrics = process.env.CACHE_ENABLE_METRICS === 'true';
  }
  
  if (process.env.CACHE_LOG_OPERATIONS !== undefined) {
    config.monitoring.logCacheOperations = process.env.CACHE_LOG_OPERATIONS === 'true';
  }
  
  return config;
}

/**
 * Cache key generators for different data types
 */
export class CacheKeyGenerator {
  private static readonly config = getCacheConfig();
  
  static response(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    const key = `${this.config.keyPrefixes.response}:${endpoint}:${this.hashParams(paramStr)}`;
    return this.validateKey(key);
  }
  
  static session(sessionId: string, type: string): string {
    const key = `${this.config.keyPrefixes.session}:${type}:${sessionId}`;
    return this.validateKey(key);
  }
  
  static metrics(type: string, timeWindow?: string): string {
    const window = timeWindow || 'current';
    const key = `${this.config.keyPrefixes.metrics}:${type}:${window}`;
    return this.validateKey(key);
  }
  
  static health(service: string): string {
    const key = `${this.config.keyPrefixes.health}:${service}`;
    return this.validateKey(key);
  }
  
  static user(userId: string, type: string): string {
    const key = `${this.config.keyPrefixes.user}:${type}:${userId}`;
    return this.validateKey(key);
  }
  
  private static hashParams(params: string): string {
    if (!params) return 'no-params';
    
    // Simple hash function for parameter consistency
    let hash = 0;
    for (let i = 0; i < params.length; i++) {
      const char = params.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  private static validateKey(key: string): string {
    if (key.length > this.config.performance.maxKeyLength) {
      throw new Error(`Cache key too long: ${key.length} > ${this.config.performance.maxKeyLength}`);
    }
    return key;
  }
}
