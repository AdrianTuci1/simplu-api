import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentConfigService } from './agent.config';

@Module({
  imports: [ConfigModule],
  providers: [AgentConfigService],
  exports: [AgentConfigService],
})
export class AgentConfigModule {} 