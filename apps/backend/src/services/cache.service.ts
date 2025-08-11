import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheConfig, getCacheConfig, CacheKeyGenerator } from '../config/cache.config';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  operations: number;
  memoryUsage: number;
  lastReset: Date;
}

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  compressed: boolean;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly config: CacheConfig;
  private readonly metrics: CacheMetrics;
  private readonly CACHE_VERSION = '1.0';
  
  constructor(private readonly redisService: RedisService) {
    this.config = getCacheConfig();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      operations: 0,
      memoryUsage: 0,
      lastReset: new Date(),
    };
  }

  async onModuleInit() {
    this.logger.log('🗄️  Cache service initialized');
    
    if (this.config.monitoring.enableMetrics) {
      // Start metrics collection
      this.startMetricsCollection();
    }
    
    // Log cache configuration
    this.logCacheConfig();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.metrics.operations++;
      
      // Get from Redis through RedisService
      const cached = await this.getFromRedis(`${this.CACHE_VERSION}:${key}`);
      
      if (!cached) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if entry has expired (additional safety check)
      if (this.isExpired(entry)) {
        await this.delete(key);
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      // Update last accessed time
      entry.lastAccessed = new Date();
      await this.setToRedis(`${this.CACHE_VERSION}:${key}`, JSON.stringify(entry), entry.ttl);

      this.metrics.hits++;
      this.updateHitRate();

      // Decompress if needed
      let value = entry.value;
      if (entry.compressed && typeof value === 'string') {
        value = await this.decompress(value) as T;
      }

      if (this.config.monitoring.logCacheOperations) {
        this.logger.debug(`Cache HIT: ${key}`);
      }

      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      this.metrics.operations++;
      this.metrics.sets++;

      const finalTtl = ttl || this.config.defaultTtl;
      const now = new Date();
      
      // Serialize the value
      let serializedValue: any = value;
      let compressed = false;
      let size = this.getSize(JSON.stringify(value));

      // Check size limits
      if (size > this.config.performance.maxValueSize) {
        throw new Error(`Value too large: ${size} > ${this.config.performance.maxValueSize}`);
      }

      // Compress if enabled and value is large enough
      if (this.config.performance.enableCompression && 
          size > this.config.performance.compressionThreshold) {
        serializedValue = await this.compress(JSON.stringify(value));
        compressed = true;
        size = this.getSize(serializedValue);
      }

      const entry: CacheEntry<T> = {
        value: serializedValue,
        ttl: finalTtl,
        compressed,
        size,
        createdAt: now,
        lastAccessed: now,
      };

      await this.setToRedis(
        `${this.CACHE_VERSION}:${key}`, 
        JSON.stringify(entry), 
        finalTtl
      );

      if (this.config.monitoring.logCacheOperations) {
        this.logger.debug(`Cache SET: ${key} (TTL: ${finalTtl}s, Size: ${size}b, Compressed: ${compressed})`);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.metrics.operations++;
      this.metrics.deletes++;

      await this.deleteFromRedis(`${this.CACHE_VERSION}:${key}`);

      if (this.config.monitoring.logCacheOperations) {
        this.logger.debug(`Cache DELETE: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.config.invalidation.enablePatternInvalidation) {
        this.logger.warn('Pattern invalidation is disabled');
        return 0;
      }

      const keys = await this.getKeysByPattern(`${this.CACHE_VERSION}:${pattern}`);
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches
      const batchSize = this.config.invalidation.batchInvalidationSize;
      let deletedCount = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await this.deleteBatch(batch);
        deletedCount += batch.length;
      }

      this.metrics.deletes += deletedCount;
      this.logger.log(`Cache pattern delete: ${pattern} (${deletedCount} keys)`);

      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache pattern delete error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.deletePattern('*');
      this.resetMetrics();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    metrics: CacheMetrics;
    config: Partial<CacheConfig>;
    alerts: string[];
  }> {
    const alerts: string[] = [];
    
    // Check hit rate
    if (this.metrics.hitRate < this.config.monitoring.hitRateThreshold) {
      alerts.push(`Low hit rate: ${(this.metrics.hitRate * 100).toFixed(1)}%`);
    }

    // Check memory usage (if available)
    if (this.metrics.memoryUsage > this.config.performance.maxMemoryUsage * 0.9) {
      alerts.push(`High memory usage: ${this.metrics.memoryUsage}MB`);
    }

    const healthy = alerts.length === 0;

    return {
      healthy,
      metrics: this.getMetrics(),
      config: {
        defaultTtl: this.config.defaultTtl,
        enableCompression: this.config.performance.enableCompression,
        maxMemoryUsage: this.config.performance.maxMemoryUsage,
      },
      alerts,
    };
  }

  /**
   * Response caching helper methods
   */
  async cacheResponse<T>(endpoint: string, params: Record<string, any>, value: T, ttl?: number): Promise<void> {
    const key = CacheKeyGenerator.response(endpoint, params);
    await this.set(key, value, ttl);
  }

  async getCachedResponse<T>(endpoint: string, params: Record<string, any>): Promise<T | null> {
    const key = CacheKeyGenerator.response(endpoint, params);
    return this.get<T>(key);
  }

  async invalidateEndpoint(endpoint: string): Promise<number> {
    const pattern = `${CacheKeyGenerator.response(endpoint, {})}*`;
    return this.deletePattern(pattern);
  }

  /**
   * Session caching helper methods
   */
  async cacheSession<T>(sessionId: string, type: string, value: T, ttl?: number): Promise<void> {
    const key = CacheKeyGenerator.session(sessionId, type);
    const sessionTtl = ttl || this.config.ttl.sessionData;
    await this.set(key, value, sessionTtl);
  }

  async getCachedSession<T>(sessionId: string, type: string): Promise<T | null> {
    const key = CacheKeyGenerator.session(sessionId, type);
    return this.get<T>(key);
  }

  async invalidateSession(sessionId: string): Promise<number> {
    const pattern = `${CacheKeyGenerator.session(sessionId, '')}*`;
    return this.deletePattern(pattern);
  }

  // Private helper methods

  private async getFromRedis(key: string): Promise<string | null> {
    try {
      // Use RedisService's client via reflection to access private client
      const client = (this.redisService as any).client;
      if (!client) {
        return null;
      }
      return await client.get(key);
    } catch (error) {
      this.logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  private async setToRedis(key: string, value: string, ttl: number): Promise<void> {
    try {
      const client = (this.redisService as any).client;
      if (!client) {
        throw new Error('Redis client not available');
      }
      await client.setex(key, ttl, value);
    } catch (error) {
      this.logger.error(`Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  private async deleteFromRedis(key: string): Promise<void> {
    try {
      const client = (this.redisService as any).client;
      if (!client) {
        return;
      }
      await client.del(key);
    } catch (error) {
      this.logger.error(`Redis delete error for key ${key}:`, error);
      throw error;
    }
  }

  private async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const client = (this.redisService as any).client;
      if (!client) {
        return [];
      }
      // Use SCAN instead of KEYS for better performance
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      this.logger.error(`Redis pattern scan error for pattern ${pattern}:`, error);
      return [];
    }
  }

  private async deleteBatch(keys: string[]): Promise<void> {
    try {
      const client = (this.redisService as any).client;
      if (!client || keys.length === 0) {
        return;
      }
      await client.del(...keys);
    } catch (error) {
      this.logger.error(`Redis batch delete error:`, error);
      throw error;
    }
  }

  private async compress(data: string): Promise<string> {
    try {
      const compressed = await gzip(Buffer.from(data, 'utf8'));
      return compressed.toString('base64');
    } catch (error) {
      this.logger.error('Compression error:', error);
      return data;
    }
  }

  private async decompress(data: string): Promise<string> {
    try {
      const buffer = Buffer.from(data, 'base64');
      const decompressed = await gunzip(buffer);
      return decompressed.toString('utf8');
    } catch (error) {
      this.logger.error('Decompression error:', error);
      return data;
    }
  }

  private getSize(data: string): number {
    return Buffer.byteLength(data, 'utf8');
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const createdAt = new Date(entry.createdAt).getTime();
    const ttlMs = entry.ttl * 1000;
    return (now - createdAt) > ttlMs;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private resetMetrics(): void {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    this.metrics.sets = 0;
    this.metrics.deletes = 0;
    this.metrics.hitRate = 0;
    this.metrics.operations = 0;
    this.metrics.lastReset = new Date();
  }

  private startMetricsCollection(): void {
    // Collect metrics every 5 minutes
    setInterval(() => {
      if (this.config.monitoring.enableAlerts) {
        this.checkAndLogAlerts();
      }
    }, 5 * 60 * 1000);
  }

  private async checkAndLogAlerts(): Promise<void> {
    const health = await this.getHealth();
    if (health.alerts.length > 0) {
      this.logger.warn(`Cache alerts: ${health.alerts.join(', ')}`);
    }
  }

  private logCacheConfig(): void {
    this.logger.log(`Cache configuration: TTL=${this.config.defaultTtl}s, Compression=${this.config.performance.enableCompression}, MaxMemory=${this.config.performance.maxMemoryUsage}MB`);
  }
}
