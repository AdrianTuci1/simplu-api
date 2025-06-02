import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { AgentModule } from '../agent/agent.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [AgentModule, PolicyModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {} 