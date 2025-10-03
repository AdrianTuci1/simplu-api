import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { SimplifiedRagService } from './rag/simplified-rag.service';
import { ResourceRagService } from './rag/resource-rag.service';
import { BusinessInfoModule } from '../business-info/business-info.module';

@Module({
  imports: [
    BusinessInfoModule,
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    SimplifiedRagService,
    ResourceRagService,
  ],
  exports: [AgentService],
})
export class AgentModule {} 