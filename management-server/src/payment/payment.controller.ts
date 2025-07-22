import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() event: any) {
    try {
      // Handle different webhook events
      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Handle successful payment
          break;
        case 'invoice.payment_failed':
          // Handle failed payment
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          break;
        default:
          // Handle other events
          break;
      }

      return { received: true };
    } catch (error) {
      throw new HttpException('Webhook processing failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('subscription/:id')
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved' })
  async getSubscription(@Param('id') id: string) {
    try {
      return await this.paymentService.getSubscription(id);
    } catch (error) {
      throw new HttpException('Failed to get subscription', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('subscription/:id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  async cancelSubscription(@Param('id') id: string) {
    try {
      return await this.paymentService.cancelSubscription(id);
    } catch (error) {
      throw new HttpException('Failed to cancel subscription', HttpStatus.BAD_REQUEST);
    }
  }
} 