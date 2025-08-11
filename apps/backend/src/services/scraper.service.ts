import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ScrapeRequest, ScrapeResponse } from '../types/messages';
import { v4 as uuidv4 } from 'uuid';

interface ScraperServiceClient {
  ScrapeArticles: (
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ) => void;
}

@Injectable()
export class ScraperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private client: ScraperServiceClient;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const grpcUrl = this.configService.get<string>('GRPC_SCRAPER_URL') || 'localhost:50051';
      
      // Load proto file
      const packageDefinition = protoLoader.loadSync(
        'src/proto/news_scraper.proto',
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        }
      );

      const scraperProto = grpc.loadPackageDefinition(packageDefinition) as any;

      // Create gRPC client
      this.client = new scraperProto.news_scraper.NewsScraperService(
        grpcUrl,
        grpc.credentials.createInsecure()
      );

      this.logger.log(`✅ Connected to Scraper Service at ${grpcUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize Scraper Service client:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        // Close the gRPC client connection
        (this.client as any).close?.();
        this.logger.log('🔌 Scraper Service client connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Scraper Service client:', error);
    }
  }

  async startScrapeJob(request: ScrapeRequest): Promise<ScrapeResponse> {
    return new Promise((resolve, reject) => {
      try {
        // Only send fields defined in the proto
        const grpcRequest = {
          max_articles: request.maxArticles || 10,
          query: request.source || '',
        };

        this.logger.log(`🚀 Starting scrape job for query: ${grpcRequest.query}`);

        this.client.ScrapeArticles(grpcRequest, (error, response) => {
          if (error) {
            this.logger.error('Scraper Service gRPC error:', error);
            reject(error);
          } else {
            this.logger.log(`📤 Scrape job queued for query: ${grpcRequest.query}`);
            resolve({
              jobId: uuidv4(), // Generate a job ID since proto doesn't return one
              status: 'queued',
              message: 'Scrape job has been queued successfully',
            });
          }
        });
      } catch (error) {
        this.logger.error('Error starting scrape job:', error);
        reject(error);
      }
    });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Only send fields defined in the proto
        const testRequest = {
          max_articles: 1,
          query: 'health_check',
        };

        this.client.ScrapeArticles(testRequest, (error, response) => {
          if (error) {
            this.logger.debug('Scraper Service health check response:', error.code);
            resolve(error.code !== grpc.status.UNAVAILABLE);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        this.logger.error('Scraper Service health check error:', error);
        resolve(false);
      }
    });
  }
} 