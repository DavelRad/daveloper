import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from './pipes/validation.pipe';
import { ValidationFilter } from './filters/validation.filter';
import { CacheInterceptor } from './interceptors/cache.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      cors: {
        origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://daveloper.dev'],
        credentials: true,
      },
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 3001;

    // Global prefix for REST API endpoints
    app.setGlobalPrefix('api');

    // Global validation pipe with security features
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      sanitize: true,
    }));

    // Global validation error filter
    app.useGlobalFilters(new ValidationFilter());

    // Global cache interceptor
    app.useGlobalInterceptors(app.get(CacheInterceptor));

    await app.listen(port);
    
    logger.log(`🚀 API Gateway started on port ${port}`);
    logger.log(`📡 WebSocket endpoints: /ws/logs, /ws/chat`);
    logger.log(`🔗 REST endpoints: /api/scrape, /api/health`);
    logger.log(`🗄️  Caching enabled with Redis`);
    logger.log(`🛡️  Security validation enabled`);
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 