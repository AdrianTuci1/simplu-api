import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ResourceRequest {
  tenantId: string;
  userId: string;
  locationId?: string;
  resourceType: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  resourceId?: string;
  data?: any;
  filters?: any;
}

export interface ResourceResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

@Injectable()
export class ApiResourceService {
  private readonly logger = new Logger(ApiResourceService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiBaseUrl = this.configService.get<string>('API_SERVER_URL');
    this.apiKey = this.configService.get<string>('API_SERVER_KEY');
    
    if (!this.apiBaseUrl) {
      throw new Error('API_SERVER_URL is not configured');
    }
  }

  async createResource(request: ResourceRequest): Promise<ResourceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/resources/${request.resourceType}`,
          {
            ...request.data,
            tenantId: request.tenantId,
            locationId: request.locationId,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': request.tenantId,
              'x-user-id': request.userId,
              'x-location-id': request.locationId,
            },
          }
        )
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Error creating resource: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async readResource(request: ResourceRequest): Promise<ResourceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/resources/${request.resourceType}/${request.resourceId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': request.tenantId,
              'x-user-id': request.userId,
              'x-location-id': request.locationId,
            },
          }
        )
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Error reading resource: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async updateResource(request: ResourceRequest): Promise<ResourceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiBaseUrl}/resources/${request.resourceType}/${request.resourceId}`,
          {
            ...request.data,
            tenantId: request.tenantId,
            locationId: request.locationId,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': request.tenantId,
              'x-user-id': request.userId,
              'x-location-id': request.locationId,
            },
          }
        )
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Error updating resource: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async deleteResource(request: ResourceRequest): Promise<ResourceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiBaseUrl}/resources/${request.resourceType}/${request.resourceId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': request.tenantId,
              'x-user-id': request.userId,
              'x-location-id': request.locationId,
            },
          }
        )
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Error deleting resource: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async listResources(request: ResourceRequest): Promise<ResourceResponse> {
    try {
      const params = new URLSearchParams();
      if (request.filters) {
        Object.entries(request.filters).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/resources/${request.resourceType}?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': request.tenantId,
              'x-user-id': request.userId,
              'x-location-id': request.locationId,
            },
          }
        )
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Error listing resources: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async executeResourceAction(request: ResourceRequest): Promise<ResourceResponse> {
    switch (request.action) {
      case 'create':
        return this.createResource(request);
      case 'read':
        return this.readResource(request);
      case 'update':
        return this.updateResource(request);
      case 'delete':
        return this.deleteResource(request);
      case 'list':
        return this.listResources(request);
      default:
        return {
          success: false,
          error: `Unknown action: ${request.action}`,
        };
    }
  }

  // Helper method to check if user has permission for a specific resource action
  async checkPermission(
    tenantId: string,
    userId: string,
    resourceType: string,
    action: string,
    locationId?: string
  ): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/auth/permissions/check`,
          {
            params: {
              resourceType,
              action,
            },
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': tenantId,
              'x-user-id': userId,
              'x-location-id': locationId,
            },
          }
        )
      );

      return response.data?.hasPermission || false;
    } catch (error) {
      this.logger.error(`Error checking permission: ${error.message}`);
      return false;
    }
  }

  // Helper method to get user permissions
  async getUserPermissions(
    tenantId: string,
    userId: string,
    locationId?: string
  ): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/auth/permissions`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'x-tenant-id': tenantId,
              'x-user-id': userId,
              'x-location-id': locationId,
            },
          }
        )
      );

      return response.data?.permissions || [];
    } catch (error) {
      this.logger.error(`Error getting user permissions: ${error.message}`);
      return [];
    }
  }
} 