import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
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
  GetDocumentResponseDto,
  DocumentInfoDto
} from '../dto/document.dto';
import {
  GrpcDocumentIngestRequest,
  GrpcDocumentIngestResponse,
  GrpcDocumentStatusRequest,
  GrpcDocumentStatusResponse,
  GrpcDocumentListRequest,
  GrpcDocumentListResponse,
  GrpcDocumentDeleteRequest,
  GrpcDocumentDeleteResponse,
  GrpcDocumentGetRequest,
  GrpcDocumentGetResponse
} from '../types/document.types';

interface DocumentServiceClient {
  IngestDocuments: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  GetDocumentStatus: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  ListDocuments: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  DeleteDocument: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  GetDocument: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
  HealthCheck: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
}

@Injectable()
export class DocumentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentService.name);
  private client: DocumentServiceClient;

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

      const documentProto = grpc.loadPackageDefinition(packageDefinition) as any;

      // Create gRPC client
      this.client = new documentProto.agent_service.AgentService(
        grpcUrl,
        grpc.credentials.createInsecure()
      );

      this.logger.log(`✅ Connected to Document Service at ${grpcUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize Document Service client:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        // Close the gRPC client connection
        (this.client as any).close?.();
        this.logger.log('🔌 Document Service client connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Document Service client:', error);
    }
  }

  async ingestDocument(request: IngestDocumentDto): Promise<IngestDocumentResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest: GrpcDocumentIngestRequest = {
          content: request.content,
          filename: request.filename,
          content_type: request.contentType || 'text/plain',
          metadata: request.metadata || {},
          tags: request.tags || [],
        };

        this.client.IngestDocuments(grpcRequest, (error, response: GrpcDocumentIngestResponse) => {
          if (error) {
            this.logger.error('Document Service IngestDocuments gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📄 Document ingestion started: ${response.job_id}`);
            resolve({
              jobId: response.job_id,
              success: response.success,
              message: response.message,
              estimatedTime: response.estimated_time,
            });
          }
        });
      } catch (error) {
        this.logger.error('Error ingesting document:', error);
        reject(error);
      }
    });
  }

  async getDocumentStatus(request: GetDocumentStatusDto): Promise<DocumentStatusResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest: GrpcDocumentStatusRequest = {
          job_id: request.jobId,
        };

        this.client.GetDocumentStatus(grpcRequest, (error, response: GrpcDocumentStatusResponse) => {
          if (error) {
            this.logger.error('Document Service GetDocumentStatus gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📊 Document status: ${response.status} for job ${response.job_id}`);
            resolve({
              jobId: response.job_id,
              status: response.status as any,
              progress: response.progress,
              message: response.message,
              error: response.error,
              timestamps: response.timestamps,
              documentId: response.document_id,
              stats: response.stats ? {
                chunks: response.stats.chunks,
                tokens: response.stats.tokens,
                embeddingTime: response.stats.embedding_time,
              } : undefined,
            });
          }
        });
      } catch (error) {
        this.logger.error('Error getting document status:', error);
        reject(error);
      }
    });
  }

  async listDocuments(request: ListDocumentsDto): Promise<ListDocumentsResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest: GrpcDocumentListRequest = {
          limit: request.limit || 10,
          offset: request.offset || 0,
          tags: request.tags || [],
          search: request.search,
        };

        this.client.ListDocuments(grpcRequest, (error, response: GrpcDocumentListResponse) => {
          if (error) {
            this.logger.error('Document Service ListDocuments gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📋 Retrieved ${response.documents.length} documents`);
            
            const documents: DocumentInfoDto[] = response.documents.map(doc => ({
              id: doc.id,
              filename: doc.filename,
              contentType: doc.content_type,
              size: doc.size,
              chunks: doc.chunks,
              tags: doc.tags,
              createdAt: doc.created_at,
              updatedAt: doc.updated_at,
              metadata: doc.metadata,
            }));

            resolve({
              documents,
              totalCount: response.total_count,
              limit: response.limit,
              offset: response.offset,
              hasMore: response.has_more,
            });
          }
        });
      } catch (error) {
        this.logger.error('Error listing documents:', error);
        reject(error);
      }
    });
  }

  async deleteDocument(request: DeleteDocumentDto): Promise<DeleteDocumentResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest: GrpcDocumentDeleteRequest = {
          document_id: request.documentId,
          force: request.force || false,
        };

        this.client.DeleteDocument(grpcRequest, (error, response: GrpcDocumentDeleteResponse) => {
          if (error) {
            this.logger.error('Document Service DeleteDocument gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`🗑️ Document deleted: ${response.document_id}`);
            resolve({
              success: response.success,
              message: response.message,
              documentId: response.document_id,
            });
          }
        });
      } catch (error) {
        this.logger.error('Error deleting document:', error);
        reject(error);
      }
    });
  }

  async getDocument(request: GetDocumentDto): Promise<GetDocumentResponseDto> {
    return new Promise((resolve, reject) => {
      try {
        const grpcRequest: GrpcDocumentGetRequest = {
          document_id: request.documentId,
          include_content: request.includeContent || false,
        };

        this.client.GetDocument(grpcRequest, (error, response: GrpcDocumentGetResponse) => {
          if (error) {
            this.logger.error('Document Service GetDocument gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📄 Retrieved document: ${response.document.id}`);
            
            const document: DocumentInfoDto = {
              id: response.document.id,
              filename: response.document.filename,
              contentType: response.document.content_type,
              size: response.document.size,
              chunks: response.document.chunks,
              tags: response.document.tags,
              createdAt: response.document.created_at,
              updatedAt: response.document.updated_at,
              metadata: response.document.metadata,
            };

            const chunks = response.chunks ? response.chunks.map(chunk => ({
              id: chunk.id,
              content: chunk.content,
              tokens: chunk.tokens,
              startIndex: chunk.start_index,
              endIndex: chunk.end_index,
            })) : undefined;

            resolve({
              document,
              content: response.content,
              chunks,
            });
          }
        });
      } catch (error) {
        this.logger.error('Error getting document:', error);
        reject(error);
      }
    });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const grpcRequest = {};

        this.client.HealthCheck(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Document Service health check error:', error);
            resolve(false);
          } else {
            this.logger.log(`💚 Document Service health: ${response.healthy ? 'healthy' : 'unhealthy'}`);
            resolve(response.healthy || false);
          }
        });
      } catch (error) {
        this.logger.error('Document Service health check error:', error);
        resolve(false);
      }
    });
  }
}
