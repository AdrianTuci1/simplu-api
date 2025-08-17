import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let configService: ConfigService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'database.type': 'citrus',
                'database.rds.host': 'localhost',
                'database.rds.port': 5432,
                'database.rds.username': 'postgres',
                'database.rds.password': 'password',
                'database.rds.database': 'test_db',
                'database.rds.ssl': false,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log database type initialization', () => {
    expect(loggerSpy).toHaveBeenCalledWith('Initializing database connections for type: citrus');
    expect(loggerSpy).toHaveBeenCalledWith('Citrus sharding enabled - connections will be initialized on-demand');
  });

  it('should log when closing connections', async () => {
    await service.closeConnections();
    expect(loggerSpy).toHaveBeenCalledWith('Closing database connections...');
    expect(loggerSpy).toHaveBeenCalledWith('All database connections closed successfully');
  });
});
