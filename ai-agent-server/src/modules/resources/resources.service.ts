import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ResourceOperation {
  type: 'create' | 'read' | 'update' | 'delete';
  resourceType: string; // can be like "patients" or "patients/123"
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
      const { resourceTypeOnly, resourceId } = this.parseResourceType(operation.resourceType);
      const url = this.buildResourceUrl(operation.type, operation.businessId, operation.locationId, resourceId);
      const headers = this.buildHeaders({ 'X-Resource-Type': resourceTypeOnly, ...(operation.headers || {}) });
      
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

  // Introspection helpers (stubs)
  async listResourceTypes(businessId: string, locationId: string): Promise<string[]> {
    // Later: fetch from API server meta endpoint
    return ['reservations', 'customers', 'services'];
  }

  async getResourceSchema(resourceType: string): Promise<any> {
    // Later: fetch JSON schema from API server
    return { type: resourceType, fields: [] };
  }

  // Discovery helpers
  async discoverResourceTypes(businessId: string, locationId: string): Promise<string[]> {
    try {
      const url = this.buildStatisticsUrl(businessId, locationId);
      const headers = this.buildHeaders({ 'X-Resource-Type': 'business-statistics' });
      const response = await firstValueFrom(this.httpService.get(url, { headers }));
      const byType = response.data?.data?.byResourceType || response.data?.meta?.byResourceType;
      if (byType && typeof byType === 'object') {
        return Object.keys(byType);
      }
      // Fallback: try recent-activities and extract types from items
      const raHeaders = this.buildHeaders({ 'X-Resource-Type': 'recent-activities' });
      const raResp = await firstValueFrom(this.httpService.get(url, { headers: raHeaders }));
      const items = raResp.data?.data || [];
      const types = new Set<string>();
      items.forEach((it: any) => {
        const t = it?.resourceType || it?.resource_type;
        if (t) types.add(t);
      });
      return Array.from(types);
    } catch (error) {
      console.warn('Failed to discover resource types, using fallback list', error.message);
      return ['patients', 'appointments', 'members', 'memberships', 'guests', 'reservations', 'stocks', 'invoices'];
    }
  }

  async inferResourceSchema(businessId: string, locationId: string, resourceType: string, sampleSize: number = 5): Promise<any> {
    try {
      const url = this.buildResourcesListUrl(businessId, locationId);
      const headers = this.buildHeaders({ 'X-Resource-Type': resourceType });
      const params = { page: '1', limit: String(sampleSize) } as any;
      const response = await firstValueFrom(this.httpService.get(url, { headers, params }));
      const items = response.data?.data || response.data?.items || response.data?.data?.items || [];
      const schema: Record<string, string> = {};
      items.forEach((item: any) => {
        const data = item?.data || item;
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, value]) => {
            if (['startDate', 'endDate', 'resourceType', 'resourceId'].includes(key)) return;
            const type = Array.isArray(value) ? 'array' : typeof value;
            schema[key] = schema[key] || type;
          });
        }
      });
      return { type: resourceType, fields: Object.keys(schema).map(k => ({ name: k, type: schema[k] })) };
    } catch (error) {
      console.warn(`Failed to infer schema for ${resourceType}:`, error.message);
      return { type: resourceType, fields: [] };
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
    const url = this.buildResourcesListUrl(businessId, locationId);
    const headers = this.buildHeaders({ 'X-Resource-Type': 'reservations' });
    const params = filters || {};
    try {
      const response = await firstValueFrom(this.httpService.get(url, { headers, params }));

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

  private buildResourcesListUrl(businessId: string, locationId: string): string {
    // GET/POST base (no resource type in path); controller expects `${businessId}-${locationId}`
    return `${this.apiBaseUrl}/resources/${businessId}-${locationId}`;
  }

  private buildStatisticsUrl(businessId: string, locationId: string): string {
    return `${this.apiBaseUrl}/resources/${businessId}-${locationId}/statistics`;
  }

  private buildResourceUrl(type: ResourceOperation['type'], businessId: string, locationId: string, resourceId?: string): string {
    const base = this.buildResourcesListUrl(businessId, locationId);
    if ((type === 'update' || type === 'delete' || (type === 'read' && resourceId)) && resourceId) {
      return `${base}/${resourceId}`;
    }
    return base;
  }

  private parseResourceType(resourceType: string): { resourceTypeOnly: string; resourceId?: string } {
    if (!resourceType) return { resourceTypeOnly: '' } as any;
    const parts = resourceType.split('/');
    if (parts.length > 1) {
      return { resourceTypeOnly: parts[0], resourceId: parts.slice(1).join('/') };
    }
    return { resourceTypeOnly: resourceType };
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(customHeaders || {})
    };
  }
} 