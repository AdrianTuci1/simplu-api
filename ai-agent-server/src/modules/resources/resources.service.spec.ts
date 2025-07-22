import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ResourcesService } from './resources.service';
import { of } from 'rxjs';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_SERVER_URL') return 'https://api.example.com';
              if (key === 'API_SERVER_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create reservation successfully', async () => {
    const mockResponse = { data: { id: 'res-123' }, status: 201 };
    jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as any));

    const result = await service.createReservation(
      'business-1',
      'location-1',
      { customerId: 'cust-1', serviceId: 'serv-1', date: '2024-01-15' }
    );

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('res-123');
  });

  it('should handle API errors gracefully', async () => {
    const mockError = {
      response: {
        status: 400,
        data: { message: 'Invalid data' }
      }
    };
    jest.spyOn(httpService, 'post').mockImplementation(() => {
      throw mockError;
    });

    const result = await service.createReservation(
      'business-1',
      'location-1',
      { invalid: 'data' }
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('should get reservations with filters', async () => {
    const mockResponse = { data: [{ id: 'res-1' }, { id: 'res-2' }], status: 200 };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse as any));

    const result = await service.getReservations(
      'business-1',
      'location-1',
      { date: '2024-01-15' }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should get customer by ID', async () => {
    const mockResponse = { data: { id: 'cust-1', name: 'John Doe' }, status: 200 };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse as any));

    const result = await service.getCustomer(
      'business-1',
      'location-1',
      'cust-1'
    );

    expect(result.success).toBe(true);
    expect(result.data.name).toBe('John Doe');
  });

  it('should check availability', async () => {
    const mockResponse = { data: { available: true, slots: ['09:00', '10:00'] }, status: 200 };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse as any));

    const result = await service.checkAvailability(
      'business-1',
      'location-1',
      { date: '2024-01-15', serviceId: 'serv-1' }
    );

    expect(result.success).toBe(true);
    expect(result.data.available).toBe(true);
  });
}); 