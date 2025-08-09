import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { PaymentService } from '../payment/payment.service';
import { InfrastructureService } from '../infrastructure/infrastructure.service';
import { ShardManagementService } from '../shared/services/shard-management.service';
import { EmailService } from '../shared/services/email.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessEntity, LocationInfo } from './entities/business.entity';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly paymentService: PaymentService,
    private readonly infrastructureService: InfrastructureService,
    private readonly shardManagementService: ShardManagementService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async createBusiness(createBusinessDto: CreateBusinessDto, userEmail: string, createdByUserId: string): Promise<BusinessEntity> {
    try {
      const businessId = uuidv4();
      const now = new Date().toISOString();

      // Determine target email (owner) for activation flow
      const targetEmail = createBusinessDto.configureForEmail?.trim() || userEmail;
      const isConfiguredForSomeoneElse = targetEmail !== userEmail;

      // Determine billing email for Stripe (can be different from business owner)
      const billingEmail = createBusinessDto.billingEmail?.trim() || targetEmail;

      // Determine price but do NOT create Stripe artifacts here. Business will be suspended until a user subscribes.
      const priceId = createBusinessDto.subscriptionPlanPriceId || this.getDefaultPriceId();

      // Decide domain strategy based on domainType + domainLabel
      const normalizedLabel = (createBusinessDto.domainLabel || createBusinessDto.subdomainLabel || createBusinessDto.companyName)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      let finalCustomDomain: string | undefined = createBusinessDto.customDomain;
      let finalSubdomain: string | undefined = undefined;

      if (createBusinessDto.domainType === 'custom' || createBusinessDto.customDomain) {
        // Build custom domain from label + tld if not directly provided
        if (!finalCustomDomain) {
          const tld = (createBusinessDto.customTld || 'ro').replace(/^\./, '');
          finalCustomDomain = `${normalizedLabel}.${tld}`;
        }
      } else {
        // Use our subdomain under BASE_DOMAIN
        finalSubdomain = normalizedLabel || this.generateSubdomain(createBusinessDto.companyName);
      }

      // Only create infrastructure if configuring for self AND we decide to allow trial before payment; otherwise, defer until subscription is active
      let infrastructure: any = null;
      const shouldCreateInfrastructure = false;
      
      if (shouldCreateInfrastructure) {
        // Create React app infrastructure
        infrastructure = await this.infrastructureService.createReactApp(
          businessId,
          createBusinessDto.businessType,
          finalSubdomain,
          finalCustomDomain
        );

        // Create custom domain if provided
        if (finalCustomDomain) {
          await this.infrastructureService.createCustomDomain(finalCustomDomain);
          await this.infrastructureService.setupDomainDNS(
            finalCustomDomain,
            infrastructure.appUrl
          );
        }
      }

      // Prepare locations with timestamps
      const locations: LocationInfo[] = createBusinessDto.locations.map(location => ({
        locationId: uuidv4(),
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone ?? 'Europe/Bucharest',
        isActive: location.active ?? true,
        allocatedCredits: {
          balance: 0,
          lastUpdated: now,
        },
      }));

      // Create business entity
      // Activation link/token for onboarding if configured for another email
      const activationToken = uuidv4();
      const activationUrl = `${this.configService.get('FRONTEND_BASE_URL', 'https://app.simplu.ro')}/activate?token=${activationToken}`;

      const business: BusinessEntity = {
        businessId: businessId,
        businessName: createBusinessDto.companyName,
        registrationNumber: createBusinessDto.registrationNumber,
        businessType: createBusinessDto.businessType,
        companyAddress: createBusinessDto.companyAddress ? {
          street: createBusinessDto.companyAddress.street,
          city: createBusinessDto.companyAddress.city,
          district: createBusinessDto.companyAddress.district,
          country: createBusinessDto.companyAddress.country,
          postalCode: createBusinessDto.companyAddress.postalCode,
        } : undefined,
        ownerUserId: undefined,
        ownerEmail: targetEmail,
        billingEmail: billingEmail,
        createdByUserId,
        isActivated: !isConfiguredForSomeoneElse, // Auto-activate if configuring for self
        activationToken: isConfiguredForSomeoneElse ? activationToken : undefined,
        activationUrl: isConfiguredForSomeoneElse ? activationUrl : undefined,
        authorizedEmails: createBusinessDto.authorizedEmails ?? [],
        appLabel: createBusinessDto.appLabel || createBusinessDto.companyName,
        locations,
        settings: {
          currency: createBusinessDto.settings?.currency ?? 'RON',
          language: createBusinessDto.settings?.language ?? 'ro',
          dateFormat: createBusinessDto.settings?.dateFormat ?? 'yyyy-mm-dd',
          timeFormat: createBusinessDto.settings?.timeFormat ?? 'hh:mm',
          workingHours: createBusinessDto.settings?.workingHours ?? {
            monday: { open: '09:00', close: '18:00', isOpen: true },
            tuesday: { open: '09:00', close: '18:00', isOpen: true },
            wednesday: { open: '09:00', close: '18:00', isOpen: true },
            thursday: { open: '09:00', close: '18:00', isOpen: true },
            friday: { open: '09:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '14:00', isOpen: true },
            sunday: { open: '00:00', close: '00:00', isOpen: false }
          },
        },
        deactivatedModules: createBusinessDto.deactivatedModules ?? [],
        customDomain: finalCustomDomain,
        subdomain: finalSubdomain,
        clientPageType: createBusinessDto.clientPageType || 'website',
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
        paymentStatus: 'unpaid',
        nextPaymentDate: undefined,
        credits: {
          totalBalance: 0,
          availableBalance: 0,
          currency: createBusinessDto.settings?.currency || 'RON',
          lastUpdated: now,
        },
        status: 'suspended',
        cloudFormationStackName: infrastructure?.stackName,
        reactAppUrl: infrastructure?.appUrl,
        createdAt: now,
        updatedAt: now,
      };

      // Save to database
      const savedBusiness = await this.databaseService.createBusiness(business);

      // Only trigger shard creation if infrastructure was created (i.e., payment confirmed or self-configuration)
      if (shouldCreateInfrastructure) {
        try {
          const locationRegistrations = locations.map(location => ({
            id: location.locationId,
            businessType: createBusinessDto.businessType,
          }));

          await this.shardManagementService.triggerMultipleShardCreations(
            businessId,
            locationRegistrations,
          );

          this.logger.log(`Shard creation triggered for business: ${businessId}`);
        } catch (shardError) {
          this.logger.error(`Failed to trigger shard creation for business ${businessId}:`, shardError);
          // Don't fail the business creation if shard creation trigger fails
          // The shards can be created later through a retry mechanism
        }
      } else {
        this.logger.log(`Shard creation skipped for business ${businessId} - waiting for payment confirmation`);
      }

      this.logger.log(`Business created successfully: ${businessId}`);
      
      // Send activation email only if configured for someone else
      if (isConfiguredForSomeoneElse) {
        this.logger.log(`Activation URL for owner ${targetEmail}: ${activationUrl}`);
        // Fire and forget activation email
        this.emailService.sendActivationEmail(targetEmail, activationUrl, createBusinessDto.companyName)
          .catch(() => undefined);
      } else {
        this.logger.log(`Business auto-activated for self-configuration: ${businessId}`);
      }
      
      return savedBusiness;
    } catch (error) {
      this.logger.error(`Error creating business: ${error.message}`);
      throw new BadRequestException(`Failed to create business: ${error.message}`);
    }
  }

  async getBusiness(id: string): Promise<BusinessEntity> {
    const business = await this.databaseService.getBusiness(id);
    if (!business) {
      throw new BadRequestException('Business not found');
    }
    return business;
  }

  async updateBusiness(id: string, updateBusinessDto: UpdateBusinessDto): Promise<BusinessEntity> {
    try {
      const existingBusiness = await this.getBusiness(id);
      const now = new Date().toISOString();

      // Prepare updates
      const updates: Partial<BusinessEntity> = {
        updatedAt: now,
      };

      if (updateBusinessDto.companyName) {
        updates.businessName = updateBusinessDto.companyName;
      }

      if (updateBusinessDto.registrationNumber) {
        updates.registrationNumber = updateBusinessDto.registrationNumber;
      }

      if (updateBusinessDto.businessType) {
        updates.businessType = updateBusinessDto.businessType;
      }

      if (updateBusinessDto.locations) {
        updates.locations = updateBusinessDto.locations.map(location => ({
          locationId: location.locationId || uuidv4(),
          name: location.name,
          address: location.address,
          phone: location.phone,
          email: location.email,
          timezone: location.timezone ?? 'UTC',
          isActive: location.active ?? true,
        }));
      }

      if (updateBusinessDto.settings) {
        updates.settings = {
          ...existingBusiness.settings,
          ...updateBusinessDto.settings,
        };
      }

      if (updateBusinessDto.deactivatedModules) {
        updates.deactivatedModules = updateBusinessDto.deactivatedModules;
      }

      if (updateBusinessDto.customDomain && updateBusinessDto.customDomain !== existingBusiness.customDomain) {
        updates.customDomain = updateBusinessDto.customDomain;
        // Setup new domain DNS
        await this.infrastructureService.setupDomainDNS(
          updateBusinessDto.customDomain,
          existingBusiness.reactAppUrl || ''
        );
      }

      if (updateBusinessDto.clientPageType) {
        updates.clientPageType = updateBusinessDto.clientPageType as any;
      }

      const updatedBusiness = await this.databaseService.updateBusiness(id, updates);
      this.logger.log(`Business updated successfully: ${id}`);
      return updatedBusiness;
    } catch (error) {
      this.logger.error(`Error updating business: ${error.message}`);
      throw new BadRequestException(`Failed to update business: ${error.message}`);
    }
  }

  async deleteBusiness(id: string): Promise<void> {
    try {
      const business = await this.getBusiness(id);

      // Cancel all subscriptions associated via mapping table
      const mappings = await this.paymentService.getSubscriptionsForBusiness(id);
      for (const m of mappings) {
        try {
          await this.paymentService.cancelSubscription(m.stripeSubscriptionId);
        } catch (e) {
          this.logger.warn(`Failed canceling subscription ${m.stripeSubscriptionId} for business ${id}: ${e?.message}`);
        }
      }

      // Delete React app infrastructure
      if (business.cloudFormationStackName) {
        await this.infrastructureService.deleteReactApp(business.cloudFormationStackName);
      }

      // Mark as deleted in database
      await this.databaseService.updateBusiness(id, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      this.logger.log(`Business deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting business: ${error.message}`);
      throw new BadRequestException(`Failed to delete business: ${error.message}`);
    }
  }

  async getAllBusinesses(): Promise<BusinessEntity[]> {
    return await this.databaseService.getAllBusinesses();
  }

  async getBusinessesByStatus(status: string): Promise<BusinessEntity[]> {
    return await this.databaseService.getBusinessesByStatus(status);
  }

  async getBusinessesByPaymentStatus(paymentStatus: string): Promise<BusinessEntity[]> {
    return await this.databaseService.getBusinessesByPaymentStatus(paymentStatus);
  }

  async getBusinessesForUser(userId: string): Promise<BusinessEntity[]> {
    return await this.databaseService.getBusinessesByOwner(userId);
  }

  async activateBusinessForOwner(token: string, ownerUserId: string): Promise<BusinessEntity> {
    const all = await this.databaseService.getAllBusinesses();
    const business = all.find(b => b.activationToken === token);
    if (!business) {
      throw new BadRequestException('Invalid activation token');
    }
    const updates: Partial<BusinessEntity> = {
      ownerUserId,
      isActivated: true,
      activationToken: undefined,
    } as any;
    return await this.databaseService.updateBusiness(business.businessId, updates);
  }

  async registerBusinessShards(businessId: string): Promise<void> {
    try {
      const business = await this.getBusiness(businessId);
      
      if (!business.locations || business.locations.length === 0) {
        throw new BadRequestException('No locations found for this business');
      }

      const locationRegistrations = business.locations.map(location => ({
        id: location.locationId,
        businessType: business.businessType,
      }));

      await this.shardManagementService.triggerMultipleShardCreations(
        businessId,
        locationRegistrations,
      );

      this.logger.log(`Successfully triggered shard creation for ${locationRegistrations.length} locations of business ${businessId}`);
    } catch (error) {
      this.logger.error(`Error triggering shard creation for business ${businessId}: ${error.message}`);
      throw new BadRequestException(`Failed to trigger shard creation: ${error.message}`);
    }
  }

  private getDefaultPriceId(): string {
    // Use Basic plan as default if no subscription plan is selected
    const defaultPriceId = this.configService.get('STRIPE_BASIC_PLAN_PRICE_ID');
    if (!defaultPriceId) {
      throw new BadRequestException('No default subscription plan configured. Please set STRIPE_BASIC_PLAN_PRICE_ID.');
    }
    return defaultPriceId;
  }

  private generateSubdomain(companyName: string): string {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) + '-' + Math.random().toString(36).substring(2, 8);
  }

  private calculateNextPaymentDate(subscription: any): string {
    if (subscription.current_period_end) {
      return new Date(subscription.current_period_end * 1000).toISOString();
    }
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
  }

  async getBusinessSubscriptionInfo(businessId: string) {
    try {
      const business = await this.getBusiness(businessId);
      const mappings = await this.paymentService.getSubscriptionsForBusiness(businessId);
      if (mappings.length === 0) {
        return {
          business: {
            businessId: business.businessId,
            businessName: business.businessName,
            businessType: business.businessType,
            paymentStatus: business.paymentStatus,
            status: business.status
          },
          stripe: {
            customerId: null,
            customer: null,
            subscriptions: [],
            activeSubscriptions: [],
            hasActiveSubscription: false,
            subscriptionCount: 0,
          },
          summary: {
            isSubscribed: false,
            subscriptionStatus: 'none',
            nextPaymentDate: null,
            currentPlan: null,
          },
        };
      }
      // Load customer/subscription from Stripe using first mapping
      const activeMapping = mappings.find(m => m.status === 'active') || mappings[0];
      const subscriptions = await this.paymentService.getCustomerSubscriptions(activeMapping.stripeCustomerId);
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
      const customer = await this.paymentService.getCustomer(activeMapping.stripeCustomerId);
      return {
        business: {
          businessId: business.businessId,
          businessName: business.businessName,
          businessType: business.businessType,
          paymentStatus: business.paymentStatus,
          status: business.status
        },
        stripe: {
          customerId: activeMapping.stripeCustomerId,
          customer: customer,
          subscriptions: subscriptions,
          activeSubscriptions: activeSubscriptions,
          hasActiveSubscription: activeSubscriptions.length > 0,
          subscriptionCount: subscriptions.length
        },
        summary: {
          isSubscribed: activeSubscriptions.length > 0,
          subscriptionStatus: activeSubscriptions.length > 0 ? activeSubscriptions[0].status : 'none',
          nextPaymentDate: activeSubscriptions.length > 0 ? this.calculateNextPaymentDate(activeSubscriptions[0]) : null,
          currentPlan: activeSubscriptions.length > 0 ? activeSubscriptions[0].items.data[0]?.price?.nickname || 'Unknown' : null
        }
      };
    } catch (error) {
      this.logger.error(`Error getting business subscription info: ${error.message}`);
      throw error;
    }
  }

  async getDetailedBusinessStatus(businessId: string) {
    try {
      const business = await this.getBusiness(businessId);

      // Get subscription info via mapping
      const subscriptionInfo = await this.getBusinessSubscriptionInfo(businessId);
      const stripeCustomerId = subscriptionInfo.stripe.customerId as string | null;
      const paymentMethods = stripeCustomerId ? await this.paymentService.getCustomerPaymentMethods(stripeCustomerId) : [];
      const invoices = stripeCustomerId ? await this.paymentService.getCustomerInvoices(stripeCustomerId) : [];

      return {
        business: {
          businessId: business.businessId,
          businessName: business.businessName,
          registrationNumber: business.registrationNumber,
          businessType: business.businessType,
          ownerEmail: business.ownerEmail,
          billingEmail: business.billingEmail || business.ownerEmail,
          companyAddress: business.companyAddress,
          status: business.status,
          paymentStatus: business.paymentStatus,
          createdAt: business.createdAt,
        },
        subscription: {
          isActive: subscriptionInfo.summary.isSubscribed,
          status: subscriptionInfo.summary.subscriptionStatus,
          currentPlan: subscriptionInfo.summary.currentPlan,
          validFrom: subscriptionInfo.stripe.activeSubscriptions[0]?.current_period_start 
            ? new Date(subscriptionInfo.stripe.activeSubscriptions[0].current_period_start * 1000).toISOString()
            : null,
          validUntil: subscriptionInfo.summary.nextPaymentDate,
          price: subscriptionInfo.stripe.activeSubscriptions[0]?.items?.data[0]?.price?.unit_amount || 0,
          currency: subscriptionInfo.stripe.activeSubscriptions[0]?.items?.data[0]?.price?.currency || 'ron',
          interval: subscriptionInfo.stripe.activeSubscriptions[0]?.items?.data[0]?.price?.recurring?.interval || 'month',
        },
        paymentMethods: {
          hasCard: paymentMethods.length > 0,
          cards: paymentMethods.map(pm => ({
            id: pm.id,
            type: pm.type,
            card: pm.card ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            } : null,
            isDefault: pm.id === subscriptionInfo.stripe.customer.invoice_settings?.default_payment_method,
          })),
        },
        credits: {
          business: business.credits || { totalBalance: 0, availableBalance: 0, currency: 'RON', lastUpdated: business.createdAt },
          locations: business.locations.map(location => ({
            locationId: location.locationId,
            locationName: location.name,
            allocatedCredits: location.allocatedCredits || { balance: 0, lastUpdated: business.createdAt },
          })),
          summary: {
            totalCredits: business.credits?.totalBalance || 0,
            availableCredits: business.credits?.availableBalance || 0,
            allocatedCredits: business.locations.reduce((total, loc) => total + (loc.allocatedCredits?.balance || 0), 0),
          },
        },
        invoices: invoices.slice(0, 10).map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000).toISOString(),
          description: invoice.description,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting detailed business status: ${error.message}`);
      throw error;
    }
  }

  async createOrReplaceBusinessSubscription(
    businessId: string,
    priceId: string,
    cancelPrevious: boolean = true,
  ) {
    throw new BadRequestException('Use createOrReplaceBusinessSubscriptionForUser with payer user context');
  }

  async createOrReplaceBusinessSubscriptionForUser(
    businessId: string,
    priceId: string,
    payerUser: { userId: string; email: string; name?: string },
    cancelPrevious: boolean = true,
  ) {
    try {
      const business = await this.getBusiness(businessId);
      const { subscription, customer, clientSecret, record } = await this.paymentService.createBusinessSubscription(
        payerUser,
        business,
        priceId,
        cancelPrevious,
      );
      const updatedBusiness = await this.getBusiness(businessId);
      return {
        business: {
          businessId: updatedBusiness.businessId,
          businessName: updatedBusiness.businessName,
          paymentStatus: updatedBusiness.paymentStatus,
          nextPaymentDate: updatedBusiness.nextPaymentDate,
          status: updatedBusiness.status,
        },
        stripe: {
          customerId: customer.id,
          subscriptionId: subscription.id,
          clientSecret,
        },
        mapping: record,
      };
    } catch (error) {
      this.logger.error(`Error creating/replacing business subscription: ${error.message}`);
      throw error;
    }
  }

  async getBusinessCredits(businessId: string) {
    try {
      const business = await this.getBusiness(businessId);
      
      return {
        businessId: business.businessId,
        businessName: business.businessName,
        credits: {
          business: business.credits || { totalBalance: 0, availableBalance: 0, currency: 'RON', lastUpdated: business.createdAt },
          locations: business.locations.map(location => ({
            locationId: location.locationId,
            locationName: location.name,
            allocatedCredits: location.allocatedCredits || { balance: 0, lastUpdated: business.createdAt },
          })),
          summary: {
            totalCredits: business.credits?.totalBalance || 0,
            availableCredits: business.credits?.availableBalance || 0,
            allocatedCredits: business.locations.reduce((total, loc) => total + (loc.allocatedCredits?.balance || 0), 0),
          },
        },
        // TODO: Implement credit transaction history from database
        transactions: [],
      };
    } catch (error) {
      this.logger.error(`Error getting business credits: ${error.message}`);
      throw error;
    }
  }

  async purchaseCredits(
    businessId: string,
    creditAmount: number,
    payerUser: { userId: string; email: string; name?: string },
    paymentMethodId?: string,
  ) {
    try {
      const business = await this.getBusiness(businessId);

      // Use payer user stripe customer
      const customer = await this.paymentService.ensureStripeCustomerForUser(
        payerUser.userId,
        payerUser.email,
        payerUser.name,
      );

      // Calculate price for credits (e.g., 1 credit = 1 RON)
      const unitPrice = 100; // 1 RON in cents
      const totalAmount = creditAmount * unitPrice;

      // Create payment intent for credits purchase
      const paymentIntent = await this.paymentService.createPaymentIntent(
        totalAmount,
        business.credits?.currency || 'ron',
        customer.id,
      );

      // If payment method provided, confirm payment immediately
      if (paymentMethodId) {
        await this.paymentService.confirmPaymentIntent(paymentIntent.id, paymentMethodId);
        
        // Update credits balance
        await this.addCreditsToBalance(businessId, creditAmount);
      }

      return {
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: totalAmount,
          currency: paymentIntent.currency,
        },
        credits: {
          purchased: creditAmount,
          unitPrice: unitPrice,
          totalAmount: totalAmount,
        },
      };
    } catch (error) {
      this.logger.error(`Error purchasing credits: ${error.message}`);
      throw error;
    }
  }

  async allocateCreditsToLocation(businessId: string, locationId: string, amount: number) {
    try {
      const business = await this.getBusiness(businessId);
      
      // Check if business has enough available credits
      const availableCredits = business.credits?.availableBalance || 0;
      if (availableCredits < amount) {
        throw new Error(`Insufficient available credits. Available: ${availableCredits}, Requested: ${amount}`);
      }

      // Find the location
      const locationIndex = business.locations.findIndex(loc => loc.locationId === locationId);
      if (locationIndex === -1) {
        throw new Error('Location not found');
      }

      const updatedBusiness = { ...business };
      
      // Update business credits
      updatedBusiness.credits = {
        ...business.credits!,
        availableBalance: availableCredits - amount,
        lastUpdated: new Date().toISOString(),
      };

      // Update location credits
      updatedBusiness.locations[locationIndex] = {
        ...business.locations[locationIndex],
        allocatedCredits: {
          balance: (business.locations[locationIndex].allocatedCredits?.balance || 0) + amount,
          lastUpdated: new Date().toISOString(),
        },
      };

      updatedBusiness.updatedAt = new Date().toISOString();

      await this.databaseService.updateBusiness(businessId, updatedBusiness);
      
      this.logger.log(`Allocated ${amount} credits to location ${locationId} in business ${businessId}`);
      
      return {
        success: true,
        allocated: amount,
        location: {
          locationId: locationId,
          locationName: updatedBusiness.locations[locationIndex].name,
          newBalance: updatedBusiness.locations[locationIndex].allocatedCredits!.balance,
        },
        business: {
          availableCredits: updatedBusiness.credits.availableBalance,
          totalCredits: updatedBusiness.credits.totalBalance,
        },
      };
    } catch (error) {
      this.logger.error(`Error allocating credits to location: ${error.message}`);
      throw error;
    }
  }

  async reallocateCredits(businessId: string, fromLocationId: string, toLocationId: string, amount: number) {
    try {
      const business = await this.getBusiness(businessId);
      
      // Find the locations
      const fromLocationIndex = business.locations.findIndex(loc => loc.locationId === fromLocationId);
      const toLocationIndex = business.locations.findIndex(loc => loc.locationId === toLocationId);
      
      if (fromLocationIndex === -1 || toLocationIndex === -1) {
        throw new Error('One or both locations not found');
      }

      // Check if source location has enough credits
      const fromLocationCredits = business.locations[fromLocationIndex].allocatedCredits?.balance || 0;
      if (fromLocationCredits < amount) {
        throw new Error(`Insufficient credits in source location. Available: ${fromLocationCredits}, Requested: ${amount}`);
      }

      const updatedBusiness = { ...business };
      
      // Update source location
      updatedBusiness.locations[fromLocationIndex] = {
        ...business.locations[fromLocationIndex],
        allocatedCredits: {
          balance: fromLocationCredits - amount,
          lastUpdated: new Date().toISOString(),
        },
      };

      // Update destination location
      updatedBusiness.locations[toLocationIndex] = {
        ...business.locations[toLocationIndex],
        allocatedCredits: {
          balance: (business.locations[toLocationIndex].allocatedCredits?.balance || 0) + amount,
          lastUpdated: new Date().toISOString(),
        },
      };

      updatedBusiness.updatedAt = new Date().toISOString();

      await this.databaseService.updateBusiness(businessId, updatedBusiness);
      
      this.logger.log(`Reallocated ${amount} credits from location ${fromLocationId} to ${toLocationId} in business ${businessId}`);
      
      return {
        success: true,
        reallocated: amount,
        fromLocation: {
          locationId: fromLocationId,
          locationName: updatedBusiness.locations[fromLocationIndex].name,
          newBalance: updatedBusiness.locations[fromLocationIndex].allocatedCredits!.balance,
        },
        toLocation: {
          locationId: toLocationId,
          locationName: updatedBusiness.locations[toLocationIndex].name,
          newBalance: updatedBusiness.locations[toLocationIndex].allocatedCredits!.balance,
        },
      };
    } catch (error) {
      this.logger.error(`Error reallocating credits: ${error.message}`);
      throw error;
    }
  }

  async deallocateCreditsFromLocation(businessId: string, locationId: string, amount: number) {
    try {
      const business = await this.getBusiness(businessId);
      
      // Find the location
      const locationIndex = business.locations.findIndex(loc => loc.locationId === locationId);
      if (locationIndex === -1) {
        throw new Error('Location not found');
      }

      // Check if location has enough credits
      const locationCredits = business.locations[locationIndex].allocatedCredits?.balance || 0;
      if (locationCredits < amount) {
        throw new Error(`Insufficient credits in location. Available: ${locationCredits}, Requested: ${amount}`);
      }

      const updatedBusiness = { ...business };
      
      // Update business credits
      updatedBusiness.credits = {
        ...business.credits!,
        availableBalance: (business.credits?.availableBalance || 0) + amount,
        lastUpdated: new Date().toISOString(),
      };

      // Update location credits
      updatedBusiness.locations[locationIndex] = {
        ...business.locations[locationIndex],
        allocatedCredits: {
          balance: locationCredits - amount,
          lastUpdated: new Date().toISOString(),
        },
      };

      updatedBusiness.updatedAt = new Date().toISOString();

      await this.databaseService.updateBusiness(businessId, updatedBusiness);
      
      this.logger.log(`Deallocated ${amount} credits from location ${locationId} to business pool ${businessId}`);
      
      return {
        success: true,
        deallocated: amount,
        location: {
          locationId: locationId,
          locationName: updatedBusiness.locations[locationIndex].name,
          newBalance: updatedBusiness.locations[locationIndex].allocatedCredits!.balance,
        },
        business: {
          availableCredits: updatedBusiness.credits.availableBalance,
          totalCredits: updatedBusiness.credits.totalBalance,
        },
      };
    } catch (error) {
      this.logger.error(`Error deallocating credits from location: ${error.message}`);
      throw error;
    }
  }

  private async addCreditsToBalance(businessId: string, amount: number) {
    try {
      const business = await this.getBusiness(businessId);
      const currentTotalBalance = business.credits?.totalBalance || 0;
      const currentAvailableBalance = business.credits?.availableBalance || 0;
      const newTotalBalance = currentTotalBalance + amount;
      const newAvailableBalance = currentAvailableBalance + amount;
      
      const updatedBusiness = {
        ...business,
        credits: {
          totalBalance: newTotalBalance,
          availableBalance: newAvailableBalance,
          currency: business.credits?.currency || 'RON',
          lastUpdated: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      await this.databaseService.updateBusiness(businessId, updatedBusiness);
      
      this.logger.log(`Added ${amount} credits to business ${businessId}. New total: ${newTotalBalance}, Available: ${newAvailableBalance}`);
      
      return updatedBusiness;
    } catch (error) {
      this.logger.error(`Error adding credits to balance: ${error.message}`);
      throw error;
    }
  }
} 