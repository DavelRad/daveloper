import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { getRateLimitConfig } from '../config/rate-limit.config';

interface RequestWithRateLimit extends Request {
  rateLimit?: {
    totalRequests: number;
    remainingRequests: number;
    resetTime: number;
    retryAfter?: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly config = getRateLimitConfig();

  constructor(private readonly rateLimitService: RateLimitService) {}

  async use(req: RequestWithRateLimit, res: Response, next: NextFunction) {
    try {
      const method = req.method;
      const path = req.path;
      const ipAddress = this.getClientIP(req);
      const sessionId = this.getSessionId(req);

      // Skip rate limiting for whitelisted IPs
      if (this.rateLimitService.isIPWhitelisted(ipAddress)) {
        this.logger.debug(`Skipping rate limit for whitelisted IP: ${ipAddress}`);
        return next();
      }

      // Skip rate limiting for certain endpoints
      if (this.rateLimitService.shouldSkipEndpoint(path)) {
        this.logger.debug(`Skipping rate limit for endpoint: ${path}`);
        return next();
      }

      // Check multiple rate limits in parallel
      const [ipResult, sessionResult, endpointResult] = await Promise.all([
        this.rateLimitService.checkIPRateLimit(ipAddress),
        sessionId ? this.rateLimitService.checkSessionRateLimit(sessionId) : null,
        this.rateLimitService.checkEndpointRateLimit(method, path, ipAddress),
      ]);

      // Find the most restrictive result
      const results = [ipResult, sessionResult, endpointResult].filter(Boolean);
      const mostRestrictive = results.reduce((prev, current) => {
        if (!prev) return current;
        if (!current) return prev;
        
        // If either is not allowed, use the one with lower remaining requests
        if (!prev.allowed || !current.allowed) {
          return prev.remainingRequests <= current.remainingRequests ? prev : current;
        }
        
        // Both are allowed, use the one with lower remaining requests
        return prev.remainingRequests <= current.remainingRequests ? prev : current;
      });

      if (!mostRestrictive) {
        this.logger.error('No rate limit result found');
        return next();
      }

      // Set rate limit headers
      this.setRateLimitHeaders(res, mostRestrictive);

      // Store rate limit info in request for later use
      req.rateLimit = mostRestrictive;

      // Check if request is allowed
      if (!mostRestrictive.allowed) {
        this.logger.warn(`Rate limit exceeded for IP: ${ipAddress}, Session: ${sessionId || 'none'}, Endpoint: ${method} ${path}`);
        
        throw new HttpException(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${mostRestrictive.retryAfter} seconds.`,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfter: mostRestrictive.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Record the request (don't await to avoid slowing down the request)
      this.recordRequest(method, path, ipAddress, sessionId).catch(error => {
        this.logger.error('Failed to record rate limit request:', error);
      });

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Rate limit middleware error:', error);
      // Continue with request if rate limiting fails
      next();
    }
  }

  /**
   * Record the request for rate limiting (async, non-blocking)
   */
  private async recordRequest(method: string, path: string, ipAddress: string, sessionId?: string): Promise<void> {
    try {
      const promises = [
        this.rateLimitService.recordIPRequest(ipAddress),
        this.rateLimitService.recordEndpointRequest(method, path, ipAddress),
      ];

      if (sessionId) {
        promises.push(this.rateLimitService.recordSessionRequest(sessionId));
      }

      await Promise.all(promises);
    } catch (error) {
      this.logger.error('Failed to record rate limit requests:', error);
    }
  }

  /**
   * Set rate limit headers in response
   */
  private setRateLimitHeaders(res: Response, result: any): void {
    const headers = this.config.headers;
    
    res.set(headers.total, result.totalRequests.toString());
    res.set(headers.remaining, result.remainingRequests.toString());
    res.set(headers.reset, result.resetTime.toString());
    
    if (result.retryAfter) {
      res.set(headers.retryAfter, result.retryAfter.toString());
    }
  }

  /**
   * Extract client IP address
   */
  private getClientIP(req: Request): string {
    // Try to get real IP from various headers (for proxy/load balancer scenarios)
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const remoteAddress = req.connection.remoteAddress || req.socket.remoteAddress;

    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return (forwarded as string).split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP as string;
    }
    
    return remoteAddress || '127.0.0.1';
  }

  /**
   * Extract session ID from request
   */
  private getSessionId(req: Request): string | undefined {
    // Try to get session ID from various sources
    
    // From query parameter
    if (req.query.sessionId) {
      return req.query.sessionId as string;
    }
    
    // From request body
    if (req.body && req.body.sessionId) {
      return req.body.sessionId;
    }
    
    // From headers
    if (req.headers['x-session-id']) {
      return req.headers['x-session-id'] as string;
    }
    
    // From cookies (if using cookie-based sessions)
    if (req.headers.cookie) {
      const cookies = this.parseCookies(req.headers.cookie);
      if (cookies.sessionId) {
        return cookies.sessionId;
      }
    }
    
    return undefined;
  }

  /**
   * Parse cookies from cookie header
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookies[key] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }
}

/**
 * Factory function to create rate limit middleware
 */
export function createRateLimitMiddleware() {
  return RateLimitMiddleware;
}
