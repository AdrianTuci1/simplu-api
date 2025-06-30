import { Controller, Get, Headers, NotFoundException } from '@nestjs/common';
import { PublicSiteService } from './public-site.service';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('public-site')
@Controller('business-info')
export class PublicSiteController {
  constructor(private readonly publicSiteService: PublicSiteService) {}

  @Get()
  @ApiOperation({ summary: 'Get business information' })
  @ApiResponse({ status: 200, description: 'Business information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  async getBusinessInfo(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new NotFoundException('Tenant ID is required');
    }
    
    const businessInfo = await this.publicSiteService.getBusinessInfo(tenantId);
    if (!businessInfo) {
      throw new NotFoundException('Business not found');
    }
    
    return businessInfo;
  }
} 