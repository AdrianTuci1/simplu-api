import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { PolicyModule } from '../policy/policy.module';
import { AgentConfigModule } from './config/agent.config.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ConfigModule,
    PolicyModule,
    AgentConfigModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {} 