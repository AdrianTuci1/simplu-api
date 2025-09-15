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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import {
  ResourceQueryService,
  ResourceQuery,
} from './services/resource-query.service';
import { StatisticsService } from './services/statistics.service';
import { ResourceType } from './types/base-resource';
import {
  PermissionService,
  AuthenticatedUser,
} from './services/permission.service';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CognitoUser } from '../auth/auth.service';

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

@ApiTags('Resources')
@Controller('resources')
@UseGuards(CognitoAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly statisticsService: StatisticsService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Create a minimal user object for the service
   * The actual role and permissions are checked by PermissionService
   */
  private createMinimalUser(
    user: CognitoUser,
    businessId: string,
    locationId: string,
  ): AuthenticatedUser {
    return {
      userId: user.userId,
      userName: user.username,
      email: user.email,
      businessId,
      roles: [
        {
          locationId,
          locationName: locationId,
          role: 'user', // This will be overridden by the actual role from medic resource
        },
      ],
    };
  }

  /**
   * Separate nested field filters from regular custom filters
   * This allows for proper handling of data.doctor.id, data.treatmentName, etc.
   */
  private separateNestedFilters(allFilters: any): {
    nestedFilters: Record<string, any>;
    customFilters: Record<string, any>;
  } {
    const nestedFilters: Record<string, any> = {};
    const customFilters: Record<string, any> = {};

    for (const [key, value] of Object.entries(allFilters)) {
      if (key.startsWith('data.')) {
        nestedFilters[key] = value;
      } else {
        customFilters[key] = value;
      }
    }

    return { nestedFilters, customFilters };
  }

  @Post(':businessId-:locationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async createResource(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType,
      'create',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.resourcesService.processResourceOperation({
      operation: 'create',
      businessId,
      locationId,
      resourceType,
      data: resourceRequest.data,
      user: authenticatedUser,
    });
  }


  @Put(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Update resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
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
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType,
      'update',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.resourcesService.processResourceOperation({
      operation: 'update',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
      user: authenticatedUser,
    });
  }

  @Patch(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Patch resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
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
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Body() resourceRequest: ResourceDataRequest,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType,
      'update',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.resourcesService.processResourceOperation({
      operation: 'patch',
      businessId,
      locationId,
      resourceType,
      resourceId,
      data: resourceRequest.data,
      user: authenticatedUser,
    });
  }

  @Delete(':businessId-:locationId/:resourceId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Delete resource - sends to stream for processing' })
  @ApiResponse({
    status: 202,
    description: 'Request accepted and sent to stream',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
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
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ): Promise<StandardResponse> {
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType,
      'delete',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );

    return this.resourcesService.processResourceOperation({
      operation: 'delete',
      businessId,
      locationId,
      resourceType,
      resourceId,
      user: authenticatedUser,
    });
  }

  // GET endpoints - read directly from database (RDS or Citrus)

  @Get(':businessId-:locationId/:resourceId')
  @ApiOperation({
    summary: 'Get specific resource by ID - reads from database',
  })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type',
  })
  async getResourceById(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
    @Headers('X-Resource-Type') resourceType: ResourceType,
  ) {
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType,
      'read',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );
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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
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
  @ApiQuery({
    name: 'customField',
    required: false,
    description: 'Filter by any custom field in data or resource_id. Examples: ?medicId=123&patientName=Ion&status=active',
  })
  @ApiQuery({
    name: 'data.nestedField',
    required: false,
    description: 'Filter by nested data fields. Examples: ?data.doctor.id=33948842-b061-7036-f02f-79b9c0b4225b&data.treatmentName=consultation&data.patient.name=Ion',
  })
  async getResources(
    @CurrentUser() user: CognitoUser,
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
    // Check permission using the new medic -> roles flow
    await this.permissionService.checkPermissionFromMedic(
      user.userId,
      businessId,
      locationId,
      resourceType as ResourceType,
      'read',
    );

    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );
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

      // Separate nested field filters from regular custom filters
      const { nestedFilters, customFilters } = this.separateNestedFilters(allFilters);

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
          customFilters,
          nestedFilters,
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





  @Get('statistics/:businessId-:locationId')
  @ApiOperation({ summary: 'Get business statistics and recent activities' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
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
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Headers('X-Resource-Type') resourceType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const authenticatedUser = this.createMinimalUser(
      user,
      businessId,
      locationId,
    );
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
