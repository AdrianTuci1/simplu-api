import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Headers,
  Get,
  Query,
  Param
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

interface GenerateReportDto {
  type: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  includeCharts: boolean;
  filters?: {
    paymentMethod?: string;
    employeeId?: string;
  };
}

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getReports(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getReports({
      tenantId,
      locationId,
      page: Number(page),
      limit: Number(limit),
      type,
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Generate report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async generateReport(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @CurrentUser() user: any,
    @Body() generateReportDto: any,
  ) {
    return this.reportsService.generateReport(generateReportDto, tenantId, user.id, locationId);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available report types' })
  @ApiResponse({ status: 200, description: 'Report types retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getAvailableReportTypes(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
  ) {
    return this.reportsService.getAvailableReportTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getReport(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.getReport(id, tenantId, locationId);
  }
} 