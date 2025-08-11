import { Module } from '@nestjs/common';
import { DocumentService } from '../services/document.service';
import { DocumentController } from './document.controller';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
