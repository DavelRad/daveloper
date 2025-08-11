import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';
import { Request, Response } from 'express';
import { getCacheConfig } from '../config/cache.config';

// Decorator for caching configuration
export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_EXCLUDE_KEY = 'cache_exclude';

export interface CacheOptions {
  ttl?: number;
  exclude?: boolean;
  key?: string | ((req: Request) => string);
  condition?: (req: Request, res: Response) => boolean;
}

// Decorators
export const Cache = (options: CacheOptions = {}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CACHE_KEY, options, descriptor.value);
    } else {
      Reflect.defineMetadata(CACHE_KEY, options, target);
    }
  };
};

export const CacheTTL = (ttl: number) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CACHE_TTL_KEY, ttl, descriptor.value);
    } else {
      Reflect.defineMetadata(CACHE_TTL_KEY, ttl, target);
    }
  };
};

export const CacheExclude = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CACHE_EXCLUDE_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(CACHE_EXCLUDE_KEY, true, target);
    }
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly config = getCacheConfig();

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if caching is excluded
    const isExcluded = this.reflector.getAllAndOverride<boolean>(
      CACHE_EXCLUDE_KEY,
      [handler, controller],
    );

    if (isExcluded || !this.shouldCache(request)) {
      return next.handle();
    }

    // Get cache configuration
    const cacheOptions = this.reflector.getAllAndOverride<CacheOptions>(
      CACHE_KEY,
      [handler, controller],
    ) || {};

    const ttl = this.reflector.getAllAndOverride<number>(
      CACHE_TTL_KEY,
      [handler, controller],
    ) || cacheOptions.ttl || this.getTTLForEndpoint(request.route?.path || request.path);

    // Check custom condition
    if (cacheOptions.condition && !cacheOptions.condition(request, response)) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request, cacheOptions);

    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult !== null) {
        // Set cache headers
        this.setCacheHeaders(response, true, ttl);
        
        if (this.config.monitoring.logCacheOperations) {
          this.logger.debug(`Cache HIT for endpoint: ${request.method} ${request.path}`);
        }
        
        return of(cachedResult);
      }

      // Cache miss - execute handler and cache result
      return next.handle().pipe(
        tap(async (result) => {
          try {
            if (this.shouldCacheResponse(result, response)) {
              await this.cacheService.set(cacheKey, result, ttl);
              
              // Set cache headers
              this.setCacheHeaders(response, false, ttl);
              
              if (this.config.monitoring.logCacheOperations) {
                this.logger.debug(`Cache SET for endpoint: ${request.method} ${request.path}`);
              }
            }
          } catch (error) {
            this.logger.error(`Failed to cache result for key ${cacheKey}:`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache interceptor error for key ${cacheKey}:`, error);
      // Continue with normal execution if cache fails
      return next.handle();
    }
  }

  private shouldCache(request: Request): boolean {
    // Only cache GET requests by default
    if (request.method !== 'GET') {
      return false;
    }

    // Don't cache requests with authentication headers (unless explicitly configured)
    if (request.headers.authorization && !this.config.invalidation.enablePatternInvalidation) {
      return false;
    }

    // Don't cache requests with cache-control: no-cache
    const cacheControl = request.headers['cache-control'];
    if (cacheControl && cacheControl.includes('no-cache')) {
      return false;
    }

    return true;
  }

  private shouldCacheResponse(result: any, response: Response): boolean {
    // Don't cache error responses
    if (response.statusCode >= 400) {
      return false;
    }

    // Don't cache empty responses
    if (!result) {
      return false;
    }

    // Don't cache if response has cache-control: no-cache
    const cacheControl = response.getHeader('cache-control');
    if (cacheControl && cacheControl.toString().includes('no-cache')) {
      return false;
    }

    return true;
  }

  private generateCacheKey(request: Request, options: CacheOptions): string {
    if (options.key) {
      if (typeof options.key === 'function') {
        return options.key(request);
      }
      return options.key;
    }

    // Generate default cache key
    const method = request.method;
    const path = request.route?.path || request.path;
    const query = request.query;
    const params = request.params;

    // Include session ID for session-specific data
    const sessionId = this.getSessionId(request);
    
    const keyData = {
      method,
      path,
      query: this.normalizeQuery(query),
      params,
      sessionId,
    };

    return `endpoint:${method}:${path}:${this.hashObject(keyData)}`;
  }

  private getSessionId(request: Request): string | undefined {
    // Check various places for session ID
    return (
      request.headers['x-session-id'] as string ||
      request.query.sessionId as string ||
      request.cookies?.sessionId ||
      undefined
    );
  }

  private normalizeQuery(query: any): any {
    if (!query || typeof query !== 'object') {
      return query;
    }

    // Sort query parameters for consistent caching
    const normalized: any = {};
    const sortedKeys = Object.keys(query).sort();
    
    for (const key of sortedKeys) {
      normalized[key] = query[key];
    }

    return normalized;
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private getTTLForEndpoint(path: string): number {
    // Map specific endpoints to appropriate TTLs
    const endpointTTLs: Record<string, number> = {
      '/agent/chat': this.config.ttl.agentChat,
      '/agent/tools': this.config.ttl.agentTools,
      '/documents': this.config.ttl.documentList,
      '/documents/status': this.config.ttl.documentStatus,
      '/scrape': this.config.ttl.scraperStatus,
      '/health': this.config.ttl.healthCheck,
    };

    // Check for exact matches
    for (const [endpoint, ttl] of Object.entries(endpointTTLs)) {
      if (path.includes(endpoint)) {
        return ttl;
      }
    }

    // Check for pattern matches
    if (path.includes('/documents/status/')) {
      return this.config.ttl.documentStatus;
    }
    
    if (path.includes('/agent/chat/history/')) {
      return this.config.ttl.sessionHistory;
    }

    // Default TTL
    return this.config.defaultTtl;
  }

  private setCacheHeaders(response: Response, isHit: boolean, ttl: number): void {
    // Set cache status header
    response.setHeader('X-Cache', isHit ? 'HIT' : 'MISS');
    
    // Set cache control headers
    response.setHeader('Cache-Control', `public, max-age=${ttl}`);
    
    // Set expires header
    const expiresAt = new Date(Date.now() + ttl * 1000);
    response.setHeader('Expires', expiresAt.toUTCString());
    
    // Set ETag for cache validation (optional)
    if (!isHit) {
      const etag = `"${Date.now().toString(36)}"`;
      response.setHeader('ETag', etag);
    }
  }
}

/**
 * Cache controller decorator
 * Applies caching to all methods in a controller
 */
export const CacheController = (options: CacheOptions = {}) => {
  return (target: any) => {
    Reflect.defineMetadata(CACHE_KEY, options, target);
  };
};

/**
 * Method-level cache exclusion decorator
 */
export const NoCache = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_EXCLUDE_KEY, true, descriptor.value);
  };
};
