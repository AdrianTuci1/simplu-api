import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ResourceOperation {
  type: 'create' | 'read' | 'update' | 'delete';
  resourceType: string;
  businessId: string;
  locationId: string;
  data: any;
  headers?: Record<string, string>;
}

export interface ResourceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

@Injectable()
export class ResourcesService {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiBaseUrl = this.configService.get<string>('API_SERVER_URL');
    this.apiKey = this.configService.get<string>('API_SERVER_KEY');
  }

  async executeOperation(operation: ResourceOperation): Promise<ResourceResponse> {
    try {
      const url = this.buildResourceUrl(operation);
      const headers = this.buildHeaders(operation.headers);
      
      let response: any;

      switch (operation.type) {
        case 'create':
          response = await firstValueFrom(
            this.httpService.post(url, operation.data, { headers })
          );
          break;
        case 'read':
          response = await firstValueFrom(
            this.httpService.get(url, { headers })
          );
          break;
        case 'update':
          response = await firstValueFrom(
            this.httpService.put(url, operation.data, { headers })
          );
          break;
        case 'delete':
          response = await firstValueFrom(
            this.httpService.delete(url, { headers })
          );
          break;
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };

    } catch (error) {
      console.error('Resource operation failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  // Operații specifice pentru rezervări
  async createReservation(
    businessId: string,
    locationId: string,
    reservationData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'create',
      resourceType: 'reservations',
      businessId,
      locationId,
      data: reservationData
    });
  }

  async getReservations(
    businessId: string,
    locationId: string,
    filters?: any
  ): Promise<ResourceResponse> {
    const url = this.buildResourceUrl({
      type: 'read',
      resourceType: 'reservations',
      businessId,
      locationId,
      data: {}
    });

    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}${queryParams}`, {
          headers: this.buildHeaders()
        })
      );

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  // Operații specifice pentru clienți
  async getCustomer(
    businessId: string,
    locationId: string,
    customerId: string
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: `customers/${customerId}`,
      businessId,
      locationId,
      data: {}
    });
  }

  async createCustomer(
    businessId: string,
    locationId: string,
    customerData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'create',
      resourceType: 'customers',
      businessId,
      locationId,
      data: customerData
    });
  }

  // Operații specifice pentru servicii
  async getServices(
    businessId: string,
    locationId: string
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: 'services',
      businessId,
      locationId,
      data: {}
    });
  }

  // Operații specifice pentru disponibilitate
  async checkAvailability(
    businessId: string,
    locationId: string,
    availabilityData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: 'availability',
      businessId,
      locationId,
      data: availabilityData
    });
  }

  private buildResourceUrl(operation: ResourceOperation): string {
    return `${this.apiBaseUrl}/resources/${operation.businessId}/${operation.locationId}/${operation.resourceType}`;
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };
  }
} 