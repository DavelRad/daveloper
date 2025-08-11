import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ScraperService } from '../services/scraper.service';
import { RedisService } from '../services/redis.service';
import { ScrapeRequest, ScrapeResponse } from '../types/messages';

@Controller('scrape')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly redisService: RedisService,
  ) {}

  @Post()
  async startScrape(@Body() request: ScrapeRequest): Promise<ScrapeResponse> {
    try {
      this.logger.log(`🚀 Received scrape request for source: ${request.source}`);
      
      // Validate request
      if (!request.source || request.source.trim() === '') {
        throw new HttpException(
          { error: 'Source is required', code: 'INVALID_SOURCE' },
          HttpStatus.BAD_REQUEST
        );
      }

      // Start the scrape job via gRPC
      const response = await this.scraperService.startScrapeJob(request);
      
      // Log the job start
      await this.redisService.publishLog(
        response.jobId,
        `Scrape job started for source: ${request.source}`,
        'info'
      );

      this.logger.log(`✅ Scrape job queued: ${response.jobId}`);
      return response;
      
    } catch (error) {
      this.logger.error('Error starting scrape job:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        { 
          error: 'Failed to start scrape job', 
          code: 'SCRAPER_ERROR',
          message: error.message 
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
} 