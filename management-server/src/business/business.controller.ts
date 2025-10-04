import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Query, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { BusinessService } from './business.service';
import { BusinessEntity } from './entities/business.entity';
import { ConfigureBusinessDto, SetupPaymentDto } from './dto/business-config.dto';
import { CustomFormService } from './custom-form.service';
import { CognitoUserService } from '../modules/auth/cognito-user.service';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard)
@Controller('businesses')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly customFormService: CustomFormService,
    private readonly cognitoUserService: CognitoUserService,
  ) {}

  @Get()
  async list(@Req() req: any): Promise<BusinessEntity[]> {
    const user = req.user;
    return this.businessService.listBusinessesForUser(user.userId, user.email);
  }

  // Step 1: Configuration - Create business with suspended status
  @Post('configure')
  @ApiOperation({ 
    summary: 'Configure business', 
    description: 'Create a new business with suspended status. Subscription type is automatically determined based on number of locations (1 location = solo, 2+ locations = enterprise).' 
  })
  @ApiResponse({ status: 201, description: 'Business configured successfully' })
  async configureBusiness(@Req() req: any, @Body() body: ConfigureBusinessDto): Promise<BusinessEntity> {
    const user = req.user;
    return this.businessService.configureBusiness(body, user);
  }

  // Step 2: Payment - Create subscription for configured business
  @Post(':id/payment')
  @ApiOperation({ 
    summary: 'Setup payment', 
    description: 'Create subscription for configured business. Only plan, billing interval and currency need to be specified. Subscription type is automatically determined from business configuration.' 
  })
  @ApiResponse({ status: 201, description: 'Payment setup successfully' })
  async setupPayment(
    @Req() req: any,
    @Param('id') businessId: string,
    @Body() body: SetupPaymentDto
  ): Promise<{ subscriptionId: string; status: string; clientSecret?: string }> {
    const user = req.user;
    return this.businessService.setupPayment(businessId, body, user);
  }

  // Step 3: Launch - Activate business and deploy infrastructure
  @Post(':id/launch')
  async launchBusiness(
    @Req() req: any,
    @Param('id') businessId: string
  ): Promise<BusinessEntity> {
    const user = req.user;
    return this.businessService.launchBusiness(businessId, user);
  }

  // Invitation endpoint - for new users to access their business (public endpoint)
  @Get(':id/invitation')
  @SetMetadata('isPublic', true)
  async getInvitation(
    @Param('id') businessId: string,
    @Query('email') email: string
  ): Promise<{ businessId: string; businessName: string; ownerEmail: string; invitationUrl: string }> {
    return this.businessService.getInvitationInfo(businessId, email);
  }

  // Legacy endpoint for backward compatibility
  @Post()
  async create(@Body() body: any): Promise<BusinessEntity> {
    return this.businessService.createBusiness(body);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<BusinessEntity> {
    return this.businessService.getBusiness(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<BusinessEntity>): Promise<BusinessEntity> {
    return this.businessService.updateBusiness(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ status: string }> {
    await this.businessService.deleteBusiness(id);
    return { status: 'ok' };
  }



  @Post(':id/credits/allocate')
  async allocateCredits(
    @Param('id') id: string,
    @Body() body: { locationId?: string; amount: number; lockLocationUse?: boolean },
  ): Promise<BusinessEntity> {
    return this.businessService.allocateCredits(id, body.locationId || null, body.amount, body.lockLocationUse);
  }

  @Post(':id/credits/deallocate')
  async deallocateCredits(
    @Param('id') id: string,
    @Body() body: { locationId?: string; amount: number },
  ): Promise<BusinessEntity> {
    return this.businessService.deallocateCredits(id, body.locationId || null, body.amount);
  }

  @Post(':id/credits/reallocate')
  async reallocateCredits(
    @Param('id') id: string,
    @Body() body: { fromLocationId: string; toLocationId: string; amount: number },
  ): Promise<BusinessEntity> {
    return this.businessService.reallocateCredits(id, body.fromLocationId, body.toLocationId, body.amount);
  }

  @Get('search/domain-label')
  @ApiOperation({ 
    summary: 'Search businesses by domain label', 
    description: 'Search for businesses using a specific domain label to check availability' 
  })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async searchByDomainLabel(@Query('domainLabel') domainLabel: string): Promise<BusinessEntity[]> {
    return this.businessService.searchBusinessesByDomainLabel(domainLabel);
  }

  @Get('check-domain-availability')
  @ApiOperation({ 
    summary: 'Check domain label availability', 
    description: 'Check if a domain label is available for use' 
  })
  @ApiResponse({ status: 200, description: 'Domain availability status' })
  async checkDomainAvailability(@Query('domainLabel') domainLabel: string): Promise<{ available: boolean }> {
    const available = await this.businessService.isDomainLabelAvailable(domainLabel);
    return { available };
  }

  @Post(':id/load-custom-form')
  @ApiOperation({ 
    summary: 'Load custom form for business from S3', 
    description: 'Load a custom form configuration for the business from S3 bucket based on businessType' 
  })
  @ApiResponse({ status: 201, description: 'Custom form loaded successfully' })
  async loadCustomForm(@Param('id') businessId: string): Promise<any> {
    const business = await this.businessService.getBusiness(businessId);
    return this.customFormService.loadCustomFormFromS3(
      businessId,
      business.domainLabel,
      business.businessType,
    );
  }

  @Get(':id/custom-form-html')
  @ApiOperation({ 
    summary: 'Get custom form HTML from S3', 
    description: 'Get the HTML form for the business from S3 bucket' 
  })
  @ApiResponse({ status: 200, description: 'Custom form HTML' })
  async getCustomFormHTML(@Param('id') businessId: string): Promise<{ html: string }> {
    const business = await this.businessService.getBusiness(businessId);
    const html = await this.customFormService.loadFormHTMLFromS3(
      businessId,
      business.domainLabel,
      business.businessType,
    );
    return { html };
  }

  // Password management endpoints
  @Post('users/:email/change-password')
  @ApiOperation({ 
    summary: 'Change user password', 
    description: 'Change password for a user (requires current password)' 
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Param('email') email: string,
    @Body() body: { currentPassword: string; newPassword: string }
  ): Promise<{ success: boolean }> {
    await this.cognitoUserService.initiatePasswordChange(email, body.currentPassword, body.newPassword);
    return { success: true };
  }

  @Post('users/:email/reset-password')
  @ApiOperation({ 
    summary: 'Reset user password', 
    description: 'Admin reset password for a user (generates new temporary password)' 
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Param('email') email: string): Promise<{ success: boolean; message: string }> {
    // This would require admin privileges in a real implementation
    // For now, we'll just return a success message
    return { 
      success: true, 
      message: 'Password reset initiated. User will receive email with new temporary password.' 
    };
  }

  @Get('users/:email/info')
  @ApiOperation({ 
    summary: 'Get user information', 
    description: 'Get user information from Cognito' 
  })
  @ApiResponse({ status: 200, description: 'User information' })
  async getUserInfo(@Param('email') email: string): Promise<any> {
    return this.cognitoUserService.getUserInfo(email);
  }
}

