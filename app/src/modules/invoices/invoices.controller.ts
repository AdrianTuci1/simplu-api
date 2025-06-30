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
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

interface CreateInvoiceDto {
  clientId: string;
  items: Array<{
    serviceId: string;
    quantity: number;
    price: number;
    description: string;
  }>;
  totalAmount: number;
  dueDate: string;
  notes?: string;
}

interface UpdateInvoiceDto {
  status?: string;
  totalAmount?: number;
  dueDate?: string;
  notes?: string;
}

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get invoices for a specific day' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getInvoices(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('date') date: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.invoicesService.getInvoices({
      tenantId,
      locationId,
      date,
      status,
      clientId,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createInvoice(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createInvoiceDto: any,
  ) {
    return this.invoicesService.createInvoice(createInvoiceDto, tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getInvoice(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.getInvoice(id, tenantId, locationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async updateInvoice(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
    @Body() updateInvoiceDto: any,
  ) {
    return this.invoicesService.updateInvoice(id, updateInvoiceDto, tenantId, locationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async deleteInvoice(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.deleteInvoice(id, tenantId, locationId);
  }
} 