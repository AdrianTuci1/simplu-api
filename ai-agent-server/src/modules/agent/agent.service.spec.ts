import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ToolsService } from '../tools/tools.service';

describe('AgentService - Bedrock Integration', () => {
  let service: AgentService;
  let toolsService: ToolsService;

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
              businessName: 'Test Dental Clinic',
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
          }
        },
        {
          provide: ToolsService,
          useValue: {
            processMessage: jest.fn().mockResolvedValue({
              success: true,
              output: {
                message: 'Bună ziua! Cu ce vă pot ajuta?',
                actions: [
                  {
                    type: 'view_resources',
                    status: 'pending',
                    details: { resourceType: 'patients' }
                  }
                ]
              },
              toolsUsed: ['query_app_server'],
              sessionState: {},
              trace: []
            }),
          }
        }
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    toolsService = module.get<ToolsService>(ToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage (Operator)', () => {
    it('should process operator message through Bedrock', async () => {
      const messageData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'operator-1',
        message: 'Vreau să văd lista de pacienți',
        sessionId: 'session-123'
      };

      const response = await service.processMessage(messageData);
      
      expect(response).toBeDefined();
      expect(response.responseId).toBeDefined();
      expect(response.message).toBe('Bună ziua! Cu ce vă pot ajuta?');
      expect(response.sessionId).toBe('session-123');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.toolsUsed).toContain('query_app_server');
      expect(response.metadata.executionTime).toBeDefined();
      
      expect(toolsService.processMessage).toHaveBeenCalledWith(
        'Vreau să văd lista de pacienți',
        expect.objectContaining({
          businessId: 'test-business',
          userId: 'operator-1',
          role: 'operator',
          businessType: 'dental',
          source: 'websocket'
        }),
        'session-123'
      );
    });

    it('should handle Bedrock errors gracefully', async () => {
      jest.spyOn(toolsService, 'processMessage').mockResolvedValue({
        success: false,
        output: { message: '' },
        error: 'Bedrock timeout'
      });

      const messageData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'operator-1',
        message: 'Test message',
        sessionId: 'session-456'
      };

      const response = await service.processMessage(messageData);
      
      expect(response).toBeDefined();
      expect(response.message).toContain('problemă tehnică');
    });
  });

  describe('processWebhookMessage (Customer)', () => {
    it('should process customer webhook message through Bedrock', async () => {
      const webhookData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'customer-1',
        message: 'Aș vrea să fac o programare',
        source: 'meta' as const,
        sessionId: 'webhook-session-789'
      };

      const result = await service.processWebhookMessage(webhookData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowResults).toBeDefined();
      expect(result.workflowResults.length).toBeGreaterThan(0);
      expect(result.shouldRespond).toBe(true);
      expect(result.response).toBe('Bună ziua! Cu ce vă pot ajuta?');
      
      expect(toolsService.processMessage).toHaveBeenCalledWith(
        'Aș vrea să fac o programare',
        expect.objectContaining({
          businessId: 'test-business',
          userId: 'customer-1',
          role: 'customer',
          businessType: 'dental',
          source: 'webhook'
        }),
        'webhook-session-789'
      );
    });

    it('should handle customer errors gracefully', async () => {
      jest.spyOn(toolsService, 'processMessage').mockResolvedValue({
        success: false,
        output: { message: '' },
        error: 'Network error'
      });

      const webhookData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'customer-1',
        message: 'Test message',
        source: 'twilio' as const
      };

      const result = await service.processWebhookMessage(webhookData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.response).toContain('problemă tehnică');
    });
  });

  describe('processWebhookThroughPipeline', () => {
    it('should convert autonomous result to AgentResponse', async () => {
      const webhookData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'customer-1',
        message: 'Test',
        source: 'email' as const,
        sessionId: 'pipeline-session'
      };

      const response = await service.processWebhookThroughPipeline(webhookData);
      
      expect(response).toBeDefined();
      expect(response.responseId).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.sessionId).toBe('pipeline-session');
    });
  });

  describe('Session ID generation', () => {
    it('should generate session ID when not provided', async () => {
      const messageData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'operator-1',
        message: 'Test without session'
      };

      const response = await service.processMessage(messageData);
      
      expect(response.sessionId).toBeDefined();
      expect(response.sessionId).toContain('test-business');
    });
  });

  describe('Business Type detection', () => {
    it('should use business type from BusinessInfoService', async () => {
      const messageData = {
        businessId: 'gym-business',
        locationId: 'gym-location',
        userId: 'operator-1',
        message: 'Show members'
      };

      await service.processMessage(messageData);
      
      expect(toolsService.processMessage).toHaveBeenCalledWith(
        'Show members',
        expect.objectContaining({
          businessType: 'dental' // from mock
        }),
        expect.any(String)
      );
    });
  });
});
