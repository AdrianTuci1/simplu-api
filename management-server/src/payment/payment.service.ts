import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { SubscriptionStoreService } from './subscription-store.service';
import { v4 as uuidv4 } from 'uuid';
import { BusinessSubscriptionEntity } from './entities/business-subscription.entity';
import { DatabaseService } from '../database/database.service';
import { BusinessEntity } from '../business/entities/business.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly subscriptionStore: SubscriptionStoreService,
    private readonly databaseService: DatabaseService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
  }

  async createCustomer(
    email: string, 
    name: string, 
    address?: {
      line1: string;
      city: string;
      state?: string;
      country: string;
      postal_code?: string;
    }
  ): Promise<Stripe.Customer> {
    try {
      const customerData: Stripe.CustomerCreateParams = {
        email,
        name,
        metadata: {
          source: 'management-server',
        },
      };

      // Add address if provided
      if (address) {
        customerData.address = address;
      }

      const customer = await this.stripe.customers.create(customerData);

      this.logger.log(`Stripe customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Error creating Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async ensureStripeCustomerForUser(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    // Try to read existing user with stripeCustomerId
    const user = await this.usersService.getOrCreateUser(userId, email, name);
    if (user.stripeCustomerId) {
      return this.getCustomer(user.stripeCustomerId);
    }
    const customer = await this.createCustomer(email, name || email);
    await this.usersService.updateUser(userId, { stripeCustomerId: customer.id });
    return customer;
  }

  async createBusinessSubscription(
    payerUser: { userId: string; email: string; name?: string },
    business: BusinessEntity,
    priceId: string,
    cancelPrevious: boolean = true,
  ) {
    const customer = await this.ensureStripeCustomerForUser(payerUser.userId, payerUser.email, payerUser.name);

    // Optionally cancel previous active subscription for this business
    const existingSubs = await this.subscriptionStore.listByBusiness(business.businessId);
    const activeSub = existingSubs.find((s) => s.status === 'active' || s.status === 'trialing' || s.status === 'incomplete');
    if (cancelPrevious && activeSub?.stripeSubscriptionId) {
      try {
        await this.cancelSubscription(activeSub.stripeSubscriptionId);
        await this.subscriptionStore.update(activeSub.id, { status: 'canceled', updatedAt: new Date().toISOString() });
      } catch (e) {
        this.logger.warn(`Failed to cancel previous subscription ${activeSub.stripeSubscriptionId}: ${e?.message}`);
      }
    }

    const subscription = await this.createSubscription(customer.id, priceId);

    // Persist subscription mapping
    const record: BusinessSubscriptionEntity = {
      id: subscription.id, // use Stripe subscription id as PK
      businessId: business.businessId,
      payerUserId: payerUser.userId,
      priceId,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status as any,
      nextPaymentDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.subscriptionStore.put(record);

    // Reflect minimal payment status on business for filtering
    await this.databaseService.updateBusiness(business.businessId, {
      paymentStatus: subscription.status as any,
      nextPaymentDate: record.nextPaymentDate,
      status: subscription.status === 'active' ? 'active' : (business.status || 'suspended'),
      updatedAt: new Date().toISOString(),
    });

    // Extract client secret if present
    let clientSecret: string | undefined;
    if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent.client_secret || undefined;
      }
    }

    return {
      subscription,
      customer,
      clientSecret,
      client_secret: clientSecret,
      record,
    };
  }

  async getSubscriptionsForBusiness(businessId: string): Promise<BusinessSubscriptionEntity[]> {
    return this.subscriptionStore.listByBusiness(businessId);
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.log(`Stripe subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error creating Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Stripe subscription canceled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error canceling Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error(`Error retrieving Stripe subscription: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, currency: string, customerId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Error retrieving Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async updateCustomer(customerId: string, updates: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, updates);
      this.logger.log(`Customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Error updating Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async createInvoice(customerId: string, amount: number, currency: string, description: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        currency,
        description,
        auto_advance: false,
        collection_method: 'send_invoice',
        due_date: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      });

      // Add invoice item for the amount
      await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: amount,
        currency: currency,
        description: description,
        invoice: invoice.id,
      });

      this.logger.log(`Invoice created: ${invoice.id}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Error creating invoice: ${error.message}`);
      throw error;
    }
  }

  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all', // Include all statuses (active, inactive, canceled, etc.)
        expand: ['data.latest_invoice', 'data.items.data.price'],
      });

      this.logger.log(`Retrieved ${subscriptions.data.length} subscriptions for customer: ${customerId}`);
      return subscriptions.data;
    } catch (error) {
      this.logger.error(`Error retrieving customer subscriptions: ${error.message}`);
      throw error;
    }
  }

  async getActiveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        expand: ['data.latest_invoice', 'data.items.data.price'],
      });

      this.logger.log(`Retrieved ${subscriptions.data.length} active subscriptions for customer: ${customerId}`);
      return subscriptions.data;
    } catch (error) {
      this.logger.error(`Error retrieving active subscriptions: ${error.message}`);
      throw error;
    }
  }

  async getAvailableSubscriptionPlans(): Promise<any[]> {
    try {
      // Get all products from Stripe
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      // Get all prices for subscription plans
      const prices = await this.stripe.prices.list({
        active: true,
        type: 'recurring',
        expand: ['data.product'],
      });

      // Combine and format the subscription plans
      const subscriptionPlans = prices.data.map(price => {
        const product = typeof price.product === 'object' && price.product && 'name' in price.product ? price.product : null;
        return {
          priceId: price.id,
          productId: typeof price.product === 'string' ? price.product : product?.id || '',
          productName: product?.name || '',
          description: product?.description || '',
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
          intervalCount: price.recurring?.interval_count,
          nickname: price.nickname,
          metadata: product?.metadata || {},
          features: product?.metadata?.features?.split(',') || [],
        };
      });

      this.logger.log(`Retrieved ${subscriptionPlans.length} subscription plans`);
      return subscriptionPlans;
    } catch (error) {
      this.logger.error(`Error retrieving subscription plans: ${error.message}`);
      throw error;
    }
  }

  async getSubscriptionPlansByCategory(): Promise<any> {
    try {
      const plans = await this.getAvailableSubscriptionPlans();
      
      // Group plans by category (basic, premium) based on metadata or name
      const categorizedPlans = {
        basic: plans.filter(plan => 
          plan.nickname?.toLowerCase().includes('basic') || 
          plan.productName?.toLowerCase().includes('basic') ||
          plan.metadata?.category === 'basic'
        ),
        premium: plans.filter(plan => 
          plan.nickname?.toLowerCase().includes('premium') || 
          plan.productName?.toLowerCase().includes('premium') ||
          plan.metadata?.category === 'premium'
        ),
        other: plans.filter(plan => 
          !plan.nickname?.toLowerCase().includes('basic') &&
          !plan.nickname?.toLowerCase().includes('premium') &&
          !plan.productName?.toLowerCase().includes('basic') &&
          !plan.productName?.toLowerCase().includes('premium') &&
          !['basic', 'premium'].includes(plan.metadata?.category)
        )
      };

      return categorizedPlans;
    } catch (error) {
      this.logger.error(`Error categorizing subscription plans: ${error.message}`);
      throw error;
    }
  }

  async getSubscriptionPlanByPriceId(priceId: string): Promise<any> {
    try {
      const price = await this.stripe.prices.retrieve(priceId, {
        expand: ['product'],
      });

      const product = typeof price.product === 'object' && price.product && 'name' in price.product ? price.product : null;
      
      return {
        priceId: price.id,
        productId: typeof price.product === 'string' ? price.product : product?.id || '',
        productName: product?.name || '',
        description: product?.description || '',
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
        nickname: price.nickname,
        metadata: product?.metadata || {},
        features: product?.metadata?.features?.split(',') || [],
      };
    } catch (error) {
      this.logger.error(`Error retrieving subscription plan by price ID: ${error.message}`);
      throw error;
    }
  }

  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Payment succeeded for invoice: ${invoice.id}`);
      
      if (invoice.subscription && typeof invoice.subscription === 'string') {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
        await this.handleSubscriptionPaymentSuccess(subscription);
      }
    } catch (error) {
      this.logger.error(`Error handling payment succeeded: ${error.message}`);
    }
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Payment failed for invoice: ${invoice.id}`);
      
      if (invoice.subscription && typeof invoice.subscription === 'string') {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
        await this.handleSubscriptionPaymentFailure(subscription);
      }
    } catch (error) {
      this.logger.error(`Error handling payment failed: ${error.message}`);
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      this.logger.log(`Subscription deleted: ${subscription.id}`);
      await this.updateBusinessForSubscriptionChange(subscription, 'canceled');
    } catch (error) {
      this.logger.error(`Error handling subscription deleted: ${error.message}`);
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      this.logger.log(`Subscription updated: ${subscription.id}`);
      await this.updateBusinessForSubscriptionChange(subscription, subscription.status as any);
    } catch (error) {
      this.logger.error(`Error handling subscription updated: ${error.message}`);
    }
  }

  private async handleSubscriptionPaymentSuccess(subscription: Stripe.Subscription): Promise<void> {
    if (subscription.status === 'active') {
      await this.createInfrastructureForSubscription(subscription);
    }
  }

  private async handleSubscriptionPaymentFailure(subscription: Stripe.Subscription): Promise<void> {
    await this.updateBusinessForSubscriptionChange(subscription, 'past_due');
  }

  private async createInfrastructureForSubscription(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Locate business by subscription mapping
      const mapping = await this.subscriptionStore.getById(subscription.id);
      if (!mapping) {
        this.logger.warn(`No subscription mapping found for ${subscription.id}`);
        return;
      }
      const business = await this.databaseService.getBusiness(mapping.businessId);
      if (!business) return;
      // TODO: trigger infrastructure creation asynchronously (queue/event)
      this.logger.log(`Subscription ${subscription.id} active for business ${business.businessId} - infrastructure creation required`);
    } catch (error) {
      this.logger.error(`Error processing infrastructure creation for subscription: ${error.message}`);
    }
  }

  async createSubscriptionForCustomer(
    priceId: string,
    customerEmail: string,
    customerName: string,
    currency: string = 'usd',
    existingCustomerId?: string
  ): Promise<{
    subscription: Stripe.Subscription;
    customer: Stripe.Customer;
    clientSecret?: string;
    client_secret?: string;
  }> {
    try {
      let customer: Stripe.Customer;

      // Create or use existing customer
      if (existingCustomerId) {
        customer = await this.getCustomer(existingCustomerId);
        this.logger.log(`Using existing customer: ${existingCustomerId}`);
      } else {
        customer = await this.createCustomer(customerEmail, customerName);
        this.logger.log(`Created new customer: ${customer.id}`);
      }

      // Create subscription
      const subscription = await this.createSubscription(customer.id, priceId);
      
      this.logger.log(`Created subscription ${subscription.id} for customer ${customer.id}`);

      // Extract client secret from payment intent if available
      let clientSecret: string | undefined;
      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const invoice = subscription.latest_invoice as Stripe.Invoice;
        if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          clientSecret = paymentIntent.client_secret || undefined;
        }
      }

      return {
        subscription,
        customer,
        clientSecret,
        client_secret: clientSecret, // Pentru compatibilitate cu frontend
      };
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }

  async createSubscriptionValidationPayment(
    customerId?: string,
    subscriptionId?: string,
    amount?: number,
    currency: string = 'usd',
    email?: string,
    name?: string
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    clientSecret: string;
    customer: Stripe.Customer;
    subscriptionInfo?: Stripe.Subscription;
  }> {
    try {
      let customer: Stripe.Customer;
      let subscription: Stripe.Subscription | undefined;

      // Handle customer creation or retrieval
      if (customerId) {
        // Use existing customer
        customer = await this.getCustomer(customerId);
        this.logger.log(`Using existing customer: ${customerId}`);
      } else {
        // Create new customer for first payment
        if (!email || !name) {
          throw new Error('Email and name are required when customerId is not provided');
        }
        customer = await this.createCustomer(email, name);
        this.logger.log(`Created new customer: ${customer.id}`);
      }

      // Handle subscription validation if subscriptionId provided
      if (subscriptionId) {
        subscription = await this.getSubscription(subscriptionId);
        
        // Verify the subscription belongs to the customer
        if (subscription.customer !== customer.id) {
          throw new Error('Subscription does not belong to the specified customer');
        }
      }

      // Calculate amount
      let validationAmount = amount;
      if (!validationAmount) {
        if (subscription && subscription.items.data.length > 0) {
          const priceData = subscription.items.data[0].price;
          validationAmount = priceData.unit_amount || 100; // Default to $1.00 if no price found
        } else {
          validationAmount = 100; // $1.00 for validation
        }
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        validationAmount,
        currency,
        customer.id
      );

      // Add metadata to payment intent
      const metadata: any = {
        type: subscriptionId ? 'subscription_validation' : 'first_payment_validation',
        validation_purpose: 'payment_method_validation',
      };
      
      if (subscriptionId) {
        metadata.subscription_id = subscriptionId;
      }

      await this.stripe.paymentIntents.update(paymentIntent.id, { metadata });

      this.logger.log(`Validation payment intent created for customer ${customer.id}: ${paymentIntent.id}`);

      return {
        paymentIntent,
        clientSecret: paymentIntent.client_secret!,
        customer,
        subscriptionInfo: subscription,
      };
    } catch (error) {
      this.logger.error(`Error creating validation payment: ${error.message}`);
      throw error;
    }
  }

  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      
      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Error retrieving payment methods: ${error.message}`);
      throw error;
    }
  }

  async getCustomerInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: limit,
        status: 'paid',
      });
      
      return invoices.data;
    } catch (error) {
      this.logger.error(`Error retrieving invoices: ${error.message}`);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
      
      this.logger.log(`Payment intent confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Error confirming payment intent: ${error.message}`);
      throw error;
    }
  }

  async setupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
      
      this.logger.log(`Setup intent created: ${setupIntent.id}`);
      return setupIntent;
    } catch (error) {
      this.logger.error(`Error creating setup intent: ${error.message}`);
      throw error;
    }
  }

  private async updateBusinessForSubscriptionChange(subscription: Stripe.Subscription, paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid'): Promise<void> {
    try {
      const mapping = await this.subscriptionStore.getById(subscription.id);
      if (!mapping) {
        this.logger.warn(`No subscription mapping for ${subscription.id}`);
        return;
      }
      await this.subscriptionStore.update(subscription.id, {
        status: subscription.status as any,
        nextPaymentDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
      });
      await this.databaseService.updateBusiness(mapping.businessId, {
        paymentStatus: subscription.status as any,
        nextPaymentDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
        status: subscription.status === 'active' ? 'active' : 'suspended',
        updatedAt: new Date().toISOString(),
      });
      this.logger.log(`Business ${mapping.businessId} updated from subscription ${subscription.id} status ${subscription.status}`);
    } catch (error) {
      this.logger.error(`Error processing business update for subscription change: ${error.message}`);
    }
  }
} 