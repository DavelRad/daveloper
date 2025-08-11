import { Module, Global } from '@nestjs/common';
import { CacheService } from '../services/cache.service';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { RedisModule } from './redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    CacheInterceptor,
  ],
  exports: [
    CacheService,
    CacheInterceptor,
  ],
})
export class CacheModule {}
