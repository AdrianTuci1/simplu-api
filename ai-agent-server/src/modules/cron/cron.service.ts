import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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
    @Inject(forwardRef(() => AgentService))
    private readonly businessInfoService: BusinessInfoService,
    private readonly externalApisService: ExternalApisService,
    @Inject(forwardRef(() => WebSocketGateway))
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
      const inactiveSessions = await this.getInactiveSessions();
      
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
  private async getInactiveSessions(): Promise<any[]> {
    // Implementare pentru obținerea sesiunilor inactive (mai mult de 24 ore fără activitate)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Pentru moment, returnăm un array gol - implementarea completă va fi adăugată în SessionService
    return [];
  }

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
      sessions: await this.getAllSessions(),
      messages: await this.getAllMessages()
    };

    // Salvare backup (implementare conform strategiei de backup)
    this.logger.log('Backup data prepared:', JSON.stringify(backupData, null, 2));
  }

  private async getAllSessions(): Promise<any[]> {
    // Implementare pentru obținerea tuturor sesiunilor
    // Pentru moment, returnăm un array gol
    return [];
  }

  private async getAllMessages(): Promise<any[]> {
    // Implementare pentru obținerea tuturor mesajelor
    // Pentru moment, returnăm un array gol
    return [];
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


    } catch (error) {
      this.logger.error(`Error validating credentials for business ${businessId}:`, error);
    }
  }

  private async createDailyActivityReport(): Promise<any> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const report = {
      date: yesterday.toISOString().split('T')[0],
      totalSessions: await this.getSessionsCount(yesterday),
      totalMessages: await this.getMessagesCount(yesterday),
      resolvedSessions: await this.getResolvedSessionsCount(yesterday),
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
      activeSessions: await this.getActiveSessionsCount(),
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
    this.logger.warn('Performance alert:', alertMessage);
  }

  private async getSessionsCount(date: Date): Promise<number> {
    // Implementare pentru numărarea sesiunilor
    // Pentru moment, returnăm un număr simulat
    return Math.floor(Math.random() * 100) + 20;
  }

  private async getMessagesCount(date: Date): Promise<number> {
    // Implementare pentru numărarea mesajelor
    // Pentru moment, returnăm un număr simulat
    return Math.floor(Math.random() * 500) + 100;
  }

  private async getResolvedSessionsCount(date: Date): Promise<number> {
    // Implementare pentru numărarea sesiunilor rezolvate
    // Pentru moment, returnăm un număr simulat
    return Math.floor(Math.random() * 50) + 10;
  }

  private async getActiveSessionsCount(): Promise<number> {
    // Implementare pentru numărarea sesiunilor active
    // Pentru moment, returnăm un număr simulat
    return Math.floor(Math.random() * 20) + 5;
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