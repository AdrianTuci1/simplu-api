import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfo } from './business-info.service';
import { BusinessSearchResultDto } from './dto/business-search.dto';

@ApiTags('business-info')
@Controller('business-info')
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  @Get('search')
  @ApiOperation({ 
    summary: 'Search businesses', 
    description: 'Search businesses by company name or domain label. Returns only essential fields.' 
  })
  @ApiQuery({ name: 'q', description: 'Search term', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results', 
    type: [BusinessSearchResultDto] 
  })
  async searchBusinesses(
    @Query('q') searchTerm: string,
  ): Promise<BusinessSearchResultDto[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }
    return this.businessInfoService.searchBusinesses(searchTerm.trim());
  }

  @Get(':businessId')
  @ApiOperation({ summary: 'Get business information by ID' })
  @ApiResponse({
    status: 200,
    description: 'Business information retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getBusinessInfo(
    @Param('businessId') businessId: string,
  ): Promise<BusinessInfo> {
    const businessInfo =
      await this.businessInfoService.getBusinessInfo(businessId);

    if (!businessInfo) {
      throw new NotFoundException('Business not found');
    }

    return businessInfo;
  }
}
