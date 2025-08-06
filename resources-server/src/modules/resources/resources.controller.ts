import {
  Controller,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { StandardResponse } from './dto/standard-response.dto';
import { ResourceRequest } from './dto/resource-request.dto';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

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
    @Body() resourceRequest: ResourceRequest,
    @Headers('X-Business-ID') headerBusinessId: string,
    @Headers('X-Location-ID') headerLocationId: string,
    @Headers('X-Resource-Type') headerResourceType: string,
  ): Promise<StandardResponse> {
    // Validate that URL parameters must match headers
    if (headerBusinessId !== businessId || headerLocationId !== locationId) {
      throw new Error('URL parameters must match headers');
    }

    return this.resourcesService.deleteResource({
      businessId,
      locationId,
      resourceType: headerResourceType,
      operation: 'delete',
      data: resourceRequest.data,
    });
  }
}
