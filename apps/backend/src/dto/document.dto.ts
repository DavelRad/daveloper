import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, Min, Max } from 'class-validator';

// Ingest Document Request
export class IngestDocumentDto {
  @ApiProperty({
    description: 'Content of the document to ingest',
    example: 'This is the content of my document...'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Filename of the document',
    example: 'my-document.txt'
  })
  @IsString()
  filename: string;

  @ApiPropertyOptional({
    description: 'Document type/format',
    example: 'text/plain',
    default: 'text/plain'
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Metadata for the document',
    example: { author: 'John Doe', category: 'personal' }
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags for the document',
    example: ['personal', 'important']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Ingest Document Response
export class IngestDocumentResponseDto {
  @ApiProperty({
    description: 'Job ID for tracking the ingestion process',
    example: 'job-12345-abcdef'
  })
  jobId: string;

  @ApiProperty({
    description: 'Success status',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Document ingestion started successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Estimated processing time in seconds',
    example: 30
  })
  estimatedTime: number;
}

// Get Document Status Request
export class GetDocumentStatusDto {
  @ApiProperty({
    description: 'Job ID to check status for',
    example: 'job-12345-abcdef'
  })
  @IsString()
  jobId: string;
}

// Document Status Response
export class DocumentStatusResponseDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'job-12345-abcdef'
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status of the document processing',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed'
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 100
  })
  progress: number;

  @ApiProperty({
    description: 'Status message',
    example: 'Document processed successfully'
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Error message if status is failed'
  })
  error?: string;

  @ApiProperty({
    description: 'Processing timestamps'
  })
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
  };

  @ApiPropertyOptional({
    description: 'Document ID if processing completed',
    example: 'doc-98765-xyz'
  })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Processing statistics'
  })
  stats?: {
    chunks: number;
    tokens: number;
    embeddingTime: number;
  };
}

// List Documents Request
export class ListDocumentsDto {
  @ApiPropertyOptional({
    description: 'Number of documents to return',
    example: 10,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filter by document tags',
    example: ['personal', 'work']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Search query to filter documents',
    example: 'machine learning'
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// Document Info
export class DocumentInfoDto {
  @ApiProperty({
    description: 'Document ID',
    example: 'doc-98765-xyz'
  })
  id: string;

  @ApiProperty({
    description: 'Filename',
    example: 'my-document.txt'
  })
  filename: string;

  @ApiProperty({
    description: 'Content type',
    example: 'text/plain'
  })
  contentType: string;

  @ApiProperty({
    description: 'Document size in bytes',
    example: 1024
  })
  size: number;

  @ApiProperty({
    description: 'Number of chunks',
    example: 5
  })
  chunks: number;

  @ApiProperty({
    description: 'Document tags',
    example: ['personal', 'important']
  })
  tags: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:35:00Z'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Document metadata'
  })
  metadata?: Record<string, any>;
}

// List Documents Response
export class ListDocumentsResponseDto {
  @ApiProperty({
    description: 'Array of documents',
    type: [DocumentInfoDto]
  })
  documents: DocumentInfoDto[];

  @ApiProperty({
    description: 'Total count of documents',
    example: 25
  })
  totalCount: number;

  @ApiProperty({
    description: 'Current page limit',
    example: 10
  })
  limit: number;

  @ApiProperty({
    description: 'Current page offset',
    example: 0
  })
  offset: number;

  @ApiProperty({
    description: 'Whether there are more documents available',
    example: true
  })
  hasMore: boolean;
}

// Delete Document Request
export class DeleteDocumentDto {
  @ApiProperty({
    description: 'Document ID to delete',
    example: 'doc-98765-xyz'
  })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({
    description: 'Whether to force delete even if document is being used',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

// Delete Document Response
export class DeleteDocumentResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Document deleted successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Deleted document ID',
    example: 'doc-98765-xyz'
  })
  documentId: string;
}

// Get Document Request
export class GetDocumentDto {
  @ApiProperty({
    description: 'Document ID to retrieve',
    example: 'doc-98765-xyz'
  })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({
    description: 'Whether to include full content',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  includeContent?: boolean;
}

// Get Document Response
export class GetDocumentResponseDto {
  @ApiProperty({
    description: 'Document information',
    type: DocumentInfoDto
  })
  document: DocumentInfoDto;

  @ApiPropertyOptional({
    description: 'Full document content (if requested)'
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'Document chunks (if requested)'
  })
  chunks?: Array<{
    id: string;
    content: string;
    tokens: number;
    startIndex: number;
    endIndex: number;
  }>;
}
