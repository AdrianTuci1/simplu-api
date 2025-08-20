import {
  Controller,
  Get,
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { ResourceQueryService, ResourceQuery } from './services/resource-query.service';
import { ResourceType } from './types/base-resource';

// Simplified request interface - just the data
interface ResourceDataRequest {
  data: Record<string, any>; // The actual resource data
}

interface StandardResponse {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
}

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
  ) { }

  @Post(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
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

  @Put(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Update resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async updateResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'update',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Patch(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Patch resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({ name: 'X-Resource-Type', required: true, description: 'Resource type' })
  async patchResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'patch',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
    });
  }

  @Delete(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Delete resource - sends to stream for processing' })
  @ApiResponse({ status: 202, description: 'Request accepted and sent to stream' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  async deleteResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
  ): Promise<StandardResponse> {
    return this.resourcesService.processResourceOperation({
      operation: 'delete',
      businessId,
      locationId,
    });
  }

  // GET endpoints - read directly from database (RDS or Citrus)

  @Get(':businessId-:locationId/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get specific resource by ID - reads from database' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  async getResourceById(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: ResourceType,
    @Param('resourceId') resourceId: string,
  ) {
    const resource = await this.resourceQueryService.getResourceById(
      businessId,
      locationId,
      resourceType,
      resourceId,
    );

    if (!resource) {
      return {
        success: false,
        message: 'Resource not found',
        meta: {
          businessId,
          locationId,
          resourceType,
          resourceId,
          timestamp: new Date().toISOString(),
          operation: 'read',
        },
      };
    }

    return {
      success: true,
      data: resource,
      meta: {
        businessId,
        locationId,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
        operation: 'read',
      },
    };
  }

  @Get(':businessId-:locationId/:resourceType')
  @ApiOperation({ summary: 'Query resources with filters - reads from database' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (ASC/DESC)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'name', required: false, description: 'Name search (partial match)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Active status filter (true/false)' })
  async queryResources(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: ResourceType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
    @Query() allFilters?: any,
  ) {
    const query: ResourceQuery = {
      resourceType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      sortBy,
      sortOrder,
      filters: {
        startDate,
        endDate,
        name,
        isActive: isActive ? isActive === 'true' : undefined,
        customFilters: allFilters,
      },
    };

    const result = await this.resourceQueryService.queryResources(
      businessId,
      locationId,
      query,
    );

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'query',
      },
    };
  }

  @Get(':businessId-:locationId/stats')
  @ApiOperation({ summary: 'Get resource statistics - reads from database' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Resource type filter' })
  async getResourceStats(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('resourceType') resourceType?: ResourceType,
  ) {
    const stats = await this.resourceQueryService.getResourceStats(
      businessId,
      locationId,
      resourceType,
    );

    return {
      success: true,
      data: stats,
      meta: {
        businessId,
        locationId,
        resourceType,
        timestamp: new Date().toISOString(),
        operation: 'stats',
      },
    };
  }

  // Additional endpoint for date range queries
  @Get(':businessId-:locationId/:resourceType/date-range')
  @ApiOperation({ summary: 'Get resources by date range - optimized for time-based queries' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getResourcesByDateRange(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: ResourceType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offset = (pageNum - 1) * limitNum;

    const resources = await this.resourceQueryService.getResourcesByDateRange(
      businessId,
      locationId,
      resourceType,
      startDate,
      endDate,
      limitNum,
      offset,
    );

    return {
      success: true,
      data: resources,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: resources.length,
        pages: Math.ceil(resources.length / limitNum),
      },
      meta: {
        businessId,
        locationId,
        resourceType,
        startDate,
        endDate,
        timestamp: new Date().toISOString(),
        operation: 'date-range-query',
      },
    };
  }

}
