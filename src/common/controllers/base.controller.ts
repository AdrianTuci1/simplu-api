import { Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BaseService } from '../services/base.service';
import { BaseEntity } from '../entities/base.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { CurrentTenant } from '../../modules/tenants/decorators/tenant.decorator';
import { TenantGuard } from '../../modules/tenants/guards/tenant.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
export abstract class BaseController<T extends BaseEntity> {
  constructor(protected readonly service: BaseService<T>) {}

  @Post()
  create(@Body() createDto: any, @CurrentTenant() tenant: Tenant) {
    return this.service.create(createDto, tenant);
  }

  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.service.findAll(tenant);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.service.findOne(id, tenant);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.service.update(id, updateDto, tenant);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.service.remove(id, tenant);
  }
} 