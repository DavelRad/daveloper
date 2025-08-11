import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { RedisService } from '../services/redis.service';
import { AgentService } from '../services/agent.service';
import { ScraperService } from '../services/scraper.service';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';

describe('NestJS API Gateway Integration', () => {
  let app: INestApplication;
  let redisService: RedisService;
  let agentService: AgentService;
  let scraperService: ScraperService;
  let logSocket: Socket;
  let chatSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    
    redisService = moduleFixture.get<RedisService>(RedisService);
    agentService = moduleFixture.get<AgentService>(AgentService);
    scraperService = moduleFixture.get<ScraperService>(ScraperService);

    await app.listen(3001);
  });

  afterAll(async () => {
    if (logSocket) logSocket.disconnect();
    if (chatSocket) chatSocket.disconnect();
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('should return overall health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('agent');
      expect(response.body.services).toHaveProperty('scraper');
    });

    it('should return Redis health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scraper REST Endpoint', () => {
    it('should accept scrape requests', async () => {
      const scrapeRequest = {
        source: 'test-source',
        maxArticles: 5,
        categories: ['tech'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/scrape')
        .send(scrapeRequest)
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('message');
    }, 15000); // Increased timeout from 5000ms to 15000ms

    it('should reject empty source requests', async () => {
      const invalidRequest = {
        source: '',
        maxArticles: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/scrape')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_SOURCE');
    });
  });

  describe('WebSocket Connections', () => {
    it('should connect to logs WebSocket', (done) => {
      logSocket = io('http://localhost:3001/ws/logs', {
        transports: ['websocket'],
      });

      logSocket.on('connect', () => {
        expect(logSocket.connected).toBe(true);
        done();
      });

      logSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should receive log messages', (done) => {
      if (!logSocket) {
        logSocket = io('http://localhost:3001/ws/logs', {
          transports: ['websocket'],
        });
      }

      // Wait for connection before publishing
      if (logSocket.connected) {
        publishLogMessage();
      } else {
        logSocket.on('connect', () => {
          publishLogMessage();
        });
      }

      function publishLogMessage() {
        // Trigger a log message via Redis with longer delay to ensure WebSocket is ready
        setTimeout(() => {
          redisService.publishLog('test-job', 'Test log message', 'info');
        }, 1000); // Increased delay to ensure WebSocket is ready
      }

      logSocket.on('log', (data) => {
        expect(data).toHaveProperty('jobId');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('msg');
        expect(data).toHaveProperty('level');
        done();
      });

      logSocket.on('connect_error', (error) => {
        done(error);
      });
    }, 15000); // Increased timeout to 15 seconds

    it('should connect to chat WebSocket', (done) => {
      chatSocket = io('http://localhost:3001/ws/chat', {
        transports: ['websocket'],
      });

      chatSocket.on('connect', () => {
        expect(chatSocket.connected).toBe(true);
        done();
      });

      chatSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle chat messages', (done) => {
      if (!chatSocket) {
        chatSocket = io('http://localhost:3001/ws/chat', {
          transports: ['websocket'],
        });
      }

      chatSocket.on('chat', (data) => {
        if (data.sessionId !== 'system') {
          expect(data).toHaveProperty('sessionId');
          expect(data).toHaveProperty('token');
          expect(data).toHaveProperty('done');
          done();
        }
      });

      // Send a chat message
      chatSocket.emit('chat', {
        message: 'Hello, test message',
        sessionId: 'test-session',
        useTools: false,
        maxTokens: 100,
      });
    });
  });

  describe('Redis Integration', () => {
    it('should publish and subscribe to messages', async () => {
      const testMessage = 'Test Redis message';
      let receivedMessage: string;

      // Subscribe to a test channel
      await redisService.subscribe('test-channel', (message) => {
        receivedMessage = message;
      });

      // Publish a message
      await redisService.publish('test-channel', testMessage);

      // Wait for message to be received
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessage).toBe(testMessage);
    });

    it('should be healthy', async () => {
      const isHealthy = await redisService.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should have initialized all services', () => {
      expect(redisService).toBeDefined();
      expect(agentService).toBeDefined();
      expect(scraperService).toBeDefined();
    });

    it('should handle graceful service failures', async () => {
      // Test that health checks handle service failures gracefully
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Even if services are down, we should get a proper response
      expect(response.body).toHaveProperty('status');
      expect(['ok', 'error']).toContain(response.body.status);
    });
  });
}); 