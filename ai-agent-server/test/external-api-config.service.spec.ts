import { Test, TestingModule } from '@nestjs/testing';
import { ExternalApiConfigService } from '../src/modules/external-apis/services/external-api-config.service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock DynamoDB client
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@/config/dynamodb.config', () => ({
  dynamoDBClient: {},
  tableNames: {
    externalApiConfig: 'external-api-config-test'
  }
}));

describe('ExternalApiConfigService', () => {
  let service: ExternalApiConfigService;
  let mockDynamoClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalApiConfigService],
    }).compile();

    service = module.get<ExternalApiConfigService>(ExternalApiConfigService);
    mockDynamoClient = service['dynamoClient'];
  });

  describe('getOrCreateConfig', () => {
    it('should return existing config when found', async () => {
      const existingConfig = {
        businessId: 'test-business',
        locationId: 'default',
        sms: { enabled: true, templates: [] },
        email: { enabled: false, templates: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        version: 1
      };

      mockDynamoClient.send = jest.fn().mockResolvedValue({
        Item: existingConfig
      });

      const result = await service.getOrCreateConfig('test-business');

      expect(result).toEqual(existingConfig);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it('should create and return default config when not found', async () => {
      // First call returns null (config not found)
      mockDynamoClient.send = jest.fn()
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      const result = await service.getOrCreateConfig('test-business');

      expect(result).toBeDefined();
      expect(result.businessId).toBe('test-business');
      expect(result.locationId).toBe('default');
      expect(result.sms).toBeDefined();
      expect(result.email).toBeDefined();
      expect(result.version).toBe(1);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should create config with custom locationId when not found', async () => {
      // First call returns null (config not found)
      mockDynamoClient.send = jest.fn()
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({});

      const result = await service.getOrCreateConfig('test-business', 'custom-location');

      expect(result).toBeDefined();
      expect(result.businessId).toBe('test-business');
      expect(result.locationId).toBe('custom-location');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateConfig', () => {
    it('should update existing config', async () => {
      const existingConfig = {
        businessId: 'test-business',
        locationId: 'default',
        sms: { enabled: false, templates: [] },
        email: { enabled: false, templates: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        version: 1
      };

      // Mock getOrCreateConfig to return existing config
      mockDynamoClient.send = jest.fn()
        .mockResolvedValueOnce({ Item: existingConfig })
        .mockResolvedValueOnce({});

      const updateDto = {
        sms: { enabled: true }
      };

      const result = await service.updateConfig('test-business', updateDto);

      expect(result.sms.enabled).toBe(true);
      expect(result.version).toBe(2);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should create config if not found and then update it', async () => {
      // First call returns null (config not found)
      // Second call creates the config
      // Third call updates the config
      mockDynamoClient.send = jest.fn()
        .mockResolvedValueOnce({ Item: null })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const updateDto = {
        sms: { enabled: true }
      };

      const result = await service.updateConfig('test-business', updateDto);

      expect(result.sms.enabled).toBe(true);
      expect(result.version).toBe(2);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3);
    });
  });
});