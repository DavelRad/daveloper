import { Module } from '@nestjs/common';
import { AgentService } from '../services/agent.service';
import { AgentController } from './agent.controller';

@Module({
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {} 