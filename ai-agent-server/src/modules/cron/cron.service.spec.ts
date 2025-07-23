import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { SessionService } from '../session/session.service';
import { AgentService } from '../agent/agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

describe('CronService', () => {
  let service: CronService;
  let testingModule: TestingModule;
  let sessionService: SessionService;
  let externalApisService: ExternalApisService;
  let websocketGateway: WebSocketGateway;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
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
            getActiveSessionsCount: jest.fn().mockResolvedValue(5),
            updateSession: jest.fn(),
            getAllSessions: jest.fn().mockResolvedValue([]),
            getAllMessages: jest.fn().mockResolvedValue([])
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

    service = testingModule.get<CronService>(CronService);
    sessionService = testingModule.get<SessionService>(SessionService);
    externalApisService = testingModule.get<ExternalApisService>(ExternalApisService);
    websocketGateway = testingModule.get<WebSocketGateway>(WebSocketGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupResolvedSessions', () => {
    it('should cleanup resolved sessions', async () => {
      const cleanupSpy = jest.spyOn(sessionService, 'cleanupResolvedSessions');

      await service.cleanupResolvedSessions();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle errors during cleanup', async () => {
      jest.spyOn(sessionService, 'cleanupResolvedSessions').mockRejectedValue(new Error('Cleanup failed'));

      await expect(service.cleanupResolvedSessions()).resolves.not.toThrow();
    });
  });

  describe('checkInactiveSessions', () => {
    it('should check inactive sessions', async () => {
      await expect(service.checkInactiveSessions()).resolves.not.toThrow();
    });

    it('should handle errors during inactive sessions check', async () => {
      // Mock private method to throw error
      jest.spyOn(service as any, 'getInactiveSessions').mockRejectedValue(new Error('Check failed'));

      await expect(service.checkInactiveSessions()).resolves.not.toThrow();
    });
  });

  describe('sendReservationReminders', () => {
    it('should send reservation reminders', async () => {
      const sendMetaSpy = jest.spyOn(externalApisService, 'sendMetaMessage');

      await service.sendReservationReminders();

      expect(sendMetaSpy).toHaveBeenCalled();
    });

    it('should handle errors during reminder sending', async () => {
      jest.spyOn(externalApisService, 'sendMetaMessage').mockRejectedValue(new Error('Send failed'));

      await expect(service.sendReservationReminders()).resolves.not.toThrow();
    });
  });

  describe('backupData', () => {
    it('should perform data backup', async () => {
      await expect(service.backupData()).resolves.not.toThrow();
    });

    it('should handle errors during backup', async () => {
      // Mock private method to throw error
      jest.spyOn(service as any, 'performDataBackup').mockRejectedValue(new Error('Backup failed'));

      await expect(service.backupData()).resolves.not.toThrow();
    });
  });

  describe('validateExternalApiCredentials', () => {
    it('should validate external API credentials', async () => {
      const getMetaSpy = jest.spyOn(externalApisService, 'getMetaCredentials');

      await service.validateExternalApiCredentials();

      expect(getMetaSpy).toHaveBeenCalled();
    });

    it('should handle errors during credentials validation', async () => {
      jest.spyOn(externalApisService, 'getMetaCredentials').mockRejectedValue(new Error('Validation failed'));

      await expect(service.validateExternalApiCredentials()).resolves.not.toThrow();
    });
  });

  describe('generateDailyActivityReport', () => {
    it('should generate daily activity report', async () => {
      const broadcastSpy = jest.spyOn(websocketGateway, 'broadcastToBusiness');

      await service.generateDailyActivityReport();

      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('should handle errors during report generation', async () => {
      // Mock private method to throw error
      jest.spyOn(service as any, 'createDailyActivityReport').mockRejectedValue(new Error('Report failed'));

      await expect(service.generateDailyActivityReport()).resolves.not.toThrow();
    });
  });

  describe('checkSystemPerformance', () => {
    it('should check system performance', async () => {
      await expect(service.checkSystemPerformance()).resolves.not.toThrow();
    });

    it('should handle errors during performance check', async () => {
      // Mock private method to throw error
      jest.spyOn(service as any, 'collectSystemMetrics').mockRejectedValue(new Error('Metrics failed'));

      await expect(service.checkSystemPerformance()).resolves.not.toThrow();
    });
  });
}); 