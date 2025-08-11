import { Module } from '@nestjs/common';
import { ScraperService } from '../services/scraper.service';
import { ScraperController } from './scraper.controller';
import { RedisModule } from './redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {} 