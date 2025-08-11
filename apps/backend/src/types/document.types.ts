// Document processing types for internal use

export interface DocumentJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
  };
  documentId?: string;
  stats?: {
    chunks: number;
    tokens: number;
    embeddingTime: number;
  };
}

export interface DocumentMetadata {
  filename: string;
  contentType: string;
  size: number;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  tokens: number;
  startIndex: number;
  endIndex: number;
  embeddings?: number[];
}

export interface DocumentRecord {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  chunks: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface DocumentProcessingRequest {
  content: string;
  filename: string;
  contentType?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface DocumentProcessingResponse {
  jobId: string;
  success: boolean;
  message: string;
  estimatedTime: number;
}

export interface DocumentListRequest {
  limit?: number;
  offset?: number;
  tags?: string[];
  search?: string;
}

export interface DocumentListResponse {
  documents: DocumentRecord[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface DocumentDeleteRequest {
  documentId: string;
  force?: boolean;
}

export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
  documentId: string;
}

export interface DocumentGetRequest {
  documentId: string;
  includeContent?: boolean;
}

export interface DocumentGetResponse {
  document: DocumentRecord;
  content?: string;
  chunks?: DocumentChunk[];
}

// gRPC related types
export interface GrpcDocumentIngestRequest {
  content: string;
  filename: string;
  content_type?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface GrpcDocumentIngestResponse {
  job_id: string;
  success: boolean;
  message: string;
  estimated_time: number;
}

export interface GrpcDocumentStatusRequest {
  job_id: string;
}

export interface GrpcDocumentStatusResponse {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  error?: string;
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
  };
  document_id?: string;
  stats?: {
    chunks: number;
    tokens: number;
    embedding_time: number;
  };
}

export interface GrpcDocumentListRequest {
  limit?: number;
  offset?: number;
  tags?: string[];
  search?: string;
}

export interface GrpcDocumentListResponse {
  documents: Array<{
    id: string;
    filename: string;
    content_type: string;
    size: number;
    chunks: number;
    tags: string[];
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any>;
  }>;
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface GrpcDocumentDeleteRequest {
  document_id: string;
  force?: boolean;
}

export interface GrpcDocumentDeleteResponse {
  success: boolean;
  message: string;
  document_id: string;
}

export interface GrpcDocumentGetRequest {
  document_id: string;
  include_content?: boolean;
}

export interface GrpcDocumentGetResponse {
  document: {
    id: string;
    filename: string;
    content_type: string;
    size: number;
    chunks: number;
    tags: string[];
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any>;
  };
  content?: string;
  chunks?: Array<{
    id: string;
    content: string;
    tokens: number;
    start_index: number;
    end_index: number;
  }>;
}
