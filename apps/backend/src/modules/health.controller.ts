import { Controller, Get, Logger } from '@nestjs/common';
import { RedisService } from '../services/redis.service';
import { AgentService } from '../services/agent.service';
import { ScraperService } from '../services/scraper.service';
import { DocumentService } from '../services/document.service';
import { SessionService } from '../services/session.service';
import { RateLimitService } from '../services/rate-limit.service';
import { HealthResponse } from '../types/messages';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly agentService: AgentService,
    private readonly scraperService: ScraperService,
    private readonly documentService: DocumentService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    try {
      this.logger.log('🔍 Running health check...');
      
      const [redis, agent, scraper, document, session, rateLimit] = await Promise.all([
        this.checkService('Redis', () => this.redisService.isHealthy()),
        this.checkService('Agent', () => this.agentService.isHealthy()),
        this.checkService('Scraper', () => this.scraperService.isHealthy()),
        this.checkService('Document', () => this.documentService.isHealthy()),
        this.checkService('Session', () => this.sessionService.isHealthy()),
        this.checkService('RateLimit', () => this.rateLimitService.isHealthy()),
      ]);

      const allHealthy = redis && agent && scraper && document && session && rateLimit;
      const status = allHealthy ? 'ok' : 'error';
      
      const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        services: {
          redis,
          agent,
          scraper,
          document,
          session,
          rateLimit,
          supabase: true, // TODO: Add Supabase health check
        },
      };

      this.logger.log(`💚 Health check completed: ${status}`);
      return response;
      
    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          redis: false,
          agent: false,
          scraper: false,
          document: false,
          session: false,
          rateLimit: false,
          supabase: false,
        },
      };
    }
  }

  @Get('redis')
  async getRedisHealth(): Promise<{ healthy: boolean; timestamp: string }> {
    const healthy = await this.checkService('Redis', () => this.redisService.isHealthy());
    return {
      healthy,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('agent')
  async getAgentHealth(): Promise<{ healthy: boolean; timestamp: string }> {
    const healthy = await this.checkService('Agent', () => this.agentService.isHealthy());
    return {
      healthy,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('scraper')
  async getScraperHealth(): Promise<{ healthy: boolean; timestamp: string }> {
    const healthy = await this.checkService('Scraper', () => this.scraperService.isHealthy());
    return {
      healthy,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('document')
  async getDocumentHealth(): Promise<{ healthy: boolean; timestamp: string }> {
    const healthy = await this.checkService('Document', () => this.documentService.isHealthy());
    return {
      healthy,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session')
  async getSessionHealth(): Promise<{ healthy: boolean; timestamp: string; stats?: any }> {
    const healthy = await this.checkService('Session', () => this.sessionService.isHealthy());
    const stats = healthy ? await this.sessionService.getSessionStats() : undefined;
    return {
      healthy,
      timestamp: new Date().toISOString(),
      stats,
    };
  }

  @Get('rate-limit')
  async getRateLimitHealth(): Promise<{ healthy: boolean; timestamp: string; config?: any }> {
    const healthy = await this.checkService('RateLimit', () => this.rateLimitService.isHealthy());
    const config = healthy ? this.rateLimitService.getConfig() : undefined;
    return {
      healthy,
      timestamp: new Date().toISOString(),
      config,
    };
  }

  private async checkService(
    serviceName: string,
    healthCheck: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      const start = Date.now();
      const healthy = await healthCheck();
      const duration = Date.now() - start;
      
      this.logger.debug(`${serviceName} health: ${healthy ? '✅' : '❌'} (${duration}ms)`);
      return healthy;
    } catch (error) {
      this.logger.error(`${serviceName} health check error:`, error);
      return false;
    }
  }
} 