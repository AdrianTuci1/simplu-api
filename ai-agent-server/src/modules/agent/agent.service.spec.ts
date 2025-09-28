import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { RagService } from '../rag/rag.service';
import { SessionService } from '../session/session.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { ExternalApisService } from '../external-apis/external-apis.service';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessInfo: jest.fn().mockResolvedValue({
              businessId: 'test-business',
              businessType: 'dental',
              businessName: 'Test Dental',
              locations: [
                {
                  locationId: 'test-location',
                  name: 'Test Location',
                  address: 'Test Address',
                  timezone: 'Europe/Bucharest',
                  isActive: true
                }
              ],
              settings: {
                currency: 'RON',
                language: 'ro'
              },
              permissions: ['reservations:create'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }),
            getLocationInfo: jest.fn().mockResolvedValue({
              locationId: 'test-location',
              name: 'Test Location',
              address: 'Test Address',
              timezone: 'Europe/Bucharest',
              isActive: true
            })
          }
        },
        {
          provide: RagService,
          useValue: {
            getInstructionsForRequest: jest.fn().mockResolvedValue([
              {
                instruction: 'Test instruction',
                workflow: [
                  {
                    step: 1,
                    action: 'extract_reservation_details',
                    validation: 'has_date_and_service'
                  }
                ],
                successCriteria: ['reservation_created'],
                notificationTemplate: 'Test notification for {utilizatorul}'
              }
            ])
          }
        },
        {
          provide: SessionService,
          useValue: {
            markConversationResolved: jest.fn()
          }
        },
        {
          provide: WebSocketGateway,
          useValue: {
            broadcastToBusiness: jest.fn()
          }
        },
        {
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: jest.fn().mockResolvedValue({
              success: true,
              messageId: 'test-message-id'
            }),
            sendSMS: jest.fn().mockResolvedValue({
              success: true,
              messageId: 'test-sms-id'
            })
          }
        }
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process message and return response', async () => {
    const messageData = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Vreau să fac o rezervare'
    };

    const response = await service.processMessage(messageData);
    
    expect(response).toBeDefined();
    expect(response.responseId).toBeDefined();
    expect(response.message).toBeDefined();
    expect(response.sessionId).toBeDefined();
  });

  it('should process webhook message autonomously', async () => {
    const webhookData = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Vreau să fac o rezervare pentru mâine',
      source: 'meta' as const,
      sessionId: 'test-session'
    };

    const result = await service.processWebhookMessage(webhookData);
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.workflowResults).toBeDefined();
    expect(result.notification).toBeDefined();
  });

  it('should analyze intent correctly', async () => {
    const intent = await (service as any).analyzeIntent('Vreau să fac o rezervare', 'dental');
    
    expect(intent).toBeDefined();
    expect(intent.action).toBeDefined();
    expect(intent.confidence).toBeGreaterThan(0);
  });

  it('should handle autonomous processing', async () => {
    const webhookData = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Vreau să fac o rezervare pentru mâine',
      source: 'meta' as const
    };

    const result = await (service as any).processAutonomously(webhookData);
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.workflowResults).toBeDefined();
  });

  it('should escalate to coordinator when needed', async () => {
    const webhookData = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Am o problemă complexă care necesită atenție specială',
      source: 'meta' as const
    };

    const intent = {
      action: 'servicii',
      category: 'customer_service',
      confidence: 0.3,
      canHandleAutonomously: false,
      requiresHumanApproval: true
    };

    const result = await (service as any).escalateToCoordinator(webhookData, intent);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.notification).toContain('escaladată');
  });
}); 