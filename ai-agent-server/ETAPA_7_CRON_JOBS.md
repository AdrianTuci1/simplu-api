# ETAPA 7: Cron Jobs Service

## Obiectiv
Implementarea sistemului de job-uri programate pentru automatizarea acțiunilor repetitive și mentenanța sistemului.

## Durată Estimată: 3-4 zile

### 7.1 Cron Jobs Service Principal
```typescript
// src/modules/cron/cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../session/session.service';
import { AgentService } from '../agent/agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly agentService: AgentService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly externalApisService: ExternalApisService,
    private readonly websocketGateway: WebSocketGateway
  ) {}

  // Cleanup sesiuni rezolvate (zilnic la 02:00)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupResolvedSessions() {
    this.logger.log('Starting cleanup of resolved sessions...');
    
    try {
      await this.sessionService.cleanupResolvedSessions();
      this.logger.log('Cleanup of resolved sessions completed');
    } catch (error) {
      this.logger.error('Error during session cleanup:', error);
    }
  }

  // Verificare sesiuni inactive (la fiecare 6 ore)
  @Cron('0 */6 * * *')
  async checkInactiveSessions() {
    this.logger.log('Checking for inactive sessions...');
    
    try {
      const inactiveSessions = await this.sessionService.getInactiveSessions();
      
      for (const session of inactiveSessions) {
        await this.handleInactiveSession(session);
      }
      
      this.logger.log(`Processed ${inactiveSessions.length} inactive sessions`);
    } catch (error) {
      this.logger.error('Error checking inactive sessions:', error);
    }
  }

  // Reminder-uri automate pentru rezervări (la fiecare 2 ore)
  @Cron('0 */2 * * *')
  async sendReservationReminders() {
    this.logger.log('Sending reservation reminders...');
    
    try {
      const upcomingReservations = await this.getUpcomingReservations();
      
      for (const reservation of upcomingReservations) {
        await this.sendReservationReminder(reservation);
      }
      
      this.logger.log(`Sent ${upcomingReservations.length} reservation reminders`);
    } catch (error) {
      this.logger.error('Error sending reservation reminders:', error);
    }
  }

  // Backup automat al datelor (zilnic la 03:00)
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async backupData() {
    this.logger.log('Starting data backup...');
    
    try {
      await this.performDataBackup();
      this.logger.log('Data backup completed successfully');
    } catch (error) {
      this.logger.error('Error during data backup:', error);
    }
  }

  // Verificare credențiale API externe (zilnic la 04:00)
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async validateExternalApiCredentials() {
    this.logger.log('Validating external API credentials...');
    
    try {
      const businesses = await this.getAllBusinesses();
      
      for (const business of businesses) {
        await this.validateBusinessCredentials(business.businessId);
      }
      
      this.logger.log('External API credentials validation completed');
    } catch (error) {
      this.logger.error('Error validating external API credentials:', error);
    }
  }

  // Raport de activitate zilnic (zilnic la 08:00)
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateDailyActivityReport() {
    this.logger.log('Generating daily activity report...');
    
    try {
      const report = await this.createDailyActivityReport();
      await this.sendDailyReport(report);
      this.logger.log('Daily activity report sent');
    } catch (error) {
      this.logger.error('Error generating daily activity report:', error);
    }
  }

  // Verificare performanță sistem (la fiecare 30 minute)
  @Cron('*/30 * * * *')
  async checkSystemPerformance() {
    this.logger.log('Checking system performance...');
    
    try {
      const metrics = await this.collectSystemMetrics();
      
      if (this.shouldAlert(metrics)) {
        await this.sendPerformanceAlert(metrics);
      }
      
      this.logger.log('System performance check completed');
    } catch (error) {
      this.logger.error('Error checking system performance:', error);
    }
  }

  // Metode private pentru implementarea job-urilor
  private async handleInactiveSession(session: any): Promise<void> {
    try {
      // Marcare sesiune ca închisă
      await this.sessionService.updateSession(session.sessionId, {
        status: 'closed',
        updatedAt: new Date().toISOString()
      });

      // Notificare coordonatori
      this.websocketGateway.broadcastToBusiness(session.businessId, 'session_closed', {
        sessionId: session.sessionId,
        userId: session.userId,
        reason: 'inactive',
        timestamp: new Date().toISOString()
      });

      this.logger.log(`Closed inactive session: ${session.sessionId}`);
    } catch (error) {
      this.logger.error(`Error handling inactive session ${session.sessionId}:`, error);
    }
  }

  private async getUpcomingReservations(): Promise<any[]> {
    // Implementare pentru obținerea rezervărilor care au nevoie de reminder
    // Aceasta ar trebui să interogheze API-ul principal
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Simulare date pentru testare
    return [
      {
        id: 'res-1',
        businessId: 'business-1',
        customerId: 'customer-1',
        customerPhone: '+40712345678',
        serviceName: 'Consultație dentală',
        appointmentTime: twoHoursFromNow.toISOString(),
        source: 'meta'
      }
    ];
  }

  private async sendReservationReminder(reservation: any): Promise<void> {
    try {
      const message = `Reminder: Aveți o programare pentru ${reservation.serviceName} în 2 ore. Vă așteptăm!`;
      
      if (reservation.source === 'meta') {
        await this.externalApisService.sendMetaMessage(
          reservation.customerPhone,
          message,
          reservation.businessId
        );
      } else if (reservation.source === 'twilio') {
        await this.externalApisService.sendSMS(
          reservation.customerPhone,
          message,
          reservation.businessId
        );
      }

      this.logger.log(`Sent reminder for reservation: ${reservation.id}`);
    } catch (error) {
      this.logger.error(`Error sending reminder for reservation ${reservation.id}:`, error);
    }
  }

  private async performDataBackup(): Promise<void> {
    // Implementare backup pentru sesiuni și mesaje
    const backupData = {
      timestamp: new Date().toISOString(),
      sessions: await this.sessionService.getAllSessions(),
      messages: await this.sessionService.getAllMessages()
    };

    // Salvare backup (implementare conform strategiei de backup)
    console.log('Backup data:', JSON.stringify(backupData, null, 2));
  }

  private async getAllBusinesses(): Promise<any[]> {
    // Implementare pentru obținerea tuturor business-urilor
    // Pentru moment, returnăm date simulate
    return [
      { businessId: 'business-1', businessType: 'dental' },
      { businessId: 'business-2', businessType: 'gym' },
      { businessId: 'business-3', businessType: 'hotel' }
    ];
  }

  private async validateBusinessCredentials(businessId: string): Promise<void> {
    try {
      // Validare credențiale Meta
      const metaCredentials = await this.externalApisService.getMetaCredentials(businessId);
      if (metaCredentials) {
        const metaTest = await this.externalApisService.sendMetaMessage(
          'test',
          'Credential validation test',
          businessId
        );
        
        if (!metaTest.success) {
          this.logger.warn(`Invalid Meta credentials for business: ${businessId}`);
        }
      }

      // Validare credențiale Twilio
      const twilioCredentials = await this.externalApisService.getTwilioCredentials(businessId);
      if (twilioCredentials) {
        const twilioTest = await this.externalApisService.sendSMS(
          '+40712345678',
          'Credential validation test',
          businessId
        );
        
        if (!twilioTest.success) {
          this.logger.warn(`Invalid Twilio credentials for business: ${businessId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error validating credentials for business ${businessId}:`, error);
    }
  }

  private async createDailyActivityReport(): Promise<any> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const report = {
      date: yesterday.toISOString().split('T')[0],
      totalSessions: await this.sessionService.getSessionsCount(yesterday),
      totalMessages: await this.sessionService.getMessagesCount(yesterday),
      resolvedSessions: await this.sessionService.getResolvedSessionsCount(yesterday),
      autonomousActions: await this.getAutonomousActionsCount(yesterday),
      businesses: await this.getBusinessesActivity(yesterday)
    };

    return report;
  }

  private async sendDailyReport(report: any): Promise<void> {
    // Implementare pentru trimiterea raportului către coordonatori
    const reportMessage = `
📊 Raport Activitate Zilnică - ${report.date}

📈 Statistici generale:
• Sesiuni totale: ${report.totalSessions}
• Mesaje procesate: ${report.totalMessages}
• Sesiuni rezolvate: ${report.resolvedSessions}
• Acțiuni autonome: ${report.autonomousActions}

🏢 Activitate per business:
${report.businesses.map(b => `• ${b.businessName}: ${b.sessions} sesiuni`).join('\n')}
    `;

    // Trimitere către toate business-urile
    for (const business of report.businesses) {
      this.websocketGateway.broadcastToBusiness(
        business.businessId,
        'daily_report',
        { report, message: reportMessage }
      );
    }
  }

  private async collectSystemMetrics(): Promise<any> {
    const metrics = {
      timestamp: new Date().toISOString(),
      activeSessions: await this.sessionService.getActiveSessionsCount(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage()
    };

    return metrics;
  }

  private shouldAlert(metrics: any): boolean {
    // Logică pentru determinarea când să se trimită alerte
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    const memoryThreshold = 500; // 500MB
    
    return memoryUsageMB > memoryThreshold;
  }

  private async sendPerformanceAlert(metrics: any): Promise<void> {
    const alertMessage = `
⚠️ Alertă Performanță Sistem

📊 Metrici:
• Memorie utilizată: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
• Uptime: ${(metrics.uptime / 3600).toFixed(2)} ore
• Sesiuni active: ${metrics.activeSessions}

🕐 Timestamp: ${metrics.timestamp}
    `;

    // Trimitere alertă către administratori
    console.log('Performance alert:', alertMessage);
  }

  private async getAutonomousActionsCount(date: Date): Promise<number> {
    // Implementare pentru numărarea acțiunilor autonome
    // Pentru moment, returnăm un număr simulat
    return Math.floor(Math.random() * 50) + 10;
  }

  private async getBusinessesActivity(date: Date): Promise<any[]> {
    // Implementare pentru obținerea activității per business
    // Pentru moment, returnăm date simulate
    return [
      { businessId: 'business-1', businessName: 'Dental Clinic', sessions: 15 },
      { businessId: 'business-2', businessName: 'Fitness Center', sessions: 8 },
      { businessId: 'business-3', businessName: 'Hotel Grand', sessions: 12 }
    ];
  }
}

// src/modules/cron/cron.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
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
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
```

### 7.2 Job-uri Programate Specifice
```typescript
// src/modules/cron/jobs/scheduled-tasks.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../../session/session.service';
import { ExternalApisService } from '../../external-apis/external-apis.service';

@Injectable()
export class ScheduledTasksJob {
  private readonly logger = new Logger(ScheduledTasksJob.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly externalApisService: ExternalApisService
  ) {}

  // Verificare sesiuni abandonate (la fiecare 4 ore)
  @Cron('0 */4 * * *')
  async checkAbandonedSessions() {
    this.logger.log('Checking for abandoned sessions...');
    
    try {
      const abandonedSessions = await this.sessionService.getAbandonedSessions();
      
      for (const session of abandonedSessions) {
        await this.handleAbandonedSession(session);
      }
      
      this.logger.log(`Processed ${abandonedSessions.length} abandoned sessions`);
    } catch (error) {
      this.logger.error('Error checking abandoned sessions:', error);
    }
  }

  // Sincronizare credențiale (la fiecare 12 ore)
  @Cron('0 */12 * * *')
  async syncCredentials() {
    this.logger.log('Syncing external API credentials...');
    
    try {
      // Implementare sincronizare credențiale
      this.logger.log('Credentials sync completed');
    } catch (error) {
      this.logger.error('Error syncing credentials:', error);
    }
  }

  // Verificare mesaje neprocesate (la fiecare 30 minute)
  @Cron('*/30 * * * *')
  async checkUnprocessedMessages() {
    this.logger.log('Checking for unprocessed messages...');
    
    try {
      const unprocessedMessages = await this.sessionService.getUnprocessedMessages();
      
      for (const message of unprocessedMessages) {
        await this.reprocessMessage(message);
      }
      
      this.logger.log(`Reprocessed ${unprocessedMessages.length} messages`);
    } catch (error) {
      this.logger.error('Error checking unprocessed messages:', error);
    }
  }

  private async handleAbandonedSession(session: any): Promise<void> {
    try {
      // Trimitere notificare către coordonatori
      // Implementare logică pentru sesiuni abandonate
      this.logger.log(`Handled abandoned session: ${session.sessionId}`);
    } catch (error) {
      this.logger.error(`Error handling abandoned session ${session.sessionId}:`, error);
    }
  }

  private async reprocessMessage(message: any): Promise<void> {
    try {
      // Reprocesare mesaj
      this.logger.log(`Reprocessing message: ${message.messageId}`);
    } catch (error) {
      this.logger.error(`Error reprocessing message ${message.messageId}:`, error);
    }
  }
}

// src/modules/cron/jobs/cleanup.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../../session/session.module';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(private readonly sessionService: SessionService) {}

  // Cleanup mesaje vechi (săptămânal)
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldMessages() {
    this.logger.log('Cleaning up old messages...');
    
    try {
      const deletedCount = await this.sessionService.deleteOldMessages();
      this.logger.log(`Deleted ${deletedCount} old messages`);
    } catch (error) {
      this.logger.error('Error cleaning up old messages:', error);
    }
  }

  // Cleanup log-uri vechi (lunar)
  @Cron('0 0 1 * *')
  async cleanupOldLogs() {
    this.logger.log('Cleaning up old logs...');
    
    try {
      // Implementare cleanup log-uri
      this.logger.log('Old logs cleanup completed');
    } catch (error) {
      this.logger.error('Error cleaning up old logs:', error);
    }
  }

  // Optimizare baza de date (săptămânal)
  @Cron(CronExpression.EVERY_WEEK)
  async optimizeDatabase() {
    this.logger.log('Optimizing database...');
    
    try {
      // Implementare optimizare baza de date
      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Error optimizing database:', error);
    }
  }
}
```

### 7.3 Controller pentru Gestionarea Job-urilor
```typescript
// src/modules/cron/cron.controller.ts
import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduledTasksJob } from './jobs/scheduled-tasks.job';
import { CleanupJob } from './jobs/cleanup.job';

@Controller('cron')
export class CronController {
  constructor(
    private readonly cronService: CronService,
    private readonly scheduledTasksJob: ScheduledTasksJob,
    private readonly cleanupJob: CleanupJob
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
          name: 'daily-report',
          schedule: '0 8 * * *',
          description: 'Generate daily activity report at 8 AM'
        }
      ]
    };
  }

  private calculateNextRun(): string {
    // Implementare pentru calcularea următoarei rulări
    const now = new Date();
    const nextRun = new Date(now.getTime() + 30 * 60 * 1000); // 30 minute de acum
    return nextRun.toISOString();
  }
}

// Actualizare cron.module.ts pentru a include controller și job-uri
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
```

### 7.4 Testare Cron Jobs
```typescript
// src/modules/cron/cron.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { SessionService } from '../session/session.service';
import { AgentService } from '../agent/agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

describe('CronService', () => {
  let service: CronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: SessionService,
          useValue: {
            cleanupResolvedSessions: jest.fn(),
            getInactiveSessions: jest.fn().mockResolvedValue([]),
            getSessionsCount: jest.fn().mockResolvedValue(10),
            getMessagesCount: jest.fn().mockResolvedValue(50),
            getResolvedSessionsCount: jest.fn().mockResolvedValue(8),
            getActiveSessionsCount: jest.fn().mockResolvedValue(5)
          }
        },
        {
          provide: AgentService,
          useValue: {
            processWebhookMessage: jest.fn()
          }
        },
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessInfo: jest.fn()
          }
        },
        {
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: jest.fn().mockResolvedValue({ success: true }),
            sendSMS: jest.fn().mockResolvedValue({ success: true }),
            getMetaCredentials: jest.fn().mockResolvedValue({}),
            getTwilioCredentials: jest.fn().mockResolvedValue({})
          }
        },
        {
          provide: WebSocketGateway,
          useValue: {
            broadcastToBusiness: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<CronService>(CronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should cleanup resolved sessions', async () => {
    const sessionService = module.get<SessionService>(SessionService);
    const cleanupSpy = jest.spyOn(sessionService, 'cleanupResolvedSessions');

    await service.cleanupResolvedSessions();

    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('should check inactive sessions', async () => {
    const sessionService = module.get<SessionService>(SessionService);
    const getInactiveSpy = jest.spyOn(sessionService, 'getInactiveSessions');

    await service.checkInactiveSessions();

    expect(getInactiveSpy).toHaveBeenCalled();
  });

  it('should send reservation reminders', async () => {
    const externalApisService = module.get<ExternalApisService>(ExternalApisService);
    const sendMetaSpy = jest.spyOn(externalApisService, 'sendMetaMessage');

    await service.sendReservationReminders();

    expect(sendMetaSpy).toHaveBeenCalled();
  });
});
```

### 7.5 Script pentru Testare Cron Jobs
```typescript
// src/modules/cron/scripts/test-cron.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testCronJobs() {
  console.log('Testing cron jobs...\n');

  const jobs = [
    { name: 'cleanup-sessions', endpoint: '/cron/trigger/cleanup-sessions' },
    { name: 'check-inactive-sessions', endpoint: '/cron/trigger/check-inactive-sessions' },
    { name: 'reservation-reminders', endpoint: '/cron/trigger/reservation-reminders' },
    { name: 'daily-report', endpoint: '/cron/trigger/daily-report' },
    { name: 'validate-credentials', endpoint: '/cron/trigger/validate-credentials' },
    { name: 'check-abandoned-sessions', endpoint: '/cron/trigger/check-abandoned-sessions' },
    { name: 'cleanup-old-messages', endpoint: '/cron/trigger/cleanup-old-messages' }
  ];

  for (const job of jobs) {
    try {
      console.log(`Testing ${job.name}...`);
      const response = await axios.post(`${BASE_URL}${job.endpoint}`);
      console.log(`✅ ${job.name}: ${response.data.message}`);
    } catch (error) {
      console.error(`❌ ${job.name}: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test status endpoint
  try {
    console.log('\nTesting cron status...');
    const statusResponse = await axios.get(`${BASE_URL}/cron/status`);
    console.log('✅ Cron status:', statusResponse.data);
  } catch (error) {
    console.error('❌ Cron status:', error.response?.data?.message || error.message);
  }
}

if (require.main === module) {
  testCronJobs()
    .then(() => {
      console.log('\nAll cron job tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cron job tests failed:', error);
      process.exit(1);
    });
}
```

### 7.6 Actualizare App Module
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { RagModule } from './modules/rag/rag.module';
import { AgentModule } from './modules/agent/agent.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ExternalApisModule } from './modules/external-apis/external-apis.module';
import { CredentialsModule } from './modules/external-apis/credentials/credentials.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CronModule } from './modules/cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    WebSocketModule,
    SessionModule,
    BusinessInfoModule,
    RagModule,
    AgentModule,
    ResourcesModule,
    ExternalApisModule,
    CredentialsModule,
    WebhooksModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Deliverables Etapa 7
- [ ] Cron Service implementat cu job-uri programate
- [ ] Job-uri pentru cleanup, verificări și rapoarte
- [ ] Controller pentru trigger manual al job-urilor
- [ ] Integrare cu toate serviciile existente
- [ ] Testare pentru job-uri programate
- [ ] Script pentru testare cron jobs
- [ ] Monitoring și logging pentru job-uri

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 8: Testing, Deployment și Documentație**. 