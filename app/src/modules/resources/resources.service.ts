import { Injectable, BadRequestException } from '@nestjs/common';
import {
  StandardResponse,
  PaginationInfo,
  MetaInfo,
  ErrorInfo,
} from './dto/standard-response.dto';
import { ResourceModelService } from './services/resource-model.service';
import { BusinessType } from './models/unified-data-types';
import { ResourcePermissionsService, UserContext } from './services/resource-permissions.service';
import { BusinessTypeService } from './services/core/business-type.service';
import { ResourceDataService } from './services/data/resource-data.service';

interface ResourceRequestParams {
  businessId: string;
  locationId: string;
  resourceType: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
  operation?: string;
  data?: any;
  user?: UserContext; // User context for permission checking
}

@Injectable()
export class ResourcesService {

  constructor(
    private readonly resourceModelService: ResourceModelService,
    private readonly resourcePermissionsService: ResourcePermissionsService,
    private readonly businessTypeService: BusinessTypeService,
    private readonly resourceDataService: ResourceDataService,
  ) { }

  async getResources(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const {
        businessId,
        locationId,
        resourceType,
        page = 1,
        limit = 20,
        filters = {},
        user,
      } = params;

      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Get business type for permission checking and resource organization
      const businessType = await this.businessTypeService.getBusinessType(businessId, locationId);

      // Check permissions if user context is provided
      if (user) {
        await this.resourcePermissionsService.validatePermission(
          user,
          businessType,
          resourceType,
          'list',
        );
      }

      // Use the centralized data service to get resources
      const result = await this.resourceDataService.getResources(
        businessId,
        locationId,
        resourceType,
        filters,
        page,
        limit,
      );

      const items = result.items || [];
      const total = result.total || 0;

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      };

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'list',
      };

      return {
        success: true,
        data: {
          items,
          pagination,
        },
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async createResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Get business type for validation and permission checking
      const businessType = await this.businessTypeService.getBusinessType(businessId, locationId);

      // Validate resource data structure
      const isValid = this.resourceModelService.validateResourceData(
        businessType as any,
        resourceType as any,
        data,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid resource data structure');
      }

      // Check permissions if user context is provided
      if (params.user) {
        await this.resourcePermissionsService.validatePermission(
          params.user,
          businessType,
          resourceType,
          'create',
        );
      }

      // Use the centralized data service to create resource
      const result = await this.resourceDataService.createResource(
        businessId,
        locationId,
        resourceType,
        data,
      );

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'create',
      };

      return {
        success: true,
        data: result,
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async updateResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Get business type for validation and permission checking
      const businessType = await this.businessTypeService.getBusinessType(businessId, locationId);

      // Check permissions if user context is provided
      if (params.user) {
        await this.resourcePermissionsService.validatePermission(
          params.user,
          businessType,
          resourceType,
          'update',
        );
      }

      // Use the centralized data service to update resource
      const result = await this.resourceDataService.updateResource(
        businessId,
        locationId,
        resourceType,
        data.id || 'unknown',
        data,
      );

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'update',
      };

      return {
        success: true,
        data: result,
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async deleteResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Get business type for permission checking
      const businessType = await this.businessTypeService.getBusinessType(businessId, locationId);

      // Check permissions if user context is provided
      if (params.user) {
        await this.resourcePermissionsService.validatePermission(
          params.user,
          businessType,
          resourceType,
          'delete',
        );
      }

      // Use the centralized data service to delete resource
      const result = await this.resourceDataService.deleteResource(
        businessId,
        locationId,
        resourceType,
        params.data?.id || 'unknown',
      );

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'delete',
      };

      return {
        success: true,
        data: { deleted: result },
        meta,
      };
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  async patchResource(
    params: ResourceRequestParams,
  ): Promise<StandardResponse> {
    // For now, patch behaves the same as update
    return this.updateResource({ ...params, operation: 'patch' });
  }

  private handleError(
    error: any,
    params: ResourceRequestParams,
  ): StandardResponse {
    const errorInfo: ErrorInfo = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
    };

    const meta: MetaInfo = {
      businessId: params.businessId,
      locationId: params.locationId,
      resourceType: params.resourceType,
      timestamp: new Date().toISOString(),
      operation: params.operation,
    };

    return {
      success: false,
      error: errorInfo,
      meta,
    };
  }

  private validateRequiredParams(businessId: string, locationId: string, resourceType: string) {
    if (!businessId || !locationId) {
      throw new BadRequestException('Business ID and Location ID are required.');
    }
    if (!resourceType) {
      throw new BadRequestException('Resource type is required.');
    }
  }
}