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
  UsePipes,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes
} from '@nestjs/swagger';
import { DocumentService } from '../services/document.service';
import {
  IngestDocumentDto,
  IngestDocumentResponseDto,
  GetDocumentStatusDto,
  DocumentStatusResponseDto,
  ListDocumentsDto,
  ListDocumentsResponseDto,
  DeleteDocumentDto,
  DeleteDocumentResponseDto,
  GetDocumentDto,
  GetDocumentResponseDto
} from '../dto/document.dto';

@ApiTags('Documents')
@Controller('documents')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  /**
   * Document Ingestion Endpoints
   */
  @Post('ingest')
  @ApiOperation({
    summary: 'Ingest a document for processing',
    description: 'Submit a document for processing, chunking, and vectorization. Returns a job ID for tracking progress.'
  })
  @ApiBody({ type: IngestDocumentDto })
  @ApiResponse({
    status: 200,
    description: 'Document ingestion started successfully',
    type: IngestDocumentResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or document service unavailable'
  })
  async ingestDocument(@Body() ingestRequest: IngestDocumentDto): Promise<IngestDocumentResponseDto> {
    try {
      this.logger.log(`📄 Received document ingestion request: ${ingestRequest.filename}`);
      
      // Validate content size (max 10MB for text content)
      const contentSizeBytes = Buffer.byteLength(ingestRequest.content, 'utf8');
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      
      if (contentSizeBytes > maxSizeBytes) {
        throw new HttpException(
          {
            success: false,
            message: 'Document content too large',
            error: `Content size ${contentSizeBytes} bytes exceeds maximum of ${maxSizeBytes} bytes`
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const response = await this.documentService.ingestDocument(ingestRequest);
      this.logger.log(`✅ Document ingestion started: ${response.jobId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error ingesting document ${ingestRequest.filename}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to start document ingestion',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ingest/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Ingest a document file for processing',
    description: 'Upload and submit a document file for processing, chunking, and vectorization.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for the document'
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for the document'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Document file ingestion started successfully',
    type: IngestDocumentResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or request parameters'
  })
  async ingestDocumentFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(txt|pdf|docx|md)$/ })
        ]
      })
    ) file: Express.Multer.File,
    @Body('tags') tags?: string[],
    @Body('metadata') metadata?: Record<string, any>
  ): Promise<IngestDocumentResponseDto> {
    try {
      this.logger.log(`📁 Received file upload: ${file.originalname} (${file.size} bytes)`);

      const ingestRequest: IngestDocumentDto = {
        content: file.buffer.toString('utf-8'),
        filename: file.originalname,
        contentType: file.mimetype,
        tags: tags || [],
        metadata: metadata || {}
      };

      const response = await this.documentService.ingestDocument(ingestRequest);
      this.logger.log(`✅ File ingestion started: ${response.jobId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error ingesting file ${file?.originalname}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to start file ingestion',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Document Status Endpoints
   */
  @Get('status/:jobId')
  @ApiOperation({
    summary: 'Get document processing status',
    description: 'Check the status of a document processing job by job ID.'
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job ID to check status for',
    example: 'job-12345-abcdef'
  })
  @ApiResponse({
    status: 200,
    description: 'Document status retrieved successfully',
    type: DocumentStatusResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid job ID'
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found'
  })
  async getDocumentStatus(@Param('jobId') jobId: string): Promise<DocumentStatusResponseDto> {
    try {
      if (!jobId || jobId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'Job ID is required'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`📊 Checking status for job: ${jobId}`);
      const response = await this.documentService.getDocumentStatus({ jobId });
      this.logger.log(`✅ Status retrieved for job: ${jobId}, status: ${response.status}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error getting status for job ${jobId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get document status',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Document Management Endpoints
   */
  @Get()
  @ApiOperation({
    summary: 'List processed documents',
    description: 'Get a paginated list of processed documents with optional filtering.'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of documents to return (max 100)',
    example: 10
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination',
    example: 0
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    example: 'personal,work'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search query to filter documents',
    example: 'machine learning'
  })
  @ApiResponse({
    status: 200,
    description: 'Documents list retrieved successfully',
    type: ListDocumentsResponseDto
  })
  async listDocuments(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('tags') tags?: string,
    @Query('search') search?: string
  ): Promise<ListDocumentsResponseDto> {
    try {
      this.logger.log('📋 Retrieving documents list');
      
      const listRequest: ListDocumentsDto = {
        limit: limit || 10,
        offset: offset || 0,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
        search: search || undefined
      };

      const response = await this.documentService.listDocuments(listRequest);
      this.logger.log(`✅ Retrieved ${response.documents.length} documents (total: ${response.totalCount})`);
      return response;
    } catch (error) {
      this.logger.error('❌ Error listing documents:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to list documents',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':documentId')
  @ApiOperation({
    summary: 'Get document details',
    description: 'Get detailed information about a specific document, optionally including content.'
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID to retrieve',
    example: 'doc-98765-xyz'
  })
  @ApiQuery({
    name: 'includeContent',
    required: false,
    description: 'Whether to include full content',
    example: false
  })
  @ApiResponse({
    status: 200,
    description: 'Document details retrieved successfully',
    type: GetDocumentResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found'
  })
  async getDocument(
    @Param('documentId') documentId: string,
    @Query('includeContent') includeContent?: boolean
  ): Promise<GetDocumentResponseDto> {
    try {
      if (!documentId || documentId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'Document ID is required'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`📄 Retrieving document: ${documentId}`);
      const response = await this.documentService.getDocument({
        documentId,
        includeContent: includeContent || false
      });
      this.logger.log(`✅ Document retrieved: ${documentId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error getting document ${documentId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get document',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':documentId')
  @ApiOperation({
    summary: 'Delete a document',
    description: 'Delete a document and all its associated data (chunks, embeddings, etc.).'
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID to delete',
    example: 'doc-98765-xyz'
  })
  @ApiQuery({
    name: 'force',
    required: false,
    description: 'Force deletion even if document is being used',
    example: false
  })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
    type: DeleteDocumentResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found'
  })
  @ApiResponse({
    status: 409,
    description: 'Document is in use and cannot be deleted without force flag'
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Query('force') force?: boolean
  ): Promise<DeleteDocumentResponseDto> {
    try {
      if (!documentId || documentId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'Document ID is required'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`🗑️ Deleting document: ${documentId} (force: ${force || false})`);
      const response = await this.documentService.deleteDocument({
        documentId,
        force: force || false
      });
      this.logger.log(`✅ Document deleted: ${documentId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error deleting document ${documentId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete document',
          error: error.message || 'Unknown error occurred'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health Check Endpoint
   */
  @Get('health/check')
  @ApiOperation({
    summary: 'Check document service health',
    description: 'Check if the document processing service is healthy and available.'
  })
  @ApiResponse({
    status: 200,
    description: 'Document service is healthy',
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
    description: 'Document service is unhealthy'
  })
  async checkHealth(): Promise<{ healthy: boolean; timestamp: string }> {
    try {
      this.logger.log('🔍 Checking document service health');
      const healthy = await this.documentService.isHealthy();
      const response = {
        healthy,
        timestamp: new Date().toISOString()
      };
      
      if (!healthy) {
        this.logger.warn('⚠️ Document service health check failed');
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      this.logger.log('✅ Document service health check passed');
      return response;
    } catch (error) {
      this.logger.error('❌ Error in document service health check:', error);
      
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
