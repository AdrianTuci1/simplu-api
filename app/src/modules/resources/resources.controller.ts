import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
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
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { StandardResponse } from './dto/standard-response.dto';
import { ResourceRequest } from './dto/resource-request.dto';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(CognitoAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get(':businessId-:locationId')
  @ApiOperation({ summary: 'Get resources by business and location' })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: StandardResponse,
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({
    name: 'resourceType',
    required: true,
    description: 'Type of resource',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
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
  async getResources(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('resourceType') resourceType: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query() filters: Record<string, any>,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    // Validate that URL params match headers
    if (
      headerBusinessId !== businessId ||
      headerLocationId !== locationId ||
      headerResourceType !== resourceType
    ) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.getResources({
      businessId,
      locationId,
      resourceType,
      page: Number(page),
      limit: Number(limit),
      filters,
    });
  }

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
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.createResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: resourceRequest.operation || 'create',
      data: resourceRequest.data,
    });
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
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.updateResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'update',
      data: resourceRequest.data,
    });
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
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.patchResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'patch',
      data: resourceRequest.data,
    });
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
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    // Validate that URL params match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.deleteResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'delete',
    });
  }
}
