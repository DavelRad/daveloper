import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../services/redis.service';
import { AgentService } from '../services/agent.service';
import { SessionService } from '../services/session.service';
import { RateLimitService } from '../services/rate-limit.service';
import { ChatMessage, ChatRequest, ErrorMessage } from '../types/messages';

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://daveloper.dev'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedClients = new Map<string, string>(); // clientId -> sessionId

  constructor(
    private readonly redisService: RedisService,
    private readonly agentService: AgentService,
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('📡 Chat WebSocket Gateway initialized');
    this.subscribeToChatStream();
  }

  async handleConnection(client: Socket) {
    const clientIP = this.getClientIP(client);
    
    try {
      // Check WebSocket connection rate limit
      const rateLimitResult = await this.rateLimitService.checkWebSocketConnectionLimit(clientIP);
      
      if (!rateLimitResult.allowed) {
        this.logger.warn(`WebSocket connection rate limit exceeded for IP: ${clientIP}`);
        client.emit('error', {
          error: true,
          code: 'CONNECTION_RATE_LIMIT',
          message: `Too many connections. Try again in ${rateLimitResult.retryAfter} seconds.`,
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return;
      }

      // Record the connection
      await this.rateLimitService.recordWebSocketConnection(clientIP);
      
      this.logger.log(`🔌 Client connected to chat: ${client.id} from ${clientIP} (${this.connectedClients.size + 1} total)`);
      
      // Send welcome message
      client.emit('chat', {
        sessionId: 'system',
        token: 'Connected to chat agent. Send a message to start!',
        done: true,
      } as ChatMessage);
      
      // Set up client error handling
      client.on('error', (error) => {
        this.logger.error(`Client ${client.id} error:`, error);
      });
      
      // Set up ping/pong for connection health
      client.on('ping', () => {
        client.emit('pong');
      });
    } catch (error) {
      this.logger.error(`Error handling WebSocket connection from ${clientIP}:`, error);
      client.emit('error', {
        error: true,
        code: 'CONNECTION_ERROR',
        message: 'Failed to establish connection',
        timestamp: new Date().toISOString(),
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);
    this.logger.log(`🔌 Client disconnected from chat: ${client.id} (session: ${sessionId})`);
  }

  @SubscribeMessage('chat')
  async handleChatMessage(
    @MessageBody() data: ChatRequest,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`💬 Chat message from ${client.id}: ${data.sessionId}`);
      
      // Validate request data
      if (!data.message || !data.sessionId) {
        this.sendErrorToClient(client, 'INVALID_REQUEST', 'Message and sessionId are required');
        return;
      }

      // Get client IP and User-Agent
      const clientIP = this.getClientIP(client);
      const userAgent = client.handshake.headers['user-agent'] || 'Unknown';

      // Get or create session
      let session = await this.sessionService.getSession(data.sessionId);
      if (!session) {
        try {
          session = await this.sessionService.createSession({
            sessionId: data.sessionId,
            ipAddress: clientIP,
            userAgent: userAgent,
          });
          this.logger.log(`✅ Created new session: ${data.sessionId} for IP: ${clientIP}`);
        } catch (error) {
          this.sendErrorToClient(client, 'SESSION_ERROR', 'Failed to create session');
          return;
        }
      } else {
        // Validate session security
        if (!await this.sessionService.validateSession(data.sessionId, clientIP)) {
          this.sendErrorToClient(client, 'SESSION_INVALID', 'Invalid session');
          return;
        }
      }

      // Check WebSocket message rate limit
      const messageRateLimit = await this.rateLimitService.checkWebSocketMessageLimit(data.sessionId);
      if (!messageRateLimit.allowed) {
        this.sendErrorToClient(client, 'MESSAGE_RATE_LIMIT', `Too many messages. Try again in ${messageRateLimit.retryAfter} seconds.`);
        return;
      }

      // Record the message for rate limiting
      await this.rateLimitService.recordWebSocketMessage(data.sessionId);

      // Increment message count for session tracking
      try {
        await this.sessionService.incrementMessageCount(data.sessionId);
      } catch (error) {
        this.logger.error(`Failed to increment message count for session ${data.sessionId}:`, error);
      }
      
      // Store client session mapping
      this.connectedClients.set(client.id, data.sessionId);
      
      // Send typing indicator
      client.emit('chat', {
        sessionId: data.sessionId,
        token: '',
        done: false,
      } as ChatMessage);

      // Forward to Agent Service via gRPC and handle response
      const response = await this.agentService.sendMessage(data);
      
      // If we get a complete response (non-streaming), emit it directly
      if (response && response.response) {
        client.emit('chat', {
          sessionId: data.sessionId,
          token: response.response,
          done: true,
          sources: response.sources || [],
          toolCalls: response.toolCalls || []
        } as ChatMessage);
        
        this.logger.log(`✅ Chat response sent directly for session: ${data.sessionId}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
      this.sendErrorToClient(client, 'AGENT_ERROR', 'Failed to process chat message');
    }
  }

  private async subscribeToChatStream() {
    try {
      await this.redisService.subscribe('chat_tokens', (message) => {
        try {
          const chatMessage: ChatMessage = JSON.parse(message);
          this.broadcastChatMessage(chatMessage);
        } catch (error) {
          this.logger.error('Failed to parse chat message:', error);
          this.broadcastError('PARSE_ERROR', 'Failed to parse chat message');
        }
      });
      
      this.logger.log('📡 Subscribed to Redis chat_tokens channel');
    } catch (error) {
      this.logger.error('Failed to subscribe to chat tokens:', error);
      this.broadcastError('REDIS_ERROR', 'Failed to connect to chat stream');
    }
  }

  private broadcastChatMessage(chatMessage: ChatMessage) {
    // Send to all clients with the same sessionId
    let sentCount = 0;
    this.connectedClients.forEach((sessionId, clientId) => {
      if (sessionId === chatMessage.sessionId) {
        this.server.to(clientId).emit('chat', chatMessage);
        sentCount++;
      }
    });
    
    if (sentCount > 0) {
      this.logger.debug(`📤 Broadcasted chat message to ${sentCount} clients for session: ${chatMessage.sessionId}`);
    } else {
      this.logger.warn(`⚠️ No connected clients found for session: ${chatMessage.sessionId}`);
    }
  }

  private sendErrorToClient(client: Socket, code: string, message: string) {
    const errorMessage: ErrorMessage = {
      error: true,
      code,
      message,
      timestamp: new Date().toISOString(),
    };
    client.emit('error', errorMessage);
  }

  private broadcastError(code: string, message: string) {
    const errorMessage: ErrorMessage = {
      error: true,
      code,
      message,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('error', errorMessage);
  }

  private getClientIP(client: Socket): string {
    // Try to get real IP from various headers (for proxy/load balancer scenarios)
    const forwarded = client.handshake.headers['x-forwarded-for'];
    const realIP = client.handshake.headers['x-real-ip'];
    const remoteAddress = client.handshake.address;

    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return (forwarded as string).split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP as string;
    }
    
    return remoteAddress || '127.0.0.1';
  }
} 