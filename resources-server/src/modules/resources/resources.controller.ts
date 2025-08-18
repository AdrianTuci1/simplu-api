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
  Logger,
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
import { ResourceQueryService } from './services/resource-query.service';
import { StandardResponse } from './dto/standard-response.dto';
import { ResourceRequest, ResourceQuery } from './dto/resource-request.dto';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
  ) {}

  @Post(':businessId-:locationId')
  @ApiOperation({ summary: 'Create resource' })
  @ApiResponse({
    status: 201,
    description: 'Resource created successfully',
    type: StandardResponse,
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Business-ID',
    required: true,
    description: 'Business ID header',
  })
  @ApiHeader({
    name: 'X-Location-ID',
    required: true,
    description: 'Location ID header',
  })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type header',
  })
  async createResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceRequest,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    this.logger.log(`Received CREATE request for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      this.logger.error(`Header validation failed: URL params (${businessId}-${locationId}) don't match headers (${headerBusinessId}-${headerLocationId})`);
      throw new Error('URL parameters must match headers');
    }

    const result = await this.resourcesService.createResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: resourceRequest.operation || 'create',
      data: resourceRequest.data,
    });

    this.logger.log(`Successfully created resource for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    return result;
  }

  @Put(':businessId-:locationId')
  @ApiOperation({ summary: 'Update resource (full replacement)' })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    type: StandardResponse,
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Business-ID',
    required: true,
    description: 'Business ID header',
  })
  @ApiHeader({
    name: 'X-Location-ID',
    required: true,
    description: 'Location ID header',
  })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type header',
  })
  async updateResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceRequest,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    this.logger.log(`Received UPDATE request for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      this.logger.error(`Header validation failed: URL params (${businessId}-${locationId}) don't match headers (${headerBusinessId}-${headerLocationId})`);
      throw new Error('URL parameters must match headers');
    }

    const result = await this.resourcesService.updateResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'update',
      data: resourceRequest.data,
    });

    this.logger.log(`Successfully updated resource for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    return result;
  }

  @Patch(':businessId-:locationId')
  @ApiOperation({ summary: 'Partially update resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    type: StandardResponse,
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Business-ID',
    required: true,
    description: 'Business ID header',
  })
  @ApiHeader({
    name: 'X-Location-ID',
    required: true,
    description: 'Location ID header',
  })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type header',
  })
  async patchResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceRequest,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    this.logger.log(`Received PATCH request for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      this.logger.error(`Header validation failed: URL params (${businessId}-${locationId}) don't match headers (${headerBusinessId}-${headerLocationId})`);
      throw new Error('URL parameters must match headers');
    }

    const result = await this.resourcesService.patchResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'patch',
      data: resourceRequest.data,
    });

    this.logger.log(`Successfully patched resource for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    return result;
  }

  @Delete(':businessId-:locationId')
  @ApiOperation({ summary: 'Delete resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
    type: StandardResponse,
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiHeader({
    name: 'X-Business-ID',
    required: true,
    description: 'Business ID header',
  })
  @ApiHeader({
    name: 'X-Location-ID',
    required: true,
    description: 'Location ID header',
  })
  @ApiHeader({
    name: 'X-Resource-Type',
    required: true,
    description: 'Resource type header',
  })
  async deleteResource(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() resourceRequest: ResourceRequest,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    this.logger.log(`Received DELETE request for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    
    // Validate that URL parameters must match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      this.logger.error(`Header validation failed: URL params (${businessId}-${locationId}) don't match headers (${headerBusinessId}-${headerLocationId})`);
      throw new Error('URL parameters must match headers');
    }

    const result = await this.resourcesService.deleteResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'delete',
      data: resourceRequest.data,
    });

    this.logger.log(`Successfully deleted resource for business: ${businessId}, location: ${locationId}, resourceType: ${headerResourceType}`);
    return result;
  }

  @Get(':businessId-:locationId/query')
  @ApiOperation({ summary: 'Query resources with filters' })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Resource type filter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async queryResources(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('resourceType') resourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query() filters?: any,
  ) {
    const query: ResourceQuery = {
      resourceType: resourceType || '',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      filters,
    };

    const result = await this.resourceQueryService.queryResources(businessId, locationId, query);
    
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

  @Get(':businessId-:locationId/:resourceId')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  async getResourceById(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('resourceId') resourceId: string,
  ) {
    const resource = await this.resourceQueryService.getResourceById(businessId, locationId, resourceId);
    
    return {
      success: true,
      data: resource,
      meta: {
        businessId,
        locationId,
        resourceId,
        timestamp: new Date().toISOString(),
        operation: 'get',
      },
    };
  }

  @Get(':businessId-:locationId/stats')
  @ApiOperation({ summary: 'Get resource statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Resource type filter' })
  async getResourceStats(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('resourceType') resourceType?: string,
  ) {
    const stats = await this.resourceQueryService.getResourceStats(businessId, locationId, resourceType);
    
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
}
