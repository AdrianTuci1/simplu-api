import {
  Controller,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourceQueryService } from './services/resource-query.service';
// Removed read/query services exposure via controller; agent builds queries itself
// Statistics endpoints removed from controller; service remains provided for internal agent use
import { ResourceType } from './types/base-resource';

// Auth removed for agent usage

// Simplified request interface - just the data
interface ResourceDataRequest {
  data: Record<string, unknown>; // The actual resource data with proper typing
}

interface StandardResponse {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
}

@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
  ) {}

  // No-op: user context not required for agent internal calls

  @Post(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  async createResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Post(':businessId-:locationId/query')
  @HttpCode(HttpStatus.ACCEPTED)
  async createResourceWithQuery(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Query('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Put(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'update',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
    });
  }

  @Patch(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  async patchResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'patch',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
    });
  }

  @Delete(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'delete',
      businessId,
      locationId,
      resourceType,
      resourceId,
    });
  }

  // Remaining search POST endpoint for flexible name-based queries used by the agent
  @Post(':businessId-:locationId/search/names')
  async searchResourcesByMultipleNames(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body()
    nameFilters: {
      medicName?: string;
      patientName?: string;
      trainerName?: string;
      customerName?: string;
      resourceType?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const { page = 1, limit = 50, resourceType, ...names } = nameFilters;
      const offset = (page - 1) * limit;

      const resources =
        await this.resourceQueryService.getResourcesByMultipleNames(
          businessId,
          locationId,
          names,
          resourceType,
          limit,
          offset,
        );

      return {
        success: true,
        data: resources,
        pagination: {
          page,
          limit,
          total: resources.length,
          pages: Math.ceil(resources.length / limit),
        },
        meta: {
          businessId,
          locationId,
          nameFilters: names,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'multiple-names-search',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error searching resources by multiple names: ${error.message}`,
        meta: {
          businessId,
          locationId,
          timestamp: new Date().toISOString(),
          operation: 'multiple-names-search',
        },
      };
    }
  }

  // Removed GET endpoints; reads should be performed internally by the agent via query planning
}
