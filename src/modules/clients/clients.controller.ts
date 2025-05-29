import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Client } from './entities/client.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentTenant } from '../tenants/decorators/tenant.decorator';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'The client has been successfully created.', type: Client })
  create(@Body() createClientDto: CreateClientDto, @CurrentTenant() tenant: Tenant) {
    return this.clientsService.create(createClientDto, tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiResponse({ status: 200, description: 'Return all clients.', type: [Client] })
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.clientsService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by id' })
  @ApiResponse({ status: 200, description: 'Return the client.', type: Client })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.clientsService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, description: 'The client has been successfully updated.', type: Client })
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.clientsService.update(id, updateClientDto, tenant.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client' })
  @ApiResponse({ status: 200, description: 'The client has been successfully deleted.' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.clientsService.remove(id, tenant.id);
  }
} 