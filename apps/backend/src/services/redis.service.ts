import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private subscriptions = new Map<string, (message: string) => void>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      
      // Create Redis client for publishing
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      // Create separate Redis client for subscribing
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      await this.client.connect();
      await this.subscriber.connect();

      this.client.on('error', (error) => {
        this.logger.error('Redis client error:', error);
      });

      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error:', error);
      });

      this.subscriber.on('message', (channel, message) => {
        const callback = this.subscriptions.get(channel);
        if (callback) {
          callback(message);
        }
      });

      this.logger.log('✅ Redis service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      // Don't throw error - allow service to start without Redis
      this.logger.warn('⚠️  Service will start without Redis functionality');
    }
  }

  async onModuleDestroy() {
    try {
      await this.client?.quit();
      await this.subscriber?.quit();
      this.logger.log('🔌 Redis connections closed');
    } catch (error) {
      this.logger.error('Error closing Redis connections:', error);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      // Check if Redis is available
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping publish to ${channel}`);
        return;
      }
      
      await this.client.publish(channel, message);
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}:`, error);
      // Don't throw error - allow graceful degradation
      this.logger.warn(`⚠️  Publish to ${channel} failed, continuing without Redis`);
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      // Check if Redis is available
      if (!this.subscriber) {
        this.logger.warn(`⚠️  Redis not available, skipping subscription to ${channel}`);
        return;
      }
      
      this.subscriptions.set(channel, callback);
      await this.subscriber.subscribe(channel);
      this.logger.log(`📡 Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${channel}:`, error);
      // Don't throw error - allow graceful degradation
      this.logger.warn(`⚠️  Subscription to ${channel} failed, continuing without Redis`);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
      this.logger.log(`📡 Unsubscribed from Redis channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from ${channel}:`, error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Basic Redis operations for rate limiting
  async get(key: string): Promise<string | null> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping get for ${key}`);
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping set for ${key}`);
        return;
      }
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set ${key}:`, error);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping incr for ${key}`);
        return 0;
      }
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Failed to incr ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping expire for ${key}`);
        return false;
      }
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to expire ${key}:`, error);
      return false;
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping del for ${keys.join(', ')}`);
        return 0;
      }
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to del ${keys.join(', ')}:`, error);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping keys for ${pattern}`);
        return [];
      }
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys for ${pattern}:`, error);
      return [];
    }
  }

  // Set operations for sessions
  async setWithExpiry(key: string, value: string, ttl: number): Promise<void> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping setWithExpiry for ${key}`);
        return;
      }
      await this.client.setex(key, ttl, value);
    } catch (error) {
      this.logger.error(`Failed to setWithExpiry ${key}:`, error);
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping sadd for ${key}`);
        return 0;
      }
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to sadd ${key}:`, error);
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping srem for ${key}`);
        return 0;
      }
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to srem ${key}:`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      if (!this.client) {
        this.logger.warn(`⚠️  Redis not available, skipping smembers for ${key}`);
        return [];
      }
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to smembers ${key}:`, error);
      return [];
    }
  }

  // Utility methods for specific message types
  async publishLog(jobId: string, message: string, level: 'info' | 'error' | 'warning' | 'debug' = 'info'): Promise<void> {
    const logMessage = JSON.stringify({
      jobId,
      timestamp: new Date().toISOString(),
      msg: message,
      level,
    });
    await this.publish('logs', logMessage);
  }

  async publishChatToken(sessionId: string, token: string, done: boolean = false, metadata?: any): Promise<void> {
    const chatMessage = JSON.stringify({
      sessionId,
      token,
      done,
      metadata,
    });
    await this.publish('chat_tokens', chatMessage);
  }
} 