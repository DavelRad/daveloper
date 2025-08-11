import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionService } from '../services/session.service';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
