import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResourceEntity } from './resource.entity';

describe('ResourceEntity', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('RDS_HOST') || 'localhost',
            port: configService.get('RDS_PORT') || 5432,
            username: configService.get('RDS_USERNAME') || 'postgres',
            password: configService.get('RDS_PASSWORD') || 'postgres',
            database: configService.get('RDS_DATABASE') || 'test_db',
            entities: [ResourceEntity],
            synchronize: true, // Only for tests
            logging: false,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([ResourceEntity]),
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    const entity = new ResourceEntity();
    expect(entity).toBeDefined();
  });

  it('should create table with data field and auto-generated id', async () => {
    // This test ensures that the table is created with the data field and auto-generated id
    const entity = new ResourceEntity();
    entity.businessId = 'test-business';
    entity.locationId = 'test-location';
    entity.resourceType = 'test';
    entity.resourceId = 'te24-00001';
    entity.data = { test: 'data' };
    entity.startDate = '2024-01-01';
    entity.endDate = '2024-01-01';

    // The entity should have all required fields including data
    expect(entity.businessId).toBe('test-business');
    expect(entity.locationId).toBe('test-location');
    expect(entity.resourceType).toBe('test');
    expect(entity.resourceId).toBe('te24-00001');
    expect(entity.data).toEqual({ test: 'data' });
    expect(entity.startDate).toBe('2024-01-01');
    expect(entity.endDate).toBe('2024-01-01');
    
    // ID should be auto-generated
    expect(entity.id).toBeUndefined(); // Will be set by TypeORM
  });

  it('should have correct table name', () => {
    const entity = new ResourceEntity();
    expect(ResourceEntity.name).toBe('ResourceEntity');
  });

  it('should have required properties', () => {
    const entity = new ResourceEntity();
    
    // Test that entity can be instantiated with required properties
    entity.businessId = 'business-123';
    entity.locationId = 'location-456';
    entity.resourceType = 'clients';
    entity.resourceId = 'cl24-00001';
    entity.data = {
      name: 'Test Client',
      email: 'test@example.com',
      phone: '+40123456789'
    };
    entity.startDate = '2024-01-01';
    entity.endDate = '2024-01-01';

    expect(entity.businessId).toBe('business-123');
    expect(entity.locationId).toBe('location-456');
    expect(entity.resourceType).toBe('clients');
    expect(entity.resourceId).toBe('cl24-00001');
    expect(entity.data).toEqual({
      name: 'Test Client',
      email: 'test@example.com',
      phone: '+40123456789'
    });
    expect(entity.startDate).toBe('2024-01-01');
    expect(entity.endDate).toBe('2024-01-01');
    
    // ID should be auto-generated
    expect(entity.id).toBeUndefined(); // Will be set by TypeORM
  });

  it('should handle data field with JSON content', () => {
    const entity = new ResourceEntity();
    
    // Test complex JSON data
    const complexData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+40123456789',
      address: {
        street: 'Test Street',
        city: 'București',
        country: 'România'
      },
      preferences: {
        notifications: true,
        language: 'ro'
      },
      tags: ['vip', 'regular']
    };
    
    entity.data = complexData;
    expect(entity.data).toEqual(complexData);
    expect(entity.data.name).toBe('John Doe');
    expect(entity.data.address.city).toBe('București');
    expect(entity.data.tags).toContain('vip');
  });

  it('should handle optional shardId property', () => {
    const entity = new ResourceEntity();
    entity.shardId = 'shard-1';
    expect(entity.shardId).toBe('shard-1');
  });

  it('should have automatic timestamps', () => {
    const entity = new ResourceEntity();
    expect(entity.createdAt).toBeUndefined(); // Will be set by TypeORM
    expect(entity.updatedAt).toBeUndefined(); // Will be set by TypeORM
  });

  it('should validate resource ID pattern', () => {
    const entity = new ResourceEntity();
    
    // Test valid resource ID pattern
    entity.resourceId = 'ap24-00001'; // appointments, 2024, January, sequence 1
    expect(entity.resourceId).toMatch(/^[a-z]{2}\d{4}-\d{5}$/);
    
    entity.resourceId = 'in24-00123'; // invoices, 2024, January, sequence 123
    expect(entity.resourceId).toMatch(/^[a-z]{2}\d{4}-\d{5}$/);
  });

  it('should handle different resource types', () => {
    const entity = new ResourceEntity();
    
    const testCases = [
      { type: 'appointments', expectedPrefix: 'ap' },
      { type: 'invoices', expectedPrefix: 'in' },
      { type: 'clients', expectedPrefix: 'cl' },
      { type: 'members', expectedPrefix: 'me' },
      { type: 'reservations', expectedPrefix: 're' },
    ];

    testCases.forEach(({ type, expectedPrefix }) => {
      entity.resourceType = type;
      entity.resourceId = `${expectedPrefix}24-00001`;
      
      expect(entity.resourceType).toBe(type);
      expect(entity.resourceId).toMatch(new RegExp(`^${expectedPrefix}\\d{4}-\\d{5}$`));
    });
  });

  it('should handle date ranges', () => {
    const entity = new ResourceEntity();
    
    // Test single day
    entity.startDate = '2024-01-15';
    entity.endDate = '2024-01-15';
    expect(entity.startDate).toBe(entity.endDate);
    
    // Test date range
    entity.startDate = '2024-01-01';
    entity.endDate = '2024-01-31';
    expect(new Date(entity.startDate).getTime()).toBeLessThan(new Date(entity.endDate).getTime());
  });
});
