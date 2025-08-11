import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RateLimitConfig, RateLimitRule, getRateLimitConfig } from '../config/rate-limit.config';

export interface RateLimitResult {
  allowed: boolean;
  totalRequests: number;
  remainingRequests: number;
  resetTime: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds to wait before retry
}

export interface RateLimitInfo {
  key: string;
  rule: RateLimitRule;
  identifier: string;
  type: 'global' | 'ip' | 'session' | 'endpoint' | 'websocket';
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly config: RateLimitConfig;

  constructor(private readonly redisService: RedisService) {
    this.config = getRateLimitConfig();
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(info: RateLimitInfo): Promise<RateLimitResult> {
    try {
      const { key, rule, identifier, type } = info;
      const now = Date.now();
      const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
      const windowEnd = windowStart + rule.windowMs;
      const resetTime = Math.ceil(windowEnd / 1000);

      // Get current count for this window
      const currentCount = await this.getCurrentCount(key, windowStart, rule.windowMs);
      
      // Check if limit exceeded
      const allowed = currentCount < rule.maxRequests;
      const remainingRequests = Math.max(0, rule.maxRequests - currentCount - 1);

      this.logger.debug(`Rate limit check - ${type}:${identifier} - Count: ${currentCount}/${rule.maxRequests}, Allowed: ${allowed}`);

      const result: RateLimitResult = {
        allowed,
        totalRequests: rule.maxRequests,
        remainingRequests: allowed ? remainingRequests : 0,
        resetTime,
      };

      // Add retry after if not allowed
      if (!allowed) {
        result.retryAfter = Math.ceil((windowEnd - now) / 1000);
      }

      return result;
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${info.type}:${info.identifier}:`, error);
      // Default to allowing the request if rate limiting fails
      return {
        allowed: true,
        totalRequests: info.rule.maxRequests,
        remainingRequests: info.rule.maxRequests - 1,
        resetTime: Math.ceil((Date.now() + info.rule.windowMs) / 1000),
      };
    }
  }

  /**
   * Record a request for rate limiting
   */
  async recordRequest(info: RateLimitInfo): Promise<void> {
    try {
      const { key, rule } = info;
      const now = Date.now();
      const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;

      // Increment counter for this window
      await this.incrementCount(key, windowStart, rule.windowMs);
      
      this.logger.debug(`Recorded request for ${info.type}:${info.identifier}`);
    } catch (error) {
      this.logger.error(`Failed to record request for ${info.type}:${info.identifier}:`, error);
    }
  }

  /**
   * Check rate limit for IP address
   */
  async checkIPRateLimit(ipAddress: string): Promise<RateLimitResult> {
    const key = this.getIPKey(ipAddress);
    return this.checkRateLimit({
      key,
      rule: this.config.perIP,
      identifier: ipAddress,
      type: 'ip',
    });
  }

  /**
   * Record request for IP address
   */
  async recordIPRequest(ipAddress: string): Promise<void> {
    const key = this.getIPKey(ipAddress);
    return this.recordRequest({
      key,
      rule: this.config.perIP,
      identifier: ipAddress,
      type: 'ip',
    });
  }

  /**
   * Check rate limit for session
   */
  async checkSessionRateLimit(sessionId: string): Promise<RateLimitResult> {
    const key = this.getSessionKey(sessionId);
    return this.checkRateLimit({
      key,
      rule: this.config.perSession,
      identifier: sessionId,
      type: 'session',
    });
  }

  /**
   * Record request for session
   */
  async recordSessionRequest(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    return this.recordRequest({
      key,
      rule: this.config.perSession,
      identifier: sessionId,
      type: 'session',
    });
  }

  /**
   * Check rate limit for specific endpoint
   */
  async checkEndpointRateLimit(method: string, path: string, identifier: string): Promise<RateLimitResult> {
    const endpointKey = `${method} ${path}`;
    const rule = this.getEndpointRule(endpointKey);
    
    if (!rule) {
      // No specific rule, use global rate limit
      return this.checkGlobalRateLimit(identifier);
    }

    const key = this.getEndpointKey(endpointKey, identifier);
    return this.checkRateLimit({
      key,
      rule,
      identifier: `${endpointKey}:${identifier}`,
      type: 'endpoint',
    });
  }

  /**
   * Record request for specific endpoint
   */
  async recordEndpointRequest(method: string, path: string, identifier: string): Promise<void> {
    const endpointKey = `${method} ${path}`;
    const rule = this.getEndpointRule(endpointKey);
    
    if (!rule) {
      // No specific rule, use global rate limit
      return this.recordGlobalRequest(identifier);
    }

    const key = this.getEndpointKey(endpointKey, identifier);
    return this.recordRequest({
      key,
      rule,
      identifier: `${endpointKey}:${identifier}`,
      type: 'endpoint',
    });
  }

  /**
   * Check global rate limit
   */
  async checkGlobalRateLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.getGlobalKey(identifier);
    return this.checkRateLimit({
      key,
      rule: this.config.global,
      identifier,
      type: 'global',
    });
  }

  /**
   * Record global request
   */
  async recordGlobalRequest(identifier: string): Promise<void> {
    const key = this.getGlobalKey(identifier);
    return this.recordRequest({
      key,
      rule: this.config.global,
      identifier,
      type: 'global',
    });
  }

  /**
   * Check WebSocket connection rate limit
   */
  async checkWebSocketConnectionLimit(ipAddress: string): Promise<RateLimitResult> {
    const key = this.getWebSocketConnectionKey(ipAddress);
    return this.checkRateLimit({
      key,
      rule: this.config.websocket.connectionsPerIP,
      identifier: ipAddress,
      type: 'websocket',
    });
  }

  /**
   * Record WebSocket connection
   */
  async recordWebSocketConnection(ipAddress: string): Promise<void> {
    const key = this.getWebSocketConnectionKey(ipAddress);
    return this.recordRequest({
      key,
      rule: this.config.websocket.connectionsPerIP,
      identifier: ipAddress,
      type: 'websocket',
    });
  }

  /**
   * Check WebSocket message rate limit
   */
  async checkWebSocketMessageLimit(sessionId: string): Promise<RateLimitResult> {
    const key = this.getWebSocketMessageKey(sessionId);
    return this.checkRateLimit({
      key,
      rule: this.config.websocket.messagesPerSession,
      identifier: sessionId,
      type: 'websocket',
    });
  }

  /**
   * Record WebSocket message
   */
  async recordWebSocketMessage(sessionId: string): Promise<void> {
    const key = this.getWebSocketMessageKey(sessionId);
    return this.recordRequest({
      key,
      rule: this.config.websocket.messagesPerSession,
      identifier: sessionId,
      type: 'websocket',
    });
  }

  /**
   * Check if IP is whitelisted
   */
  isIPWhitelisted(ipAddress: string): boolean {
    return this.config.skip.whitelistedIPs.includes(ipAddress);
  }

  /**
   * Check if endpoint should skip rate limiting
   */
  shouldSkipEndpoint(path: string): boolean {
    return this.config.skip.healthCheckEndpoints.some(endpoint => 
      path === endpoint || path.startsWith(endpoint + '/')
    );
  }

  /**
   * Get rate limit configuration
   */
  getConfig(): RateLimitConfig {
    return this.config;
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetRateLimit(type: string, identifier: string): Promise<void> {
    try {
      let key: string;
      
      switch (type) {
        case 'ip':
          key = this.getIPKey(identifier);
          break;
        case 'session':
          key = this.getSessionKey(identifier);
          break;
        case 'global':
          key = this.getGlobalKey(identifier);
          break;
        default:
          throw new Error(`Unknown rate limit type: ${type}`);
      }
      
      // Delete all keys matching the pattern
      const pattern = `${key}:*`;
      const keys = await this.redisService.keys(pattern);
      
      if (keys.length > 0) {
        await this.redisService.del(...keys);
        this.logger.log(`Reset rate limit for ${type}:${identifier} (${keys.length} keys cleared)`);
      }
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for ${type}:${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Get current count for a time window
   */
  private async getCurrentCount(key: string, windowStart: number, windowMs: number): Promise<number> {
    const windowKey = `${key}:${windowStart}`;
    const countStr = await this.redisService.get(windowKey);
    return countStr ? parseInt(countStr) : 0;
  }

  /**
   * Increment count for a time window
   */
  private async incrementCount(key: string, windowStart: number, windowMs: number): Promise<number> {
    const windowKey = `${key}:${windowStart}`;
    const ttl = Math.ceil(windowMs / 1000) + 1; // Add 1 second buffer
    
    const count = await this.redisService.incr(windowKey);
    
    // Set expiry only if this is the first increment
    if (count === 1) {
      await this.redisService.expire(windowKey, ttl);
    }
    
    return count;
  }

  /**
   * Get endpoint rule by matching endpoint key
   */
  private getEndpointRule(endpointKey: string): RateLimitRule | null {
    // Direct match first
    if (this.config.endpoints[endpointKey]) {
      return this.config.endpoints[endpointKey];
    }
    
    // Pattern matching (e.g., "GET /health/*")
    for (const [pattern, rule] of Object.entries(this.config.endpoints)) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (endpointKey.startsWith(prefix)) {
          return rule;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate Redis key for IP rate limiting
   */
  private getIPKey(ipAddress: string): string {
    return `rate_limit:ip:${ipAddress}`;
  }

  /**
   * Generate Redis key for session rate limiting
   */
  private getSessionKey(sessionId: string): string {
    return `rate_limit:session:${sessionId}`;
  }

  /**
   * Generate Redis key for endpoint rate limiting
   */
  private getEndpointKey(endpointKey: string, identifier: string): string {
    const safeEndpoint = endpointKey.replace(/[^a-zA-Z0-9]/g, '_');
    return `rate_limit:endpoint:${safeEndpoint}:${identifier}`;
  }

  /**
   * Generate Redis key for global rate limiting
   */
  private getGlobalKey(identifier: string): string {
    return `rate_limit:global:${identifier}`;
  }

  /**
   * Generate Redis key for WebSocket connection rate limiting
   */
  private getWebSocketConnectionKey(ipAddress: string): string {
    return `rate_limit:ws_conn:${ipAddress}`;
  }

  /**
   * Generate Redis key for WebSocket message rate limiting
   */
  private getWebSocketMessageKey(sessionId: string): string {
    return `rate_limit:ws_msg:${sessionId}`;
  }

  /**
   * Health check for rate limit service
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test basic Redis operations
      const testKey = 'rate_limit:health:test';
      await this.redisService.set(testKey, '1');
      await this.redisService.incr(testKey);
      const result = await this.redisService.get(testKey);
      await this.redisService.del(testKey);
      
      return result === '2';
    } catch (error) {
      this.logger.error('Rate limit service health check failed:', error);
      return false;
    }
  }
}
