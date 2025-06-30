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
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

interface CreatePackageDto {
  name: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  services: string[];
  active: boolean;
}

interface UpdatePackageDto {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  duration?: number;
  services?: string[];
  active?: boolean;
}

@ApiTags('Packages')
@Controller('packages')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get dental packages' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDentalPackages(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.packagesService.getPackages({
      tenantId,
      locationId,
      page: Number(page),
      limit: Number(limit),
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create dental package' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createDentalPackage(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createPackageDto: any,
  ) {
    return this.packagesService.createPackage(createPackageDto, tenantId, locationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dental package by ID' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDentalPackage(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.packagesService.getPackage(id, tenantId, locationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dental package' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async updateDentalPackage(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
    @Body() updatePackageDto: any,
  ) {
    return this.packagesService.updatePackage(id, updatePackageDto, tenantId, locationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dental package' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async deleteDentalPackage(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Param('id') id: string,
  ) {
    return this.packagesService.deletePackage(id, tenantId, locationId);
  }
} 