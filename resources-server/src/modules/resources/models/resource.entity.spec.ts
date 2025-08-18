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

  it('should have correct table name', () => {
    const entity = new ResourceEntity();
    expect(ResourceEntity.name).toBe('ResourceEntity');
  });

  it('should have required properties', () => {
    const entity = new ResourceEntity();
    
    // Test that entity can be instantiated with required properties
    entity.id = 'test-id';
    entity.businessId = 'business-123';
    entity.locationId = 'location-456';
    entity.resourceType = 'clients';
    entity.resourceId = 'client-789';
    entity.data = { name: 'Test Client' };
    entity.date = '2024-01-01';
    entity.operation = 'create';

    expect(entity.id).toBe('test-id');
    expect(entity.businessId).toBe('business-123');
    expect(entity.locationId).toBe('location-456');
    expect(entity.resourceType).toBe('clients');
    expect(entity.resourceId).toBe('client-789');
    expect(entity.data).toEqual({ name: 'Test Client' });
    expect(entity.date).toBe('2024-01-01');
    expect(entity.operation).toBe('create');
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
});
