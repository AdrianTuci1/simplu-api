import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentTenant } from '../tenants/decorators/tenant.decorator';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'The service has been successfully created.', type: Service })
  create(@Body() createServiceDto: CreateServiceDto, @CurrentTenant() tenant: Tenant) {
    return this.servicesService.create(createServiceDto, tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'Return all services.', type: [Service] })
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.servicesService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiResponse({ status: 200, description: 'Return the service.', type: Service })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.servicesService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'The service has been successfully updated.', type: Service })
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.servicesService.update(id, updateServiceDto, tenant.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service' })
  @ApiResponse({ status: 200, description: 'The service has been successfully deleted.' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.servicesService.remove(id, tenant.id);
  }

  @Post(':id/employees/:employeeId')
  @ApiOperation({ summary: 'Add an employee to a service' })
  @ApiResponse({ status: 200, description: 'The employee has been successfully added to the service.', type: Service })
  addEmployee(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.servicesService.addEmployee(id, employeeId, tenant.id);
  }

  @Delete(':id/employees/:employeeId')
  @ApiOperation({ summary: 'Remove an employee from a service' })
  @ApiResponse({ status: 200, description: 'The employee has been successfully removed from the service.', type: Service })
  removeEmployee(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.servicesService.removeEmployee(id, employeeId, tenant.id);
  }
} 