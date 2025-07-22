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
}); 