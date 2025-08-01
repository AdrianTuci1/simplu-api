import { Injectable, BadRequestException } from '@nestjs/common';
import {
  StandardResponse,
  MetaInfo,
  ErrorInfo,
} from './dto/standard-response.dto';
import { ResourceDataService } from './services/resource-data.service';

interface ResourceRequestParams {
  businessId: string;
  locationId: string;
  resourceType: string;
  operation?: string;
  data?: any;
}

@Injectable()
export class ResourcesService {
  constructor(
    private readonly resourceDataService: ResourceDataService,
  ) {}

  async createResource(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      // Create resource and send to Kinesis stream
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
        shardId: result.shardId,
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

  async updateResource(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      if (!data?.id) {
        throw new BadRequestException('Resource ID is required for update operation');
      }

      // Update resource and send to Kinesis stream
      const result = await this.resourceDataService.updateResource(
        businessId,
        locationId,
        resourceType,
        data.id,
        data,
      );

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'update',
        shardId: result.shardId,
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

  async deleteResource(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      if (!data?.id) {
        throw new BadRequestException('Resource ID is required for delete operation');
      }

      // Delete resource and send to Kinesis stream
      const result = await this.resourceDataService.deleteResource(
        businessId,
        locationId,
        resourceType,
        data.id,
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

  async patchResource(params: ResourceRequestParams): Promise<StandardResponse> {
    try {
      const { businessId, locationId, resourceType, data } = params;
      
      // Validate required parameters
      this.validateRequiredParams(businessId, locationId, resourceType);

      if (!data?.id) {
        throw new BadRequestException('Resource ID is required for patch operation');
      }

      // Patch resource and send to Kinesis stream
      const result = await this.resourceDataService.patchResource(
        businessId,
        locationId,
        resourceType,
        data.id,
        data,
      );

      const meta: MetaInfo = {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'patch',
        shardId: result.shardId,
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

  private handleError(error: any, params: ResourceRequestParams): StandardResponse {
    const errorInfo: ErrorInfo = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.response?.data || error.details,
    };

    const meta: MetaInfo = {
      businessId: params.businessId,
      locationId: params.locationId,
      resourceType: params.resourceType,
      timestamp: new Date().toISOString(),
      operation: params.operation || 'unknown',
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