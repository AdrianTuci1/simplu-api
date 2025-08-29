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
import {
  ResourceQueryService,
  ResourceQuery,
} from './services/resource-query.service';
import { StatisticsService } from './services/statistics.service';
import { ResourceType } from './types/base-resource';
import { AuthenticatedUser } from './services/permission.service';

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

interface AuthorizerHeaders {
  'x-authorizer-user-id'?: string;
  'x-authorizer-user-name'?: string;
  'x-authorizer-business-id'?: string;
  'x-authorizer-roles'?: string;
}

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly statisticsService: StatisticsService,
  ) {}

  /**
   * Extract user data from Lambda authorizer headers
   */
  private extractUserFromHeaders(headers: AuthorizerHeaders): AuthenticatedUser | undefined {
    const userId = headers['x-authorizer-user-id'];
    const userName = headers['x-authorizer-user-name'];
    const businessId = headers['x-authorizer-business-id'];
    const rolesHeader = headers['x-authorizer-roles'];

    if (!userId || !userName || !businessId || !rolesHeader) {
      return undefined;
    }

    try {
      const roles = JSON.parse(rolesHeader) as Array<{
        locationId: string;
        locationName: string;
        role: string;
      }>;

      if (!Array.isArray(roles)) {
        return undefined;
      }

      return {
        userId,
        userName,
        email: userName,
        businessId,
        roles: roles.map(role => ({
          locationId: role.locationId,
          locationName: role.locationName,
          role: role.role
        }))
      };
    } catch {
      return undefined;
    }
  }

  @Post(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async createResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
    @Headers() headers: AuthorizerHeaders,
  ): Promise<StandardResponse> {
    const user = this.extractUserFromHeaders(headers);

    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
      user,
    });
  }

  @Post(':businessId-:locationId/query')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Create resource with query parameter - sends to stream for processing',
  })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async createResourceWithQuery(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Query('X-Resource-Type') resourceType: ResourceType,
    @Headers() headers: AuthorizerHeaders,
  ): Promise<StandardResponse> {
    const user = this.extractUserFromHeaders(headers);

    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
      user,
    });
  }

  @Put(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Update resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async updateResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
    @Headers() headers: AuthorizerHeaders,
  ): Promise<StandardResponse> {
    const user = this.extractUserFromHeaders(headers);

    return this.resourcesService.processResourceOperation({
      operation: 'update',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
      user,
    });
  }

  @Patch(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Patch resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async patchResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
    @Headers() headers: AuthorizerHeaders,
  ): Promise<StandardResponse> {
    const user = this.extractUserFromHeaders(headers);

    return this.resourcesService.processResourceOperation({
      operation: 'patch',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
      user,
    });
  }

  @Delete(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Delete resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async deleteResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
    @Headers() headers: AuthorizerHeaders,
  ): Promise<StandardResponse> {
    const user = this.extractUserFromHeaders(headers);

    return this.resourcesService.processResourceOperation({
      operation: 'delete',
      businessId,
      locationId,
      resourceType,
      resourceId,
      user,
    });
  }

  // GET endpoints - read directly from database (RDS or Citrus)

  @Get(':businessId-:locationId/:resourceId')
  @ApiOperation({
    summary: 'Get specific resource by ID - reads from database',
  })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async getResourceById(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
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

  @Get(':businessId-:locationId')
  @ApiOperation({ summary: 'Get resources based on X-Resource-Type header' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC/DESC)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Name search (partial match)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Active status filter (true/false)',
  })
  @ApiQuery({
    name: 'queryType',
    required: false,
    description: 'Query type: date-range, stats, or general',
  })
  async getResources(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Headers('X-Resource-Type') resourceType: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
    @Query('queryType') queryType?: string,
    @Query() allFilters?: any,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      // Handle different query types based on queryType parameter
      if (queryType === 'date-range') {
        if (!startDate || !endDate) {
          return {
            success: false,
            message:
              'startDate and endDate are required for date-range queries',
            meta: {
              businessId,
              locationId,
              resourceType,
              timestamp: new Date().toISOString(),
              operation: 'date-range-query',
            },
          };
        }

        const offset = (pageNum - 1) * limitNum;
        const resources =
          await this.resourceQueryService.getResourcesByDateRange(
            businessId,
            locationId,
            resourceType as ResourceType,
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

      if (queryType === 'stats') {
        const stats = await this.resourceQueryService.getResourceStats(
          businessId,
          locationId,
          resourceType as ResourceType,
        );

        return {
          success: true,
          data: stats,
          meta: {
            businessId,
            locationId,
            resourceType,
            timestamp: new Date().toISOString(),
            operation: 'resource-stats',
          },
        };
      }

      // Default general query
      const offset = (pageNum - 1) * limitNum;
      const filters: any = {};

      // Add filters if provided
      if (startDate && endDate) {
        filters.startDate = { gte: startDate, lte: endDate };
      }
      if (name) {
        filters.name = { contains: name };
      }
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      // Use the existing queryResources method
      const query: ResourceQuery = {
        resourceType: resourceType as ResourceType,
        page: pageNum,
        limit: limitNum,
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
          filters,
          timestamp: new Date().toISOString(),
          operation: 'resource-query',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error processing request for ${resourceType}: ${error.message}`,
        meta: {
          businessId,
          locationId,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
      };
    }
  }

  // Name-based search endpoints

  @Get(':businessId-:locationId/search/name/:nameField')
  @ApiOperation({ summary: 'Search resources by specific name field' })
  @ApiResponse({ status: 200, description: 'Resources found by name' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({
    name: 'nameField',
    description:
      'Name field to search: medicName, patientName, trainerName, customerName',
  })
  @ApiQuery({
    name: 'nameValue',
    required: true,
    description: 'Name value to search for',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    description: 'Filter by resource type',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 50)',
  })
  async searchResourcesByName(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('nameField')
    nameField: 'medicName' | 'patientName' | 'trainerName' | 'customerName',
    @Query('nameValue') nameValue: string,
    @Query('resourceType') resourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offset = (pageNum - 1) * limitNum;

      const resources = await this.resourceQueryService.getResourcesByName(
        businessId,
        locationId,
        nameField,
        nameValue,
        resourceType,
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
          nameField,
          nameValue,
          resourceType,
          timestamp: new Date().toISOString(),
          operation: 'name-search',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error searching resources by name: ${error.message}`,
        meta: {
          businessId,
          locationId,
          nameField,
          nameValue,
          timestamp: new Date().toISOString(),
          operation: 'name-search',
        },
      };
    }
  }

  @Post(':businessId-:locationId/search/names')
  @ApiOperation({ summary: 'Search resources by multiple name fields' })
  @ApiResponse({
    status: 200,
    description: 'Resources found by multiple names',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
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

  @Get('statistics/:businessId-:locationId')
  @ApiOperation({ summary: 'Get business statistics and recent activities' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Statistics type: business-statistics or recent-activities',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter (YYYY-MM-DD)',
  })
  async getStatistics(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Headers('X-Resource-Type') resourceType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      let data: any;
      let operation: string;

      switch (resourceType) {
        case 'business-statistics':
          data = await this.statisticsService.getBusinessStatistics(
            businessId,
            locationId,
          );
          operation = 'business-statistics';
          break;

        case 'recent-activities':
          data = await this.statisticsService.getRecentActivities(
            businessId,
            locationId,
          );
          operation = 'recent-activities';
          break;

        default:
          return {
            success: false,
            message: `Invalid statistics type: ${resourceType}. Supported types: business-statistics, recent-activities`,
            meta: {
              businessId,
              locationId,
              statisticsType: resourceType,
              timestamp: new Date().toISOString(),
              operation: 'error',
            },
          };
      }

      return {
        success: true,
        data,
        meta: {
          businessId,
          locationId,
          statisticsType: resourceType,
          startDate,
          endDate,
          timestamp: new Date().toISOString(),
          operation,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error retrieving statistics: ${error.message}`,
        meta: {
          businessId,
          locationId,
          statisticsType: resourceType,
          startDate,
          endDate,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
      };
    }
  }
}
