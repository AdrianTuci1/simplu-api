import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfo } from './business-info.service';

@ApiTags('business-info')
@Controller('business-info')
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

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
