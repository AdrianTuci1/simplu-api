import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Employee } from './entities/employee.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentTenant } from '../tenants/decorators/tenant.decorator';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'The employee has been successfully created.', type: Employee })
  create(@Body() createEmployeeDto: CreateEmployeeDto, @CurrentTenant() tenant: Tenant) {
    return this.employeesService.create(createEmployeeDto, tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiResponse({ status: 200, description: 'Return all employees.', type: [Employee] })
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.employeesService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee by id' })
  @ApiResponse({ status: 200, description: 'Return the employee.', type: Employee })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.employeesService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({ status: 200, description: 'The employee has been successfully updated.', type: Employee })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.employeesService.update(id, updateEmployeeDto, tenant.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an employee' })
  @ApiResponse({ status: 200, description: 'The employee has been successfully deleted.' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.employeesService.remove(id, tenant.id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get an employee by user id' })
  @ApiResponse({ status: 200, description: 'Return the employee.', type: Employee })
  findByUserId(@Param('userId') userId: string, @CurrentTenant() tenant: Tenant) {
    return this.employeesService.findByUserId(userId, tenant.id);
  }
} 