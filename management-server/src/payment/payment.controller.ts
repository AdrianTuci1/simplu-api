import { Body, Controller, Get, Param, Post, UseGuards, Req, Headers, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('plans')
  async getAvailablePlans() {
    return this.paymentService.getAvailablePlans();
  }

  @Get('plans/:planKey/prices')
  async getPlanPrices(@Param('planKey') planKey: 'basic' | 'premium') {
    return this.paymentService.getPlanPrices(planKey);
  }

  @Get('plans/:planKey/price')
  async getPriceByPlanAndInterval(
    @Param('planKey') planKey: 'basic' | 'premium',
    @Query('interval') interval: 'month' | 'year',
    @Query('currency') currency: string = 'ron'
  ) {
    return this.paymentService.getPriceByPlanAndInterval(planKey, interval, currency);
  }

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

  @Post('business/:id/pay-with-saved-card')
  async payWithSavedCard(
    @Req() req: any,
    @Param('id') businessId: string,
    @Body() body: { 
      paymentMethodId: string; 
      planKey?: 'basic' | 'premium'; 
      billingInterval?: 'month' | 'year'; 
      currency?: string;
      priceId?: string; // Opțional: dacă se specifică, ignoră planKey și billingInterval
    }
  ) {
    const user = req.user;
    return this.paymentService.payWithSavedCard({
      businessId,
      userId: user.userId,
      userEmail: user.email,
      paymentMethodId: body.paymentMethodId,
      planKey: body.planKey || 'basic',
      billingInterval: body.billingInterval || 'month',
      currency: body.currency || 'ron',
      priceId: body.priceId,
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

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  // Stripe webhook endpoint - no auth required
  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() payload: any
  ) {
    return this.paymentService.handleStripeWebhook(signature, payload);
  }
}

