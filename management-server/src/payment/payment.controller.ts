import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ValidateSubscriptionDto } from './dto/validate-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

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
          await this.paymentService.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.paymentService.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.paymentService.handleSubscriptionDeleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.paymentService.handleSubscriptionUpdated(event.data.object);
          break;
        default:
          // Log unhandled events for debugging
          console.log(`Unhandled webhook event type: ${event.type}`);
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

  @Get('customer/:customerId/subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions for a customer' })
  @ApiResponse({ status: 200, description: 'Customer subscriptions retrieved successfully' })
  async getCustomerSubscriptions(@Param('customerId') customerId: string) {
    try {
      return await this.paymentService.getCustomerSubscriptions(customerId);
    } catch (error) {
      throw new HttpException('Failed to get customer subscriptions', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('customer/:customerId/subscriptions/active')
  @ApiOperation({ summary: 'Get active subscriptions for a customer' })
  @ApiResponse({ status: 200, description: 'Active subscriptions retrieved successfully' })
  async getActiveSubscriptions(@Param('customerId') customerId: string) {
    try {
      return await this.paymentService.getActiveSubscriptions(customerId);
    } catch (error) {
      throw new HttpException('Failed to get active subscriptions', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  async getSubscriptionPlans() {
    try {
      return await this.paymentService.getAvailableSubscriptionPlans();
    } catch (error) {
      throw new HttpException('Failed to get subscription plans', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('plans/categories')
  @ApiOperation({ summary: 'Get subscription plans grouped by category (basic, premium)' })
  @ApiResponse({ status: 200, description: 'Categorized subscription plans retrieved successfully' })
  async getSubscriptionPlansByCategory() {
    try {
      return await this.paymentService.getSubscriptionPlansByCategory();
    } catch (error) {
      throw new HttpException('Failed to get categorized subscription plans', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('plans/:priceId')
  @ApiOperation({ summary: 'Get a specific subscription plan by price ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan retrieved successfully' })
  async getSubscriptionPlanByPriceId(@Param('priceId') priceId: string) {
    try {
      return await this.paymentService.getSubscriptionPlanByPriceId(priceId);
    } catch (error) {
      throw new HttpException('Failed to get subscription plan', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('create-subscription')
  @ApiOperation({ 
    summary: 'Create a new subscription for a customer',
    description: 'Creates a new subscription with the specified price plan. Creates a new customer if customerId is not provided.'
  })
  @ApiResponse({ status: 200, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Subscription creation failed' })
  async createSubscription(@Body() subscriptionData: CreateSubscriptionDto) {
    try {
      return await this.paymentService.createSubscriptionForCustomer(
        subscriptionData.priceId,
        subscriptionData.customerEmail,
        subscriptionData.customerName,
        subscriptionData.currency,
        subscriptionData.customerId
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create subscription', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('validate-subscription')
  @ApiOperation({ 
    summary: 'Initiate payment for subscription validation or first payment',
    description: 'Creates a payment intent for subscription validation. If customerId is not provided, creates a new customer first.'
  })
  @ApiResponse({ status: 200, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Payment creation failed' })
  async validateSubscription(@Body() validationData: ValidateSubscriptionDto) {
    try {
      return await this.paymentService.createSubscriptionValidationPayment(
        validationData.customerId,
        validationData.subscriptionId,
        validationData.amount,
        validationData.currency,
        validationData.email,
        validationData.name
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create validation payment', 
        HttpStatus.BAD_REQUEST
      );
    }
  }
} 