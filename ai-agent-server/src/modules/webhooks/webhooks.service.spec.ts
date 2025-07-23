import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { AgentService } from '../agent/agent.service';
import { SessionService } from '../session/session.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: AgentService,
          useValue: {
            processWebhookMessage: jest.fn().mockResolvedValue({
              success: true,
              shouldRespond: true,
              response: 'Test response'
            })
          }
        },
        {
          provide: SessionService,
          useValue: {
            saveMessage: jest.fn()
          }
        },
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessLocations: jest.fn().mockResolvedValue([
              { locationId: 'test-location', isActive: true }
            ])
          }
        },
        {
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: jest.fn().mockResolvedValue({ success: true }),
            sendSMS: jest.fn().mockResolvedValue({ success: true }),
            getMetaCredentials: jest.fn().mockResolvedValue({
              appSecret: 'test-secret'
            })
          }
        }
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process Meta webhook', async () => {
    const mockPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test-entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+40712345678',
              phone_number_id: 'test-phone-id'
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '+40787654321'
            }],
            messages: [{
              from: '+40787654321',
              id: 'test-message-id',
              timestamp: '1234567890',
              type: 'text',
              text: { body: 'Test message' }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    // Mock the validateMetaWebhookSignature method to return true
    jest.spyOn(service as any, 'validateMetaWebhookSignature').mockResolvedValue(true);

    const result = await service.processMetaWebhook(
      'test-business',
      mockPayload,
      'sha256=test-signature'
    );

    expect(result.status).toBe('ok');
    expect(result.processed).toBeGreaterThan(0);
  });

  it('should process Twilio webhook', async () => {
    const mockPayload = {
      MessageSid: 'test-message-sid',
      From: '+40787654321',
      To: '+40712345678',
      Body: 'Test SMS message',
      NumMedia: '0',
      AccountSid: 'test-account-sid',
      ApiVersion: '2010-04-01'
    };

    const result = await service.processTwilioWebhook('test-business', mockPayload);

    expect(result.status).toBe('ok');
    expect(result.processed).toBe(1);
  });
}); 