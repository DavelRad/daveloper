import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  Min, 
  Max, 
  IsNotEmpty,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Chat Request DTOs
 */
export class ChatRequestDto {
  @ApiProperty({ 
    description: 'The message to send to the AI agent',
    example: 'What is my latest GitHub project?'
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ 
    description: 'Session ID for conversation context',
    example: 'session-12345'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ 
    description: 'Whether to use tools in the response',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  useTools?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Maximum tokens for the response',
    minimum: 1,
    maximum: 8192,
    default: 4096
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  @Transform(({ value }) => parseInt(value))
  maxTokens?: number = 4096;
}

/**
 * Chat History DTOs
 */
export class GetChatHistoryDto {
  @ApiProperty({ 
    description: 'Session ID to retrieve chat history for',
    example: 'session-12345'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class ClearChatHistoryDto {
  @ApiProperty({ 
    description: 'Session ID to clear chat history for',
    example: 'session-12345'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Tool DTOs
 */
export class ToolTestDto {
  @ApiProperty({ 
    description: 'Name of the tool to test',
    example: 'get_github_profile'
  })
  @IsString()
  @IsNotEmpty()
  toolName: string;

  @ApiPropertyOptional({ 
    description: 'Parameters to pass to the tool',
    example: { username: 'DavelRad' }
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, string>;
}

/**
 * Response DTOs
 */
export class StatusDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Status code' })
  code: number;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'AI agent response text' })
  response: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Sources used for the response', type: [String] })
  sources: string[];

  @ApiProperty({ description: 'Tools called during response generation', type: [String] })
  toolCalls: string[];

  @ApiProperty({ description: 'AI reasoning for the response' })
  reasoning: string;

  @ApiProperty({ description: 'Operation status', type: StatusDto })
  status: StatusDto;
}

export class ChatMessageDto {
  @ApiProperty({ description: 'Role of the message sender (user/assistant)' })
  role: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Message timestamp' })
  timestamp: number;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Sources used for the message', type: [String] })
  sources: string[];

  @ApiProperty({ description: 'Tools called for the message', type: [String] })
  toolCalls: string[];
}

export class GetChatHistoryResponseDto {
  @ApiProperty({ description: 'Chat messages', type: [ChatMessageDto] })
  messages: ChatMessageDto[];

  @ApiProperty({ description: 'Operation status', type: StatusDto })
  status: StatusDto;
}

export class StatusResponseDto {
  @ApiProperty({ description: 'Operation status', type: StatusDto })
  status: StatusDto;
}

export class ToolInfoDto {
  @ApiProperty({ description: 'Tool name' })
  name: string;

  @ApiProperty({ description: 'Tool description' })
  description: string;

  @ApiProperty({ description: 'Whether the tool is available' })
  available: boolean;
}

export class ToolsListResponseDto {
  @ApiProperty({ description: 'Available tools', type: [ToolInfoDto] })
  tools: ToolInfoDto[];
}

export class ToolTestResponseDto {
  @ApiProperty({ description: 'Whether the tool test was successful' })
  success: boolean;

  @ApiProperty({ description: 'Tool test result' })
  result: string;

  @ApiPropertyOptional({ description: 'Error message if test failed' })
  errorMessage?: string;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Whether the service is healthy' })
  healthy: boolean;

  @ApiProperty({ description: 'Service version' })
  version: string;

  @ApiProperty({ description: 'Dependency statuses' })
  dependencies: Record<string, string>;
}
