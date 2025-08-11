import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import {
  SessionData,
  SessionCreateOptions,
  SessionUpdateOptions,
  SessionCleanupResult,
  SessionStats,
  SessionConfig,
  DEFAULT_SESSION_CONFIG
} from '../types/session.types';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private cleanupInterval: NodeJS.Timeout;
  private config: SessionConfig;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      ttl: this.configService.get<number>('SESSION_TTL') || DEFAULT_SESSION_CONFIG.ttl,
      cleanupInterval: this.configService.get<number>('SESSION_CLEANUP_INTERVAL') || DEFAULT_SESSION_CONFIG.cleanupInterval,
      maxSessionsPerIP: this.configService.get<number>('SESSION_MAX_PER_IP') || DEFAULT_SESSION_CONFIG.maxSessionsPerIP,
      extendOnActivity: this.configService.get<boolean>('SESSION_EXTEND_ON_ACTIVITY') ?? DEFAULT_SESSION_CONFIG.extendOnActivity,
    };
  }

  async onModuleInit() {
    try {
      // Start periodic cleanup
      this.startCleanupSchedule();
      this.logger.log(`✅ Session Service initialized with TTL: ${this.config.ttl}s, Cleanup: ${this.config.cleanupInterval}ms`);
    } catch (error) {
      this.logger.error('Failed to initialize Session Service:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🔌 Session cleanup schedule stopped');
    }
  }

  /**
   * Create a new session
   */
  async createSession(options: SessionCreateOptions): Promise<SessionData> {
    try {
      const now = Date.now();
      
      // Check if IP has too many sessions
      const ipSessionCount = await this.getSessionCountByIP(options.ipAddress);
      if (ipSessionCount >= this.config.maxSessionsPerIP) {
        throw new Error(`Too many sessions for IP: ${options.ipAddress}. Max: ${this.config.maxSessionsPerIP}`);
      }

      const sessionData: SessionData = {
        sessionId: options.sessionId,
        createdAt: now,
        lastActivity: now,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        messageCount: 0,
        isActive: true,
      };

      const sessionKey = this.getSessionKey(options.sessionId);
      await this.redisService.setWithExpiry(
        sessionKey,
        JSON.stringify(sessionData),
        this.config.ttl
      );

      // Add to IP index for tracking
      const ipKey = this.getIPKey(options.ipAddress);
      await this.redisService.sadd(ipKey, options.sessionId);
      await this.redisService.expire(ipKey, this.config.ttl);

      this.logger.log(`✅ Created session: ${options.sessionId} for IP: ${options.ipAddress}`);
      return sessionData;
    } catch (error) {
      this.logger.error(`Failed to create session ${options.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionDataStr = await this.redisService.get(sessionKey);
      
      if (!sessionDataStr) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      
      // Check if session is expired
      const now = Date.now();
      if (now - sessionData.lastActivity > this.config.ttl * 1000) {
        await this.deleteSession(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: SessionUpdateOptions): Promise<SessionData | null> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return null;
      }

      // Apply updates
      const updatedSession: SessionData = {
        ...sessionData,
        ...updates,
        lastActivity: updates.lastActivity || Date.now(),
      };

      const sessionKey = this.getSessionKey(sessionId);
      
      // Extend TTL if configured to do so
      if (this.config.extendOnActivity) {
        await this.redisService.setWithExpiry(
          sessionKey,
          JSON.stringify(updatedSession),
          this.config.ttl
        );
      } else {
        await this.redisService.set(sessionKey, JSON.stringify(updatedSession));
      }

      this.logger.debug(`Updated session: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        // Remove from IP index
        const ipKey = this.getIPKey(sessionData.ipAddress);
        await this.redisService.srem(ipKey, sessionId);
      }

      const sessionKey = this.getSessionKey(sessionId);
      const result = await this.redisService.del(sessionKey);
      
      this.logger.log(`🗑️ Deleted session: ${sessionId}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Validate session exists and is active
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData || !sessionData.isActive) {
        return false;
      }

      // Optional IP validation for security
      if (ipAddress && sessionData.ipAddress !== ipAddress) {
        this.logger.warn(`Session ${sessionId} IP mismatch. Expected: ${sessionData.ipAddress}, Got: ${ipAddress}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to validate session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Increment message count for session
   */
  async incrementMessageCount(sessionId: string): Promise<number> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const newCount = sessionData.messageCount + 1;
      await this.updateSession(sessionId, { 
        messageCount: newCount,
        lastActivity: Date.now()
      });

      return newCount;
    } catch (error) {
      this.logger.error(`Failed to increment message count for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<SessionStats> {
    try {
      const pattern = this.getSessionKey('*');
      const sessionKeys = await this.redisService.keys(pattern);
      
      let activeSessions = 0;
      let expiredSessions = 0;
      const now = Date.now();

      for (const key of sessionKeys) {
        const sessionDataStr = await this.redisService.get(key);
        if (sessionDataStr) {
          const sessionData: SessionData = JSON.parse(sessionDataStr);
          if (sessionData.isActive && (now - sessionData.lastActivity) <= this.config.ttl * 1000) {
            activeSessions++;
          } else {
            expiredSessions++;
          }
        }
      }

      return {
        totalSessions: sessionKeys.length,
        activeSessions,
        expiredSessions,
      };
    } catch (error) {
      this.logger.error('Failed to get session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<SessionCleanupResult> {
    try {
      const pattern = this.getSessionKey('*');
      const sessionKeys = await this.redisService.keys(pattern);
      
      let sessionsRemoved = 0;
      const now = Date.now();

      for (const key of sessionKeys) {
        try {
          const sessionDataStr = await this.redisService.get(key);
          if (sessionDataStr) {
            const sessionData: SessionData = JSON.parse(sessionDataStr);
            
            // Check if session is expired
            if (!sessionData.isActive || (now - sessionData.lastActivity) > this.config.ttl * 1000) {
              await this.deleteSession(sessionData.sessionId);
              sessionsRemoved++;
            }
          }
        } catch (error) {
          this.logger.error(`Error processing session key ${key}:`, error);
        }
      }

      if (sessionsRemoved > 0) {
        this.logger.log(`🧹 Cleaned up ${sessionsRemoved} expired sessions`);
      }

      return {
        sessionsRemoved,
        sessionsProcessed: sessionKeys.length,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
      return {
        sessionsRemoved: 0,
        sessionsProcessed: 0,
      };
    }
  }

  /**
   * Get number of sessions for an IP address
   */
  private async getSessionCountByIP(ipAddress: string): Promise<number> {
    try {
      const ipKey = this.getIPKey(ipAddress);
      const sessionIds = await this.redisService.smembers(ipKey);
      
      // Validate sessions still exist
      let validCount = 0;
      for (const sessionId of sessionIds) {
        if (await this.getSession(sessionId)) {
          validCount++;
        } else {
          // Remove invalid session from IP index
          await this.redisService.srem(ipKey, sessionId);
        }
      }

      return validCount;
    } catch (error) {
      this.logger.error(`Failed to get session count for IP ${ipAddress}:`, error);
      return 0;
    }
  }

  /**
   * Start periodic cleanup schedule
   */
  private startCleanupSchedule() {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        this.logger.error('Error during scheduled session cleanup:', error);
      }
    }, this.config.cleanupInterval);

    this.logger.log(`🕒 Session cleanup scheduled every ${this.config.cleanupInterval / 1000}s`);
  }

  /**
   * Generate Redis key for session
   */
  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * Generate Redis key for IP index
   */
  private getIPKey(ipAddress: string): string {
    return `session:ip:${ipAddress}`;
  }

  /**
   * Health check for session service
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test Redis connection and basic operations
      const testKey = 'session:health:test';
      await this.redisService.set(testKey, 'test');
      const result = await this.redisService.get(testKey);
      await this.redisService.del(testKey);
      
      return result === 'test';
    } catch (error) {
      this.logger.error('Session service health check failed:', error);
      return false;
    }
  }
}
