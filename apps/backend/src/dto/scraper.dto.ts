import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsEnum,
  IsArray,
  IsUrl,
  Min, 
  Max, 
  IsNotEmpty,
  IsObject,
  ValidateNested,
  Matches,
  Length,
  IsDateString
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Scraper Source Types
 */
export enum ScraperSource {
  BBC = 'BBC',
  REUTERS = 'Reuters',
  GUARDIAN = 'Guardian',
  CNN = 'CNN',
  AP = 'Associated Press',
  CUSTOM = 'Custom'
}

export enum ScraperStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ScraperPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Scrape Request DTOs
 */
export class ScrapeRequestDto {
  @ApiProperty({ 
    description: 'News source to scrape',
    enum: ScraperSource,
    example: ScraperSource.BBC
  })
  @IsEnum(ScraperSource, { message: 'Invalid scraper source' })
  source: ScraperSource;

  @ApiPropertyOptional({ 
    description: 'Number of articles to scrape',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @IsNumber({}, { message: 'Article count must be a number' })
  @Min(1, { message: 'Must scrape at least 1 article' })
  @Max(100, { message: 'Cannot scrape more than 100 articles at once' })
  @Transform(({ value }) => parseInt(value))
  articleCount?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Categories to focus on',
    example: ['technology', 'business'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'Categories must be an array' })
  @IsString({ each: true, message: 'Each category must be a string' })
  @Length(2, 50, { each: true, message: 'Category length must be between 2 and 50 characters' })
  categories?: string[];

  @ApiPropertyOptional({ 
    description: 'Keywords to search for',
    example: ['artificial intelligence', 'machine learning'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'Keywords must be an array' })
  @IsString({ each: true, message: 'Each keyword must be a string' })
  @Length(2, 100, { each: true, message: 'Keyword length must be between 2 and 100 characters' })
  keywords?: string[];

  @ApiPropertyOptional({ 
    description: 'Date range for articles (ISO string)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid ISO date string' })
  dateFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Date range for articles (ISO string)',
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid ISO date string' })
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Language preference',
    example: 'en',
    default: 'en'
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @Matches(/^[a-z]{2}$/, { message: 'Language must be a valid 2-letter language code' })
  language?: string = 'en';

  @ApiPropertyOptional({ 
    description: 'Processing priority',
    enum: ScraperPriority,
    default: ScraperPriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(ScraperPriority, { message: 'Invalid priority level' })
  priority?: ScraperPriority = ScraperPriority.MEDIUM;

  @ApiPropertyOptional({ 
    description: 'Whether to include full article content',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Include content must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  includeContent?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Whether to generate AI summaries',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Generate summaries must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  generateSummaries?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Custom scraping configuration',
    example: { 
      timeout: 30000, 
      retries: 3, 
      userAgent: 'DaveloperBot/1.0' 
    }
  })
  @IsOptional()
  @IsObject({ message: 'Custom config must be an object' })
  customConfig?: {
    timeout?: number;
    retries?: number;
    userAgent?: string;
    headers?: Record<string, string>;
  };
}

/**
 * Custom URL Scrape Request
 */
export class CustomScrapeRequestDto {
  @ApiProperty({ 
    description: 'Custom URL to scrape',
    example: 'https://example.com/news'
  })
  @IsUrl({}, { message: 'Must be a valid URL' })
  @IsNotEmpty({ message: 'URL is required' })
  url: string;

  @ApiPropertyOptional({ 
    description: 'CSS selector for article content',
    example: '.article-content'
  })
  @IsOptional()
  @IsString({ message: 'Selector must be a string' })
  @Length(1, 200, { message: 'Selector length must be between 1 and 200 characters' })
  contentSelector?: string;

  @ApiPropertyOptional({ 
    description: 'CSS selector for article title',
    example: 'h1.article-title'
  })
  @IsOptional()
  @IsString({ message: 'Title selector must be a string' })
  @Length(1, 200, { message: 'Title selector length must be between 1 and 200 characters' })
  titleSelector?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to generate AI summary',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Generate summary must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  generateSummary?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Custom headers for the request'
  })
  @IsOptional()
  @IsObject({ message: 'Headers must be an object' })
  headers?: Record<string, string>;
}

/**
 * Response DTOs
 */
export class ScrapeResponseDto {
  @ApiProperty({
    description: 'Unique job ID for tracking',
    example: 'scrape-job-12345-abcdef'
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status of the scraping job',
    enum: ScraperStatus,
    example: ScraperStatus.PENDING
  })
  status: ScraperStatus;

  @ApiProperty({
    description: 'Success status',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Scraping job started successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Estimated completion time in seconds',
    example: 120
  })
  estimatedTime: number;

  @ApiProperty({
    description: 'Job creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Job priority level',
    enum: ScraperPriority
  })
  priority?: ScraperPriority;
}

/**
 * Job Status DTOs
 */
export class GetScrapeStatusDto {
  @ApiProperty({
    description: 'Job ID to check status for',
    example: 'scrape-job-12345-abcdef'
  })
  @IsString({ message: 'Job ID must be a string' })
  @IsNotEmpty({ message: 'Job ID is required' })
  @Matches(/^scrape-job-[a-zA-Z0-9-]+$/, { message: 'Invalid job ID format' })
  jobId: string;
}

export class ScrapeStatusResponseDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'scrape-job-12345-abcdef'
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status',
    enum: ScraperStatus,
    example: ScraperStatus.RUNNING
  })
  status: ScraperStatus;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 65
  })
  progress: number;

  @ApiProperty({
    description: 'Status message',
    example: 'Processing article 7 of 10'
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
    lastUpdate: string;
  };

  @ApiProperty({
    description: 'Processing statistics'
  })
  stats: {
    totalArticles: number;
    processedArticles: number;
    successfulArticles: number;
    failedArticles: number;
    averageProcessingTime: number;
  };

  @ApiPropertyOptional({
    description: 'Results preview if completed'
  })
  results?: {
    articleIds: string[];
    summaryCount: number;
    totalWords: number;
    categories: string[];
  };
}

/**
 * List Jobs DTOs
 */
export class ListScrapeJobsDto {
  @ApiPropertyOptional({
    description: 'Number of jobs to return',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Offset must be a number' })
  @Min(0, { message: 'Offset must be non-negative' })
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ScraperStatus
  })
  @IsOptional()
  @IsEnum(ScraperStatus, { message: 'Invalid status filter' })
  status?: ScraperStatus;

  @ApiPropertyOptional({
    description: 'Filter by source',
    enum: ScraperSource
  })
  @IsOptional()
  @IsEnum(ScraperSource, { message: 'Invalid source filter' })
  source?: ScraperSource;

  @ApiPropertyOptional({
    description: 'Filter jobs created after this date',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid ISO date string' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter jobs created before this date',
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid ISO date string' })
  dateTo?: string;
}

export class ScrapeJobSummaryDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'scrape-job-12345-abcdef'
  })
  id: string;

  @ApiProperty({
    description: 'Source that was scraped',
    enum: ScraperSource
  })
  source: ScraperSource;

  @ApiProperty({
    description: 'Current status',
    enum: ScraperStatus
  })
  status: ScraperStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Completion timestamp',
    example: '2024-01-15T10:35:00Z'
  })
  completedAt?: string;

  @ApiProperty({
    description: 'Number of articles processed'
  })
  articleCount: number;

  @ApiProperty({
    description: 'Processing duration in seconds'
  })
  duration?: number;

  @ApiProperty({
    description: 'Job priority',
    enum: ScraperPriority
  })
  priority: ScraperPriority;
}

export class ListScrapeJobsResponseDto {
  @ApiProperty({
    description: 'Array of job summaries',
    type: [ScrapeJobSummaryDto]
  })
  jobs: ScrapeJobSummaryDto[];

  @ApiProperty({
    description: 'Total count of jobs',
    example: 150
  })
  totalCount: number;

  @ApiProperty({
    description: 'Current page limit',
    example: 20
  })
  limit: number;

  @ApiProperty({
    description: 'Current page offset',
    example: 0
  })
  offset: number;

  @ApiProperty({
    description: 'Whether there are more jobs available',
    example: true
  })
  hasMore: boolean;
}

/**
 * Cancel Job DTOs
 */
export class CancelScrapeJobDto {
  @ApiProperty({
    description: 'Job ID to cancel',
    example: 'scrape-job-12345-abcdef'
  })
  @IsString({ message: 'Job ID must be a string' })
  @IsNotEmpty({ message: 'Job ID is required' })
  @Matches(/^scrape-job-[a-zA-Z0-9-]+$/, { message: 'Invalid job ID format' })
  jobId: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'User requested cancellation'
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @Length(0, 500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}

export class CancelScrapeJobResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Job cancelled successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Cancelled job ID',
    example: 'scrape-job-12345-abcdef'
  })
  jobId: string;

  @ApiProperty({
    description: 'Cancellation timestamp',
    example: '2024-01-15T10:32:00Z'
  })
  cancelledAt: string;
}

/**
 * Health Check DTOs
 */
export class ScraperHealthResponseDto {
  @ApiProperty({
    description: 'Whether the scraper service is healthy',
    example: true
  })
  healthy: boolean;

  @ApiProperty({
    description: 'Service version',
    example: '1.0.0'
  })
  version: string;

  @ApiProperty({
    description: 'Service uptime in seconds',
    example: 3600
  })
  uptime: number;

  @ApiProperty({
    description: 'Active jobs count'
  })
  activeJobs: number;

  @ApiProperty({
    description: 'Queue statistics'
  })
  queueStats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };

  @ApiProperty({
    description: 'Performance metrics'
  })
  performance: {
    averageJobTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  };

  @ApiProperty({
    description: 'External dependencies status'
  })
  dependencies: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: string;
  }>;
}
