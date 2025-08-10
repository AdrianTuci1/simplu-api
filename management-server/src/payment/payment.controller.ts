import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('business/:id/subscription')
  async createSubscription(
    @Req() req: any,
    @Param('id') businessId: string,
    @Body() body: { priceId?: string; planKey?: 'basic' | 'premium'; productId?: string; billingInterval?: 'month' | 'year'; currency?: string; cancelPrevious?: boolean }
  ) {
    const user = req.user;
    return this.paymentService.createOrReplaceSubscription({
      businessId,
      userId: user.userId,
      userEmail: user.email,
      priceId: body.priceId,
      planKey: body.planKey,
      productId: body.productId,
      billingInterval: body.billingInterval,
      currency: body.currency,
      cancelPrevious: body.cancelPrevious,
    });
  }

  @Get('invoices')
  async listInvoices(@Req() req: any) {
    const user = req.user;
    return this.paymentService.listInvoices(user.userId, user.email);
  }

  @Post('credits/payment-intent')
  async createCreditsPaymentIntent(@Req() req: any, @Body() body: { amountMinor: number }) {
    const user = req.user;
    return this.paymentService.createCreditsPaymentIntent(user.userId, user.email, body.amountMinor);
  }

  @Get('business/:id/subscription/status')
  async refreshSubscriptionStatus(@Param('id') businessId: string) {
    return this.paymentService.refreshSubscriptionStatus(businessId);
  }
}

