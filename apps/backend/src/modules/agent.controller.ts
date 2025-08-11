import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery
} from '@nestjs/swagger';
import { AgentService } from '../services/agent.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  GetChatHistoryDto,
  GetChatHistoryResponseDto,
  ClearChatHistoryDto,
  StatusResponseDto,
  ToolTestDto,
  ToolTestResponseDto,
  ToolsListResponseDto,
  HealthResponseDto
} from '../dto/agent.dto';

@ApiTags('Agent')
@Controller('agent')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  /**
   * Chat Endpoints
   */
  @Post('chat')
  @ApiOperation({ 
    summary: 'Send a message to the AI agent',
    description: 'Send a message to the AI agent and receive a response. The agent can use tools and provide contextual responses.'
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Successful response from the AI agent',
    type: ChatResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error or agent service unavailable' 
  })
  async sendMessage(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      this.logger.log(`💬 Received chat message from session: ${chatRequest.sessionId}`);
      const response = await this.agentService.sendMessage(chatRequest);
      this.logger.log(`✅ Chat response sent for session: ${chatRequest.sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error in chat for session ${chatRequest.sessionId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get response from AI agent',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('chat/history/:sessionId')
  @ApiOperation({ 
    summary: 'Get chat history for a session',
    description: 'Retrieve the complete chat history for a specific session ID.'
  })
  @ApiParam({ 
    name: 'sessionId', 
    description: 'Session ID to retrieve chat history for',
    example: 'session-12345' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat history retrieved successfully',
    type: GetChatHistoryResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid session ID' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error or agent service unavailable' 
  })
  async getChatHistory(@Param('sessionId') sessionId: string): Promise<GetChatHistoryResponseDto> {
    try {
      if (!sessionId || sessionId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'Session ID is required'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`📋 Retrieving chat history for session: ${sessionId}`);
      const response = await this.agentService.getChatHistory({ sessionId });
      this.logger.log(`✅ Chat history retrieved for session: ${sessionId}, messages: ${response.messages.length}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error retrieving chat history for session ${sessionId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve chat history',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('chat/history/:sessionId')
  @ApiOperation({ 
    summary: 'Clear chat history for a session',
    description: 'Delete all chat history for a specific session ID.'
  })
  @ApiParam({ 
    name: 'sessionId', 
    description: 'Session ID to clear chat history for',
    example: 'session-12345' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat history cleared successfully',
    type: StatusResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid session ID' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error or agent service unavailable' 
  })
  async clearChatHistory(@Param('sessionId') sessionId: string): Promise<StatusResponseDto> {
    try {
      if (!sessionId || sessionId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'Session ID is required'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`🧹 Clearing chat history for session: ${sessionId}`);
      const response = await this.agentService.clearChatHistory({ sessionId });
      this.logger.log(`✅ Chat history cleared for session: ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error clearing chat history for session ${sessionId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to clear chat history',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Tool Endpoints
   */
  @Get('tools')
  @ApiOperation({ 
    summary: 'List available tools',
    description: 'Get a list of all available tools that the AI agent can use.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tools list retrieved successfully',
    type: ToolsListResponseDto
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error or agent service unavailable' 
  })
  async listTools(): Promise<ToolsListResponseDto> {
    try {
      this.logger.log('🔧 Retrieving available tools');
      const response = await this.agentService.listTools();
      this.logger.log(`✅ Tools list retrieved, count: ${response.tools.length}`);
      return response;
    } catch (error) {
      this.logger.error('❌ Error retrieving tools list:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve tools list',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('tools/test')
  @ApiOperation({ 
    summary: 'Test a specific tool',
    description: 'Test a specific tool with provided parameters to verify it\'s working correctly.'
  })
  @ApiBody({ type: ToolTestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Tool test completed',
    type: ToolTestResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid tool name or parameters' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error or agent service unavailable' 
  })
  async testTool(@Body() toolTest: ToolTestDto): Promise<ToolTestResponseDto> {
    try {
      this.logger.log(`🧪 Testing tool: ${toolTest.toolName}`);
      const response = await this.agentService.testTool(toolTest);
      this.logger.log(`✅ Tool test completed for: ${toolTest.toolName}, success: ${response.success}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error testing tool ${toolTest.toolName}:`, error);
      throw new HttpException(
        {
          success: false,
          message: `Failed to test tool: ${toolTest.toolName}`,
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health Endpoints
   */
  @Get('health')
  @ApiOperation({ 
    summary: 'Check agent service health',
    description: 'Get detailed health information about the AI agent service and its dependencies.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status retrieved successfully',
    type: HealthResponseDto
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service unavailable - agent service is unhealthy' 
  })
  async getHealth(): Promise<HealthResponseDto> {
    try {
      this.logger.log('💚 Checking agent service health');
      const response = await this.agentService.getHealth();
      
      if (!response.healthy) {
        this.logger.warn('⚠️ Agent service is unhealthy');
        throw new HttpException(
          {
            success: false,
            message: 'Agent service is unhealthy',
            health: response
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      
      this.logger.log('✅ Agent service is healthy');
      return response;
    } catch (error) {
      this.logger.error('❌ Error checking agent service health:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to check agent service health',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health/simple')
  @ApiOperation({ 
    summary: 'Simple health check',
    description: 'Simple boolean health check for the AI agent service.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        healthy: { type: 'boolean' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy' 
  })
  async isHealthy(): Promise<{ healthy: boolean; timestamp: string }> {
    try {
      this.logger.log('🔍 Performing simple health check');
      const healthy = await this.agentService.isHealthy();
      const response = {
        healthy,
        timestamp: new Date().toISOString()
      };
      
      if (!healthy) {
        this.logger.warn('⚠️ Simple health check failed');
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      this.logger.log('✅ Simple health check passed');
      return response;
    } catch (error) {
      this.logger.error('❌ Error in simple health check:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          healthy: false,
          timestamp: new Date().toISOString(),
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
