import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Headers,
  Param,
  Put,
  Delete
} from '@nestjs/common';
import { BusinessClientsService, CreateClientDto, UpdateClientDto, DentalClientFilters } from './business-clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

@ApiTags('Business Clients')
@Controller('business-clients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BusinessClientsController {
  constructor(private readonly businessClientsService: BusinessClientsService) {}

  @Get('dental/clients')
  @ApiOperation({ summary: 'Get dental clients' })
  @ApiResponse({ status: 200, description: 'Dental clients retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDentalClients(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.businessClientsService.getDentalClients(tenantId, locationId, {
      search,
      status,
      dateFrom,
      dateTo,
    });
  }

  @Post('dental/clients')
  @ApiOperation({ summary: 'Create dental client' })
  @ApiResponse({ status: 201, description: 'Dental client created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createDentalClient(
    @Body() createClientDto: CreateClientDto,
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.businessClientsService.createDentalClient(createClientDto, tenantId, locationId);
  }

  @Get('dental/clients/:id')
  @ApiOperation({ summary: 'Get dental client by ID' })
  @ApiResponse({ status: 200, description: 'Dental client retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDentalClient(
    @Param('id') id: string,
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.businessClientsService.getDentalClient(id, tenantId, locationId);
  }

  @Put('dental/clients/:id')
  @ApiOperation({ summary: 'Update dental client' })
  @ApiResponse({ status: 200, description: 'Dental client updated successfully' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async updateDentalClient(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.businessClientsService.updateDentalClient(id, updateClientDto, tenantId, locationId);
  }

  @Delete('dental/clients/:id')
  @ApiOperation({ summary: 'Delete dental client' })
  @ApiResponse({ status: 200, description: 'Dental client deleted successfully' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async deleteDentalClient(
    @Param('id') id: string,
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.businessClientsService.deleteDentalClient(id, tenantId, locationId);
  }
} 