import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { SimplifiedRagService } from './rag/simplified-rag.service';
import { ResourceRagService } from './rag/resource-rag.service';

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
          provide: SimplifiedRagService,
          useValue: {
            getRagForRoleAndBusiness: jest.fn().mockResolvedValue({
              instructions: ['Test instruction'],
              context: { businessType: 'dental', role: 'operator' },
              resources: [],
              response: 'Test response'
            })
          }
        },
        {
          provide: ResourceRagService,
          useValue: {
            getResourceRag: jest.fn().mockResolvedValue({
              resourceKey: 'dental.appointment',
              instructions: ['Test resource instruction'],
              data: { availableSlots: [] },
              actions: [],
              response: 'Test resource response'
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

  it('should process webhook message with RAG', async () => {
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

  it('should detect resource requests correctly', async () => {
    const detectResourceRequest = (service as any).detectResourceRequest;
    
    const appointmentRequest = detectResourceRequest('Vreau să văd programările', 'dental');
    expect(appointmentRequest).toBe('appointment');
    
    const patientRequest = detectResourceRequest('Vreau să văd datele pacientului', 'dental');
    expect(patientRequest).toBe('patient');
    
    const noRequest = detectResourceRequest('Salut!', 'dental');
    expect(noRequest).toBeNull();
  });
}); 