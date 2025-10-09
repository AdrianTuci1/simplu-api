import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { ScheduledTasksJob } from './jobs/scheduled-tasks.job';
import { CleanupJob } from './jobs/cleanup.job';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';
import { SessionModule } from '../session/session.module';
import { AgentModule } from '../agent/agent.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SessionModule,
    forwardRef(() => AgentModule),
    BusinessInfoModule,
    ExternalApisModule,
    WebSocketModule,
  ],
  controllers: [CronController],
  providers: [CronService, ScheduledTasksJob, CleanupJob, AppointmentRemindersJob],
  exports: [CronService],
})
export class CronModule {} 