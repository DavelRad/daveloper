import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
  ],
  providers: [RateLimitService, RateLimitMiddleware],
  exports: [RateLimitService],
})
export class RateLimitModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting middleware to all routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
