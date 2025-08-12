import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, Query, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { BusinessService } from './business.service';
import { BusinessEntity } from './entities/business.entity';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard)
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  async list(@Req() req: any): Promise<BusinessEntity[]> {
    const user = req.user;
    return this.businessService.listBusinessesForUser(user.userId, user.email);
  }

  // Step 1: Configuration - Create business with suspended status
  @Post('configure')
  async configureBusiness(@Req() req: any, @Body() body: any): Promise<BusinessEntity> {
    const user = req.user;
    return this.businessService.configureBusiness(body, user);
  }

  // Step 2: Payment - Create subscription for configured business
  @Post(':id/payment')
  async setupPayment(
    @Req() req: any,
    @Param('id') businessId: string,
    @Body() body: { subscriptionType: 'solo' | 'enterprise'; planKey?: 'basic' | 'premium'; billingInterval?: 'month' | 'year'; currency?: string }
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

  // Legacy activation endpoint - now redirects to launch
  @Post(':id/activate')
  async activate(@Param('id') id: string, @Body() body: { subscriptionType: 'solo' | 'enterprise' }): Promise<BusinessEntity> {
    return this.businessService.activateAfterPayment(id, body.subscriptionType || 'solo');
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
}

