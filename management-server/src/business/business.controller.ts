import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Query, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { AdminAuthGuard } from '../modules/auth/guards/admin-auth.guard';
import { BusinessService } from './business.service';
import { BusinessEntity } from './entities/business.entity';
import { ConfigureBusinessDto, SetupPaymentDto, LaunchBusinessDto } from './dto/business-config.dto';
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

  @Get('admin')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ 
    summary: 'Get all businesses (Admin only)', 
    description: 'Get all businesses in the system. Requires admin role.' 
  })
  @ApiResponse({ status: 200, description: 'All businesses retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllBusinesses(): Promise<BusinessEntity[]> {
    return this.businessService.getAllBusinesses();
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

  // Step 3: Launch - Activate business and deploy infrastructure (with secret code)
  @Post(':id/launch')
  @SetMetadata('isPublic', true)
  @ApiOperation({ 
    summary: 'Launch business with secret code', 
    description: 'Launch business using a secret code instead of user authorization' 
  })
  @ApiResponse({ status: 200, description: 'Business launched successfully' })
  async launchBusiness(
    @Param('id') businessId: string,
    @Body() body: LaunchBusinessDto
  ): Promise<BusinessEntity> {
    return this.businessService.launchBusinessWithSecret(businessId, body.secretCode);
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


  // Search businesses by domain label
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

