import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ChatRequest } from '../types/messages';
import {
  ChatRequestDto,
  GetChatHistoryDto,
  ClearChatHistoryDto,
  ToolTestDto,
  ChatResponseDto,
  GetChatHistoryResponseDto,
  StatusResponseDto,
  ToolsListResponseDto,
  ToolTestResponseDto,
  HealthResponseDto
} from '../dto/agent.dto';

interface AgentServiceClient {
  SendMessage: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  GetChatHistory: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  ClearChatHistory: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  ListTools: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  TestTool: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  HealthCheck: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
}

@Injectable()
export class AgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentService.name);
  private client: AgentServiceClient;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const grpcUrl = this.configService.get<string>('GRPC_AGENT_URL') || 'localhost:50052';
      
      // Load proto file
      const packageDefinition = protoLoader.loadSync(
        'src/proto/agent_service.proto',
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        }
      );

      const agentProto = grpc.loadPackageDefinition(packageDefinition) as any;

      // Create gRPC client
      this.client = new agentProto.agent_service.AgentService(
        grpcUrl,
        grpc.credentials.createInsecure()
      );

      this.logger.log(`✅ Connected to Agent Service at ${grpcUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize Agent Service client:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        // Close the gRPC client connection
        (this.client as any).close?.();
        this.logger.log('🔌 Agent Service client connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Agent Service client:', error);
    }
  }

  async sendMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {
          message: request.message,
          session_id: request.sessionId,
          use_tools: request.useTools || true,
          max_tokens: request.maxTokens || 4096,
        };

        this.client.SendMessage(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📤 Agent response: ${response.response?.substring(0, 100)}...`);
            resolve({
              response: response.response || '',
              sessionId: response.session_id || request.sessionId,
              sources: response.sources || [],
              toolCalls: response.tool_calls || [],
              reasoning: response.reasoning || '',
              status: {
                success: response.status?.success || true,
                message: response.status?.message || 'Success',
                code: response.status?.code || 200
              }
            });
          }
        });
      } catch (error) {
        this.logger.error('Error sending message to Agent Service:', error);
        reject(error);
      }
    });
  }

  async getChatHistory(request: GetChatHistoryDto): Promise<GetChatHistoryResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {
          session_id: request.sessionId,
        };

        this.client.GetChatHistory(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service GetChatHistory gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📋 Retrieved ${response.messages?.length || 0} messages for session ${request.sessionId}`);
            resolve({
              messages: (response.messages || []).map((msg: any) => ({
                role: msg.role || '',
                content: msg.content || '',
                timestamp: msg.timestamp || Date.now(),
                sessionId: msg.session_id || request.sessionId,
                sources: msg.sources || [],
                toolCalls: msg.tool_calls || []
              })),
              status: {
                success: response.status?.success || true,
                message: response.status?.message || 'Success',
                code: response.status?.code || 200
              }
            });
          }
        });
      } catch (error) {
        this.logger.error('Error getting chat history from Agent Service:', error);
        reject(error);
      }
    });
  }

  async clearChatHistory(request: ClearChatHistoryDto): Promise<StatusResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {
          session_id: request.sessionId,
        };

        this.client.ClearChatHistory(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service ClearChatHistory gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`🧹 Cleared chat history for session ${request.sessionId}`);
            resolve({
              status: {
                success: response.status?.success || true,
                message: response.status?.message || 'Chat history cleared successfully',
                code: response.status?.code || 200
              }
            });
          }
        });
      } catch (error) {
        this.logger.error('Error clearing chat history from Agent Service:', error);
        reject(error);
      }
    });
  }

  async listTools(): Promise<ToolsListResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {};

        this.client.ListTools(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service ListTools gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`🔧 Retrieved ${response.tools?.length || 0} tools`);
            resolve({
              tools: (response.tools || []).map((tool: any) => ({
                name: tool.name || '',
                description: tool.description || '',
                available: tool.available || false
              }))
            });
          }
        });
      } catch (error) {
        this.logger.error('Error listing tools from Agent Service:', error);
        reject(error);
      }
    });
  }

  async testTool(request: ToolTestDto): Promise<ToolTestResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {
          tool_name: request.toolName,
          parameters: request.parameters || {},
        };

        this.client.TestTool(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service TestTool gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`🧪 Tool test ${response.success ? 'passed' : 'failed'} for ${request.toolName}`);
            resolve({
              success: response.success || false,
              result: response.result || '',
              errorMessage: response.error_message || undefined
            });
          }
        });
      } catch (error) {
        this.logger.error('Error testing tool from Agent Service:', error);
        reject(error);
      }
    });
  }

  async getHealth(): Promise<HealthResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest = {};

        this.client.HealthCheck(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Agent Service HealthCheck gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`💚 Agent Service health: ${response.healthy ? 'healthy' : 'unhealthy'}`);
            resolve({
              healthy: response.healthy || false,
              version: response.version || '',
              dependencies: response.dependencies || {}
            });
          }
        });
      } catch (error) {
        this.logger.error('Error checking health from Agent Service:', error);
        reject(error);
      }
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.healthy;
    } catch (error) {
      this.logger.error('Agent Service health check error:', error);
      return false;
    }
  }
} 