import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { ScheduledTasksJob } from './jobs/scheduled-tasks.job';
import { CleanupJob } from './jobs/cleanup.job';
import { SessionModule } from '../session/session.module';
import { AgentModule } from '../agent/agent.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SessionModule,
    AgentModule,
    BusinessInfoModule,
    ExternalApisModule,
    WebSocketModule,
  ],
  controllers: [CronController],
  providers: [CronService, ScheduledTasksJob, CleanupJob],
  exports: [CronService],
})
export class CronModule {} 