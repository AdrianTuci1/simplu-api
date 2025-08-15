import { Injectable, BadRequestException } from '@nestjs/common';
import { KinesisService, ResourceOperation } from '../../kinesis.service';
import { VALID_RESOURCE_TYPES, ResourceType, ResourceAction } from './types/base-resource';
import { PermissionService } from './services/permission.service';
import { v4 as uuidv4 } from 'uuid';

interface ResourceOperationRequest {
  operation: ResourceAction;
  businessId: string;
  locationId: string;
  resourceType: ResourceType;
  resourceId?: string;
  data?: any;
  userId?: string; // Add userId for permission checking
}

interface StandardResponse {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ResourcesService {
  constructor(
    private readonly kinesisService: KinesisService,
    private readonly permissionService: PermissionService,
  ) { }



  async processResourceOperation(request: ResourceOperationRequest): Promise<StandardResponse> {
    const requestId = uuidv4();

    try {
      // Validate request
      this.validateRequest(request);

      // Check user permissions
      if (request.userId) {
        await this.permissionService.checkPermission(
          request.userId,
          request.resourceType,
          request.operation
        );
      }

      // Create operation for stream
      const operation: ResourceOperation = {
        operation: request.operation,
        businessId: request.businessId,
        locationId: request.locationId,
        resourceType: request.resourceType,
        resourceId: request.resourceId,
        data: request.data,
        timestamp: new Date().toISOString(),
        requestId,
      };

      // Send to Kinesis stream
      await this.kinesisService.sendResourceOperation(operation);

      return {
        success: true,
        message: `${request.operation} operation queued for processing`,
        requestId,
        timestamp: operation.timestamp,
      };
    } catch (error) {
      throw error;
    }
  }

  private validateRequest(request: ResourceOperationRequest): void {
    if (!request.businessId || !request.locationId) {
      throw new BadRequestException('Business ID and Location ID are required');
    }

    if (!request.resourceType) {
      throw new BadRequestException('Resource type is required');
    }

    if (!VALID_RESOURCE_TYPES.includes(request.resourceType)) {
      throw new BadRequestException(`Invalid resource type: ${request.resourceType}`);
    }

    if (['update', 'patch', 'delete'].includes(request.operation) && !request.resourceId) {
      throw new BadRequestException(`Resource ID is required for ${request.operation} operation`);
    }
  }


}