import { Test, TestingModule } from '@nestjs/testing';
import { BusinessInfoService } from './business-info.service';

describe('BusinessInfoService', () => {
  let service: BusinessInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessInfoService],
    }).compile();

    service = module.get<BusinessInfoService>(BusinessInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return mock business info when DynamoDB is not available', async () => {
    const businessInfo = await service.getBusinessInfo('test-business-1');
    
    expect(businessInfo).toBeDefined();
    expect(businessInfo.businessId).toBe('test-business-1');
    expect(businessInfo.businessType).toBeDefined();
    expect(businessInfo.locations).toHaveLength(1);
  });

  it('should return location info', async () => {
    const locationInfo = await service.getLocationInfo('test-business-1', 'test-business-1-loc-1');
    
    expect(locationInfo).toBeDefined();
    expect(locationInfo.locationId).toBe('test-business-1-loc-1');
    expect(locationInfo.isActive).toBe(true);
  });

  it('should return business locations', async () => {
    const locations = await service.getBusinessLocations('test-business-1');
    
    expect(locations).toBeDefined();
    expect(locations).toHaveLength(1);
    expect(locations[0].name).toBe('Locația Principală');
  });

  it('should return business settings', async () => {
    const settings = await service.getBusinessSettings('test-business-1');
    
    expect(settings).toBeDefined();
    expect(settings.currency).toBe('RON');
    expect(settings.language).toBe('ro');
  });

  it('should return business permissions', async () => {
    const permissions = await service.getBusinessPermissions('test-business-1');
    
    expect(permissions).toBeDefined();
    expect(permissions).toContain('reservations:create');
    expect(permissions).toContain('customers:read');
  });

  it('should return business type', async () => {
    const businessType = await service.getBusinessType('test-business-1');
    
    expect(businessType).toBeDefined();
    expect(['dental', 'gym', 'hotel', 'general']).toContain(businessType);
  });

  it('should transform DynamoDB data format correctly', async () => {
    // Mock DynamoDB data in the actual format
    const mockDynamoData = {
      businessId: 'B0100001',
      companyName: 'S.C Premier Dent S.R.L',
      businessType: 'dental',
      locations: [
        {
          id: 'L0100001',
          name: 'Premier Central',
          active: true,
          address: 'Bucuresti',
          timezone: 'Europe/Bucharest'
        }
      ],
      settings: {
        currency: 'RON',
        language: 'ro'
      },
      createdAt: '2025-08-13T01:07:50.527Z',
      updatedAt: '2025-08-13T01:08:05.303Z'
    };

    // Mock the DynamoDB client to return our test data
    const mockDynamoClient = {
      send: jest.fn().mockResolvedValue({ Item: mockDynamoData })
    };

    // Use reflection to set the private dynamoClient property
    const dynamoClientProperty = Object.getOwnPropertyDescriptor(service, 'dynamoClient');
    if (dynamoClientProperty) {
      Object.defineProperty(service, 'dynamoClient', {
        value: mockDynamoClient,
        writable: true
      });
    }

    const businessInfo = await service.getBusinessInfo('B0100001');
    
    expect(businessInfo).toBeDefined();
    expect(businessInfo.businessId).toBe('B0100001');
    expect(businessInfo.businessName).toBe('S.C Premier Dent S.R.L');
    expect(businessInfo.businessType).toBe('dental');
    expect(businessInfo.locations).toHaveLength(1);
    expect(businessInfo.locations[0].locationId).toBe('L0100001');
    expect(businessInfo.locations[0].name).toBe('Premier Central');
    expect(businessInfo.locations[0].isActive).toBe(true);
    expect(businessInfo.locations[0].address).toBe('Bucuresti');
    expect(businessInfo.locations[0].timezone).toBe('Europe/Bucharest');
    expect(businessInfo.settings.currency).toBe('RON');
    expect(businessInfo.settings.language).toBe('ro');
    expect(businessInfo.permissions).toContain('appointments:manage');
    expect(businessInfo.permissions).toContain('patients:manage');
  });
}); 