import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsGateway } from './gateways/logs.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { ScraperModule } from './modules/scraper.module';
import { AgentModule } from './modules/agent.module';
import { DocumentModule } from './modules/document.module';
import { SessionModule } from './modules/session.module';
import { RateLimitModule } from './modules/rate-limit.module';
import { RedisModule } from './modules/redis.module';
import { CacheModule } from './modules/cache.module';
import { HealthController } from './modules/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    RedisModule,
    CacheModule,
    SessionModule,
    RateLimitModule,
    ScraperModule,
    AgentModule,
    DocumentModule,
  ],
  controllers: [HealthController],
  providers: [LogsGateway, ChatGateway],
})
export class AppModule {} 