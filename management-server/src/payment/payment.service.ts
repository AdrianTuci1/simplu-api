import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStoreService } from './subscription-store.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionStore: SubscriptionStoreService,
    private readonly businessService: BusinessService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    this.stripe = new Stripe(key, { apiVersion: '2024-04-10' });
  }

  async ensureCustomer(userId: string, email: string): Promise<string> {
    const existing = await this.subscriptionStore.getStripeCustomerForUser(userId);
    if (existing) return existing;
    const customer = await this.stripe.customers.create({ email, metadata: { userId } });
    await this.subscriptionStore.setStripeCustomerForUser(userId, customer.id);
    return customer.id;
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  }

  private async resolvePriceId(options: { 
    priceId?: string; 
    planKey?: 'basic' | 'premium'; 
    productId?: string; 
    billingInterval?: 'month' | 'year'; 
    currency?: string;
  }): Promise<string> {
    if (options.priceId) return options.priceId;

    const { planKey, productId, billingInterval, currency } = options;
    const targetCurrency = (currency || 'ron').toLowerCase();

    // If productId provided, derive price by interval
    const effectiveProductId = productId || (planKey ? this.configService.get<string>(`STRIPE_${planKey.toUpperCase()}_PRODUCT_ID`) : undefined);

    if (!effectiveProductId || !billingInterval) {
      throw new BadRequestException('Provide either priceId or { productId | planKey, billingInterval }');
    }

    // Fetch prices for the product and match interval + currency
    const prices = await this.stripe.prices.list({ product: effectiveProductId, active: true, limit: 100 });
    const match = prices.data.find(p => (p.recurring?.interval === billingInterval) && (p.currency?.toLowerCase() === targetCurrency));
    if (!match) {
      // fallback: ignore currency filter
      const alt = prices.data.find(p => p.recurring?.interval === billingInterval);
      if (alt) return alt.id;
      throw new BadRequestException(`No price found for product ${effectiveProductId} with interval ${billingInterval}`);
    }
    return match.id;
  }

  async createOrReplaceSubscription(params: { businessId: string; userId: string; userEmail: string; priceId?: string; planKey?: 'basic' | 'premium'; productId?: string; billingInterval?: 'month' | 'year'; currency?: string; cancelPrevious?: boolean; }): Promise<{ subscriptionId: string; status: string; clientSecret?: string; }>{
    const customerId = await this.ensureCustomer(params.userId, params.userEmail);
    const priceId = await this.resolvePriceId({ priceId: params.priceId, planKey: params.planKey, productId: params.productId, billingInterval: params.billingInterval, currency: params.currency });

    const existing = await this.subscriptionStore.getSubscriptionForBusiness(params.businessId);

    if (existing && params.cancelPrevious) {
      await this.stripe.subscriptions.cancel(existing.subscriptionId);
      await this.subscriptionStore.removeSubscriptionForBusiness(params.businessId);
    }

    const sub = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    const paymentIntent = (sub.latest_invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;
    await this.subscriptionStore.setSubscriptionForBusiness(params.businessId, {
      businessId: params.businessId,
      subscriptionId: sub.id,
      customerId,
      priceId: priceId,
      status: sub.status,
    });

    // Activate business optimistically after status becomes active, the frontend should confirm PI
    if (sub.status === 'active' || sub.status === 'trialing') {
      await this.businessService.activateAfterPayment(params.businessId, 'solo');
    }

    return { subscriptionId: sub.id, status: sub.status, clientSecret: paymentIntent?.client_secret || undefined };
  }

  async listInvoices(userId: string, userEmail: string) {
    const customerId = await this.ensureCustomer(userId, userEmail);
    const invoices = await this.stripe.invoices.list({ customer: customerId, limit: 50 });
    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      total: inv.total,
      currency: inv.currency,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
      created: new Date(inv.created * 1000).toISOString(),
      dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
    }));
  }

  async createCreditsPaymentIntent(userId: string, userEmail: string, amountMinor: number): Promise<{ clientSecret: string; }>{
    if (amountMinor <= 0) throw new BadRequestException('Amount must be > 0');
    const customerId = await this.ensureCustomer(userId, userEmail);
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountMinor,
      currency: 'ron',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: paymentIntent.client_secret as string };
  }

  async refreshSubscriptionStatus(businessId: string): Promise<{ businessId: string; subscriptionId?: string; status: string }>{
    const mapping = await this.subscriptionStore.getSubscriptionForBusiness(businessId);
    if (!mapping) return { businessId, status: 'none' };
    const sub = await this.stripe.subscriptions.retrieve(mapping.subscriptionId);
    await this.subscriptionStore.setSubscriptionForBusiness(businessId, {
      ...mapping,
      status: sub.status,
      priceId: (sub.items.data[0]?.price?.id as string) || mapping.priceId,
    });
    if (sub.status === 'active' || sub.status === 'trialing') {
      await this.businessService.activateAfterPayment(businessId, 'solo');
    }
    return { businessId, subscriptionId: sub.id, status: sub.status };
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }
}

