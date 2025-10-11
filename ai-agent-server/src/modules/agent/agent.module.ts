import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ToolsModule } from '../tools/tools.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    BusinessInfoModule,
    ToolsModule,
    SessionModule,
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {} 