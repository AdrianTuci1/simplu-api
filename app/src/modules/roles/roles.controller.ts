import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Headers
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get roles with permissions' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getRoles(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: string,
    @Query('active') active?: boolean,
  ) {
    return this.rolesService.getRoles({
      tenantId,
      locationId,
      page: Number(page),
      limit: Number(limit),
      type,
      active,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create role with permissions' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createRole(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createRoleDto: any,
  ) {
    return this.rolesService.createRole(createRoleDto, tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID with permissions' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getRole(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.rolesService.getRole(id, tenantId, locationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role with permissions' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async updateRole(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
    @Body() updateRoleDto: any,
  ) {
    return this.rolesService.updateRole(id, updateRoleDto, tenantId, locationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async deleteRole(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.rolesService.deleteRole(id, tenantId, locationId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default roles with permissions' })
  @ApiResponse({ status: 200, description: 'Default roles retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDefaultRoles(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.rolesService.getDefaultRoles(tenantId, locationId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get available permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getAvailablePermissions(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.rolesService.getAvailablePermissions();
  }
} 