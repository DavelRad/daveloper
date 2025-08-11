import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../services/redis.service';
import { LogMessage, ErrorMessage } from '../types/messages';

@WebSocketGateway({
  namespace: '/ws/logs',
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://daveloper.dev'],
    credentials: true,
  },
})
export class LogsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LogsGateway.name);
  private connectedClients = new Set<string>();

  constructor(private readonly redisService: RedisService) {}

  afterInit(server: Server) {
    this.logger.log('📡 Logs WebSocket Gateway initialized');
    this.subscribeToLogStream();
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`🔌 Client connected to logs: ${client.id} (${this.connectedClients.size} total)`);
    
    // Send welcome message
    client.emit('log', {
      jobId: 'system',
      timestamp: new Date().toISOString(),
      msg: 'Connected to log stream',
      level: 'info',
    } as LogMessage);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`🔌 Client disconnected from logs: ${client.id} (${this.connectedClients.size} remaining)`);
  }

  private async subscribeToLogStream() {
    try {
      await this.redisService.subscribe('logs', (message) => {
        try {
          const logMessage: LogMessage = JSON.parse(message);
          this.broadcastLog(logMessage);
        } catch (error) {
          this.logger.error('Failed to parse log message:', error);
          this.broadcastError('PARSE_ERROR', 'Failed to parse log message');
        }
      });
      
      this.logger.log('📡 Subscribed to Redis logs channel');
    } catch (error) {
      this.logger.error('Failed to subscribe to logs:', error);
      this.broadcastError('REDIS_ERROR', 'Failed to connect to log stream');
    }
  }

  private broadcastLog(logMessage: LogMessage) {
    this.server.emit('log', logMessage);
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

  // Method to manually broadcast logs (for testing or system messages)
  public sendLog(logMessage: LogMessage) {
    this.broadcastLog(logMessage);
  }
} 