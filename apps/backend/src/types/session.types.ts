/**
 * Session type definitions for browser session management
 */

export interface SessionData {
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  messageCount: number;
  isActive: boolean;
}

export interface SessionCreateOptions {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

export interface SessionUpdateOptions {
  lastActivity?: number;
  messageCount?: number;
  isActive?: boolean;
}

export interface SessionCleanupResult {
  sessionsRemoved: number;
  sessionsProcessed: number;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
}

export interface SessionConfig {
  ttl: number; // Time to live in seconds (default: 24 hours)
  cleanupInterval: number; // Cleanup interval in milliseconds (default: 1 hour)
  maxSessionsPerIP: number; // Maximum sessions per IP address
  extendOnActivity: boolean; // Whether to extend session on activity
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  ttl: 24 * 60 * 60, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  maxSessionsPerIP: 10,
  extendOnActivity: true,
};
