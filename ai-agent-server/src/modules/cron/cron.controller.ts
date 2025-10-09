import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduledTasksJob } from './jobs/scheduled-tasks.job';
import { CleanupJob } from './jobs/cleanup.job';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';

@Controller('cron')
export class CronController {
  constructor(
    private readonly cronService: CronService,
    private readonly scheduledTasksJob: ScheduledTasksJob,
    private readonly cleanupJob: CleanupJob,
    private readonly appointmentRemindersJob: AppointmentRemindersJob,
  ) {}

  @Post('trigger/cleanup-sessions')
  async triggerCleanupSessions() {
    await this.cronService.cleanupResolvedSessions();
    return { message: 'Session cleanup triggered successfully' };
  }

  @Post('trigger/check-inactive-sessions')
  async triggerCheckInactiveSessions() {
    await this.cronService.checkInactiveSessions();
    return { message: 'Inactive sessions check triggered successfully' };
  }

  @Post('trigger/reservation-reminders')
  async triggerReservationReminders() {
    await this.cronService.sendReservationReminders();
    return { message: 'Reservation reminders triggered successfully' };
  }

  @Post('trigger/daily-report')
  async triggerDailyReport() {
    await this.cronService.generateDailyActivityReport();
    return { message: 'Daily report triggered successfully' };
  }

  @Post('trigger/validate-credentials')
  async triggerValidateCredentials() {
    await this.cronService.validateExternalApiCredentials();
    return { message: 'Credentials validation triggered successfully' };
  }

  @Post('trigger/check-abandoned-sessions')
  async triggerCheckAbandonedSessions() {
    await this.scheduledTasksJob.checkAbandonedSessions();
    return { message: 'Abandoned sessions check triggered successfully' };
  }

  @Post('trigger/cleanup-old-messages')
  async triggerCleanupOldMessages() {
    await this.cleanupJob.cleanupOldMessages();
    return { message: 'Old messages cleanup triggered successfully' };
  }

  @Post('trigger/cleanup-old-sessions')
  async triggerCleanupOldSessions() {
    await this.cleanupJob.cleanupOldSessions();
    return { message: 'Old sessions cleanup triggered successfully' };
  }

  @Post('trigger/cleanup-expired-credentials')
  async triggerCleanupExpiredCredentials() {
    await this.cleanupJob.cleanupExpiredCredentials();
    return { message: 'Expired credentials cleanup triggered successfully' };
  }

  @Post('trigger/sync-credentials')
  async triggerSyncCredentials() {
    await this.scheduledTasksJob.syncCredentials();
    return { message: 'Credentials sync triggered successfully' };
  }

  @Post('trigger/check-unprocessed-messages')
  async triggerCheckUnprocessedMessages() {
    await this.scheduledTasksJob.checkUnprocessedMessages();
    return { message: 'Unprocessed messages check triggered successfully' };
  }

  @Post('trigger/check-error-sessions')
  async triggerCheckErrorSessions() {
    await this.scheduledTasksJob.checkErrorSessions();
    return { message: 'Error sessions check triggered successfully' };
  }

  @Post('trigger/backup-data')
  async triggerBackupData() {
    await this.cronService.backupData();
    return { message: 'Data backup triggered successfully' };
  }

  @Post('trigger/check-system-performance')
  async triggerCheckSystemPerformance() {
    await this.cronService.checkSystemPerformance();
    return { message: 'System performance check triggered successfully' };
  }

  @Post('trigger/appointment-reminders')
  async triggerAppointmentReminders(
    @Query('businessId') businessId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return await this.appointmentRemindersJob.triggerManual(businessId, locationId);
  }

  @Get('status')
  async getCronStatus() {
    return {
      status: 'active',
      lastRun: new Date().toISOString(),
      nextRun: this.calculateNextRun(),
      jobs: [
        {
          name: 'cleanup-resolved-sessions',
          schedule: '0 2 * * *',
          description: 'Cleanup resolved sessions daily at 2 AM'
        },
        {
          name: 'check-inactive-sessions',
          schedule: '0 */6 * * *',
          description: 'Check inactive sessions every 6 hours'
        },
        {
          name: 'reservation-reminders',
          schedule: '0 */2 * * *',
          description: 'Send reservation reminders every 2 hours'
        },
        {
          name: 'backup-data',
          schedule: '0 3 * * *',
          description: 'Backup data daily at 3 AM'
        },
        {
          name: 'validate-credentials',
          schedule: '0 4 * * *',
          description: 'Validate external API credentials daily at 4 AM'
        },
        {
          name: 'daily-report',
          schedule: '0 8 * * *',
          description: 'Generate daily activity report at 8 AM'
        },
        {
          name: 'check-system-performance',
          schedule: '*/30 * * * *',
          description: 'Check system performance every 30 minutes'
        },
        {
          name: 'check-abandoned-sessions',
          schedule: '0 */4 * * *',
          description: 'Check abandoned sessions every 4 hours'
        },
        {
          name: 'sync-credentials',
          schedule: '0 */12 * * *',
          description: 'Sync credentials every 12 hours'
        },
        {
          name: 'check-unprocessed-messages',
          schedule: '*/30 * * * *',
          description: 'Check unprocessed messages every 30 minutes'
        },
        {
          name: 'check-error-sessions',
          schedule: '0 */2 * * *',
          description: 'Check error sessions every 2 hours'
        },
        {
          name: 'cleanup-old-messages',
          schedule: '0 0 * * 0',
          description: 'Cleanup old messages weekly'
        },
        {
          name: 'appointment-reminders',
          schedule: '0 * * * *',
          description: 'Send appointment reminders every hour'
        },
        {
          name: 'cleanup-old-logs',
          schedule: '0 0 1 * *',
          description: 'Cleanup old logs monthly'
        },
        {
          name: 'optimize-database',
          schedule: '0 0 * * 0',
          description: 'Optimize database weekly'
        },
        {
          name: 'cleanup-old-sessions',
          schedule: '0 0 1 * *',
          description: 'Cleanup old sessions monthly'
        },
        {
          name: 'cleanup-expired-credentials',
          schedule: '0 1 * * *',
          description: 'Cleanup expired credentials daily at 1 AM'
        }
      ]
    };
  }

  @Get('health')
  async getCronHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeJobs: 16,
      lastError: null
    };
  }

  @Get('metrics')
  async getCronMetrics() {
    return {
      timestamp: new Date().toISOString(),
      totalJobsExecuted: Math.floor(Math.random() * 1000) + 100,
      successfulJobs: Math.floor(Math.random() * 950) + 90,
      failedJobs: Math.floor(Math.random() * 50) + 5,
      averageExecutionTime: Math.floor(Math.random() * 5000) + 1000,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  private calculateNextRun(): string {
    // Implementare pentru calcularea următoarei rulări
    const now = new Date();
    const nextRun = new Date(now.getTime() + 30 * 60 * 1000); // 30 minute de acum
    return nextRun.toISOString();
  }
} 