import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from '../modules/agent.controller';
import { AgentService } from '../services/agent.service';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto, ChatResponseDto } from '../dto/agent.dto';

describe('AgentController', () => {
  let controller: AgentController;
  let service: AgentService;

  const mockAgentService = {
    sendMessage: jest.fn(),
    getChatHistory: jest.fn(),
    clearChatHistory: jest.fn(),
    listTools: jest.fn(),
    testTool: jest.fn(),
    getHealth: jest.fn(),
    isHealthy: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('localhost:50052'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        {
          provide: AgentService,
          useValue: mockAgentService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should send a message and return a response', async () => {
      const chatRequest: ChatRequestDto = {
        message: 'Hello',
        sessionId: 'test-session',
        useTools: true,
        maxTokens: 1000,
      };

      const expectedResponse: ChatResponseDto = {
        response: 'Hello! How can I help you?',
        sessionId: 'test-session',
        sources: [],
        toolCalls: [],
        reasoning: '',
        status: {
          success: true,
          message: 'Success',
          code: 200,
        },
      };

      mockAgentService.sendMessage.mockResolvedValue(expectedResponse);

      const result = await controller.sendMessage(chatRequest);

      expect(service.sendMessage).toHaveBeenCalledWith(chatRequest);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors gracefully', async () => {
      const chatRequest: ChatRequestDto = {
        message: 'Hello',
        sessionId: 'test-session',
        useTools: true,
        maxTokens: 1000,
      };

      mockAgentService.sendMessage.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.sendMessage(chatRequest)).rejects.toThrow();
    });
  });

  describe('getChatHistory', () => {
    it('should retrieve chat history', async () => {
      const sessionId = 'test-session';
      const expectedResponse = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
            sessionId: 'test-session',
            sources: [],
            toolCalls: [],
          },
        ],
        status: {
          success: true,
          message: 'Success',
          code: 200,
        },
      };

      mockAgentService.getChatHistory.mockResolvedValue(expectedResponse);

      const result = await controller.getChatHistory(sessionId);

      expect(service.getChatHistory).toHaveBeenCalledWith({ sessionId });
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid session ID', async () => {
      await expect(controller.getChatHistory('')).rejects.toThrow();
      await expect(controller.getChatHistory('   ')).rejects.toThrow();
    });
  });

  describe('listTools', () => {
    it('should return list of tools', async () => {
      const expectedResponse = {
        tools: [
          {
            name: 'get_github_profile',
            description: 'Fetch GitHub user profile',
            available: true,
          },
        ],
      };

      mockAgentService.listTools.mockResolvedValue(expectedResponse);

      const result = await controller.listTools();

      expect(service.listTools).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('isHealthy', () => {
    it('should return health status', async () => {
      mockAgentService.isHealthy.mockResolvedValue(true);

      const result = await controller.isHealthy();

      expect(service.isHealthy).toHaveBeenCalled();
      expect(result.healthy).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle unhealthy service', async () => {
      mockAgentService.isHealthy.mockResolvedValue(false);

      await expect(controller.isHealthy()).rejects.toThrow();
    });
  });
});
