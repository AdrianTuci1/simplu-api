import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Headers
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getWorkflows(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.workflowsService.getWorkflows({
      tenantId,
      locationId,
      page: Number(page),
      limit: Number(limit),
      type,
      status,
    });
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default workflows' })
  @ApiResponse({ status: 200, description: 'Default workflows retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDefaultWorkflows(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.workflowsService.getDefaultWorkflows(tenantId, locationId);
  }
} 