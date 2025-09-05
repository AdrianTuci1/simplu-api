import { Injectable, BadRequestException } from '@nestjs/common';
import { KinesisService, ResourceOperation } from '../../kinesis.service';
import { ResourceQueryService } from './services/resource-query.service';
import {
  VALID_RESOURCE_TYPES,
  ResourceType,
  ResourceAction,
} from './types/base-resource';

import { v4 as uuidv4 } from 'uuid';

interface ResourceOperationRequest {
  operation: ResourceAction;
  businessId: string;
  locationId: string;
  resourceType?: ResourceType;
  resourceId?: string;
  data?: Record<string, unknown>; // The actual resource data with proper typing
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
    private readonly resourceQueryService: ResourceQueryService,
  ) {}

  async processResourceOperation(
    request: ResourceOperationRequest,
  ): Promise<StandardResponse> {
    const requestId = uuidv4();

    // Validate request
    this.validateRequest(request);



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

  // --- Agent discovery/query helpers (internal reads) ---

  async discoverResourceTypes(businessId: string, locationId: string): Promise<string[]> {
    try {
      const stats = await this.resourceQueryService.getResourceStats(businessId, locationId);
      return Object.keys(stats.byResourceType || {});
    } catch (error) {
      return [];
    }
  }

  async inferResourceSchema(
    businessId: string,
    locationId: string,
    resourceType: string,
  ): Promise<{ resourceType: string; fields: { name: string; type: string }[] }> {
    try {
      const sample = await this.resourceQueryService.getResourcesByType(
        businessId,
        locationId,
        resourceType as any,
        10,
        0,
      );
      const fieldSet: Record<string, string> = {};
      for (const item of sample) {
        const data = (item as any)?.data || {};
        Object.keys(data).forEach((k) => {
          if (!fieldSet[k]) {
            const v = (data as any)[k];
            const t = v === null || v === undefined ? 'unknown' : Array.isArray(v) ? 'array' : typeof v;
            fieldSet[k] = t;
          }
        });
      }
      return {
        resourceType,
        fields: Object.entries(fieldSet).map(([name, type]) => ({ name, type })),
      };
    } catch (error) {
      return { resourceType, fields: [] };
    }
  }

  async findUserInResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    userId: string,
    field?: string,
  ): Promise<boolean> {
    try {
      // If matching by resource_id, use efficient business-pattern search
      if ((field || '').toLowerCase() === 'resource_id') {
        const rows = await this.resourceQueryService.searchResourcesByBusinessPattern(
          businessId,
          resourceType,
          userId,
        );
        return rows.length > 0;
      }

      // Fallback: query by type and scan data for field match (best effort)
      const result = await this.resourceQueryService.queryResources(businessId, locationId, {
        resourceType,
        page: 1,
        limit: 100,
      } as any);
      const key = (field || 'userId').toLowerCase();
      return (result.data || []).some((r: any) => {
        const data = r?.data || {};
        const candidates = [
          data[key],
          data['resourceId'],
          data['userId'],
          data['memberId'],
          data['patientId'],
          data['customerId'],
        ].filter(Boolean);
        return candidates.map(String).some((v) => v === String(userId));
      });
    } catch (error) {
      return false;
    }
  }

  async findUserInRdsByResourceId(
    businessId: string,
    locationId: string,
    resourceType: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const rows = await this.resourceQueryService.searchResourcesByBusinessPattern(
        businessId,
        resourceType,
        userId,
      );
      return rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getRecentUserRelatedResources(
    businessId: string,
    locationId: string,
    userId: string,
    limit: number = 25,
  ): Promise<any[]> {
    try {
      // Try to find by resource id across business locations
      const byId = await this.resourceQueryService.searchResourcesByBusinessPattern(
        businessId,
        '',
        userId,
      );
      if (byId?.length) {
        return byId.slice(0, limit);
      }

      // Fallback: query a few common resource types and scan for user related fields
      const candidateTypes = ['appointment', 'reservation', 'messages', 'patient', 'customer'];
      const aggregated: any[] = [];
      for (const rt of candidateTypes) {
        const res = await this.resourceQueryService.queryResources(businessId, locationId, {
          resourceType: rt,
          page: 1,
          limit: 50,
        } as any);
        for (const r of res.data || []) {
          const data = (r as any)?.data || {};
          const candidates = [data['userId'], data['memberId'], data['patientId'], data['customerId']].filter(Boolean);
          if (candidates.map(String).includes(String(userId))) {
            aggregated.push(r);
          }
        }
        if (aggregated.length >= limit) break;
      }
      return aggregated.slice(0, limit);
    } catch (error) {
      return [];
    }
  }
}
