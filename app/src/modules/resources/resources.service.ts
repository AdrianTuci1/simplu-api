import { Injectable, BadRequestException } from '@nestjs/common';
import { KinesisService, ResourceOperation } from '../../kinesis.service';
import {
  VALID_RESOURCE_TYPES,
  ResourceType,
  ResourceAction,
} from './types/base-resource';
import {
  PermissionService,
  AuthenticatedUser,
} from './services/permission.service';
import { v4 as uuidv4 } from 'uuid';

interface ResourceOperationRequest {
  operation: ResourceAction;
  businessId: string;
  locationId: string;
  resourceType?: ResourceType;
  resourceId?: string;
  data?: Record<string, unknown>; // The actual resource data with proper typing
  user?: AuthenticatedUser; // User data from Lambda authorizer
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
  ) {}

  async processResourceOperation(
    request: ResourceOperationRequest,
  ): Promise<StandardResponse> {
    const requestId = uuidv4();

    // Validate request
    this.validateRequest(request);

    // Check user permissions if user data is provided
    if (request.user && request.resourceType) {
      await this.permissionService.checkPermission(
        request.user,
        request.locationId,
        request.resourceType,
        request.operation,
      );
    }

    // Create operation for stream
    const operation: ResourceOperation = {
      operation: request.operation,
      businessId: request.businessId,
      locationId: request.locationId,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      data: request.data, // Include data in the operation - startDate and endDate will be extracted from this
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
  }

  private validateRequest(request: ResourceOperationRequest): void {
    if (!request.businessId || !request.locationId) {
      throw new BadRequestException('Business ID and Location ID are required');
    }

    // Resource type is required for create, update, patch, and delete operations
    if (
      ['create', 'update', 'patch', 'delete'].includes(request.operation) &&
      !request.resourceType
    ) {
      throw new BadRequestException(
        'Resource type is required for create, update, patch, and delete operations',
      );
    }

    if (
      request.resourceType &&
      !VALID_RESOURCE_TYPES.includes(request.resourceType)
    ) {
      throw new BadRequestException(
        `Invalid resource type: ${request.resourceType}`,
      );
    }

    // Resource ID is required for update, patch, and delete operations
    if (
      ['update', 'patch', 'delete'].includes(request.operation) &&
      !request.resourceId
    ) {
      throw new BadRequestException(
        'Resource ID is required for update, patch, and delete operations',
      );
    }

    // Validate data is provided for create, update, and patch operations
    if (['create', 'update', 'patch'].includes(request.operation)) {
      if (!request.data) {
        throw new BadRequestException(
          'Data is required for create, update, and patch operations',
        );
      }
    }
  }
}
