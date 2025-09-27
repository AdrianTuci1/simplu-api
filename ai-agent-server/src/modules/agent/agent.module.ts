import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { OperatorAgentModule } from './operator/operator-agent.module';
import { CustomerAgentModule } from './customer/customer-agent.module';

@Module({
  imports: [
    OperatorAgentModule,
    CustomerAgentModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {} 