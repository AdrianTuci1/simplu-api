import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { BusinessEntity, BusinessLocation, BusinessSettings, BusinessStatus } from './entities/business.entity';
import { ShardManagementService } from '../shared/services/shard-management.service';
import { InfrastructureService } from '../infrastructure/infrastructure.service';
import { PaymentService } from '../payment/payment.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../shared/services/email.service';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly shardService: ShardManagementService,
    private readonly infraService: InfrastructureService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  // Step 1: Configuration - Create business with suspended status
  async configureBusiness(input: Partial<BusinessEntity> & { companyName: string; businessType: string }, user: any): Promise<BusinessEntity> {
    const nowIso = new Date().toISOString();

    const locations: BusinessLocation[] = (input.locations || []).map((l) => ({
      id: l.id || uuidv4(),
      name: l.name,
      address: l.address,
      active: l.active ?? true,
      timezone: l.timezone || 'Europe/Bucharest',
    }));

    if ((input.subscriptionType || 'solo') === 'solo' && locations.length > 1) {
      throw new BadRequestException('Planul solo permite o singură locație');
    }

    const settings: BusinessSettings = {
      currency: input.settings?.currency || 'RON',
      language: input.settings?.language || 'ro',
    };

    // Handle owner assignment - if configureForEmail is provided, find or create that user
    let ownerUserId = user.userId;
    let ownerEmail = user.email;
    let isNewUser = false;
    
    if (input.configureForEmail && input.configureForEmail !== user.email) {
      try {
        const { userId, isNew } = await this.usersService.findOrCreateUserByEmail(input.configureForEmail);
        ownerUserId = userId;
        ownerEmail = input.configureForEmail;
        isNewUser = isNew;
        
        if (isNew) {
          this.logger.log(`Created placeholder user for email ${input.configureForEmail} - they will complete registration later`);
        }
      } catch (error) {
        this.logger.error(`Failed to find/create user for email ${input.configureForEmail}:`, error);
        throw new BadRequestException(`Cannot configure business for email ${input.configureForEmail}: ${error.message}`);
      }
    }

    const business: BusinessEntity = {
      businessId: uuidv4(),
      companyName: input.companyName,
      registrationNumber: input.registrationNumber || '',
      taxCode: input.taxCode || '',
      businessType: input.businessType,
      locations,
      settings,
      configureForEmail: input.configureForEmail || '',
      domainType: input.domainType || 'subdomain',
      domainLabel: input.domainLabel || '',
      customTld: input.customTld,
      clientPageType: input.clientPageType || 'website',
      subscriptionType: (input.subscriptionType as any) || 'solo',
      credits: input.credits || { total: 0, available: 0, currency: settings.currency, perLocation: {}, lockedLocations: [] },
      active: false,
      status: 'suspended',
      ownerUserId,
      ownerEmail,
      billingEmail: input.billingEmail || ownerEmail,
      createdByUserId: user.userId,
      nextPaymentDate: null,
      paymentStatus: 'unpaid',
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };

    const createdBusiness = await this.db.createBusiness(business);

    // Send invitation email if this is a new user
    if (isNewUser && input.configureForEmail) {
      try {
        const invitationUrl = `${this.getBaseUrl()}/businesses/${createdBusiness.businessId}/invitation?email=${encodeURIComponent(input.configureForEmail)}`;
        await this.emailService.sendBusinessInvitationEmail(
          input.configureForEmail,
          input.companyName,
          createdBusiness.businessId,
          invitationUrl,
          user.email
        );
        this.logger.log(`Invitation email sent to ${input.configureForEmail} for business ${createdBusiness.businessId}`);
      } catch (error) {
        this.logger.error(`Failed to send invitation email to ${input.configureForEmail}:`, error);
        // Don't fail business creation if email fails
      }
    }

    return createdBusiness;
  }

  private getBaseUrl(): string {
    // In production, this should come from environment variables
    return process.env.FRONTEND_BASE_URL || 'https://app.simplu.io';
  }

  async getInvitationInfo(businessId: string, email: string): Promise<{ businessId: string; businessName: string; ownerEmail: string; invitationUrl: string }> {
    const business = await this.getBusiness(businessId);
    
    // Verify that the email matches the owner email
    if (business.ownerEmail !== email) {
      throw new BadRequestException('Invalid invitation link');
    }

    const invitationUrl = `${this.getBaseUrl()}/businesses/${businessId}/setup?email=${encodeURIComponent(email)}`;
    
    return {
      businessId: business.businessId,
      businessName: business.companyName,
      ownerEmail: business.ownerEmail,
      invitationUrl,
    };
  }

  // Step 2: Payment - Create subscription for configured business
  async setupPayment(
    businessId: string, 
    paymentConfig: { subscriptionType: 'solo' | 'enterprise'; planKey?: 'basic' | 'premium'; billingInterval?: 'month' | 'year'; currency?: string },
    user: any
  ): Promise<{ subscriptionId: string; status: string; clientSecret?: string }> {
    const business = await this.getBusiness(businessId);
    
    // Verify business ownership - only the owner can setup payment
    if (business.ownerUserId !== user.userId) {
      throw new BadRequestException('Only the business owner can setup payment for this business');
    }

    // Update business with subscription type
    await this.db.updateBusiness(businessId, {
      subscriptionType: paymentConfig.subscriptionType,
      updatedAt: new Date().toISOString(),
    });

    // Determine who should pay:
    // - If business was configured for someone else (configureForEmail), owner pays
    // - If business was configured for the creator, creator pays
    const payingUserId = business.ownerUserId;
    const payingUserEmail = business.ownerEmail;

    // Create subscription using payment service with the correct user's credentials
    return this.paymentService.createOrReplaceSubscription({
      businessId,
      userId: payingUserId,
      userEmail: payingUserEmail,
      planKey: paymentConfig.planKey || 'basic',
      billingInterval: paymentConfig.billingInterval || 'month',
      currency: paymentConfig.currency || 'ron',
      cancelPrevious: true,
    });
  }

  // Step 3: Launch - Activate business and deploy infrastructure
  async launchBusiness(businessId: string, user: any): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);
    
    // Verify business ownership or authorization
    if (business.ownerUserId !== user.userId && business.createdByUserId !== user.userId) {
      throw new BadRequestException('Unauthorized to launch this business');
    }

    // Check if business is already active
    if (business.status === 'active' && business.active === true) {
      this.logger.warn(`Business ${businessId} is already active, skipping launch`);
      return business;
    }

    // Check payment status
    const subscriptionStatus = await this.paymentService.refreshSubscriptionStatus(businessId);
    if (subscriptionStatus.status !== 'active' && subscriptionStatus.status !== 'trialing') {
      throw new BadRequestException('Business subscription is not active. Please complete payment first.');
    }

    // Mark business as active
    const updated = await this.db.updateBusiness(businessId, {
      active: true,
      status: 'active' as BusinessStatus,
      paymentStatus: 'active',
      updatedAt: new Date().toISOString(),
    });

    // Trigger shard creation for each active location
    const activeLocations = (updated.locations || []).filter((l) => l.active !== false);
    await this.shardService.triggerMultipleShardCreations(
      updated.businessId,
      activeLocations.map((l) => ({ id: l.id, businessType: updated.businessType })),
    );

    // Create React app infrastructure (domain may be subdomain/custom)
    try {
      await this.infraService.createReactApp(
        updated.businessId,
        updated.businessType,
        updated.domainType === 'subdomain' ? updated.domainLabel : undefined,
        updated.domainType === 'custom' ? `${updated.domainLabel}${updated.customTld ? '.' + updated.customTld : ''}` : undefined,
      );
    } catch (err) {
      this.logger.warn(`Infra creation failed for business ${updated.businessId}: ${err?.message}`);
    }

    return updated;
  }

  // Legacy method for backward compatibility
  async createBusiness(input: Partial<BusinessEntity> & { companyName: string; businessType: string }): Promise<BusinessEntity> {
    const nowIso = new Date().toISOString();

    const locations: BusinessLocation[] = (input.locations || []).map((l) => ({
      id: l.id || uuidv4(),
      name: l.name,
      address: l.address,
      active: l.active ?? true,
      timezone: l.timezone || 'Europe/Bucharest',
    }));

    if ((input.subscriptionType || 'solo') === 'solo' && locations.length > 1) {
      throw new BadRequestException('Planul solo permite o singură locație');
    }

    const settings: BusinessSettings = {
      currency: input.settings?.currency || 'RON',
      language: input.settings?.language || 'ro',
    };

    const business: BusinessEntity = {
      businessId: uuidv4(),
      companyName: input.companyName,
      registrationNumber: input.registrationNumber || '',
      taxCode: input.taxCode || '',
      businessType: input.businessType,
      locations,
      settings,
      configureForEmail: input.configureForEmail || '',
      domainType: input.domainType || 'subdomain',
      domainLabel: input.domainLabel || '',
      customTld: input.customTld,
      clientPageType: input.clientPageType || 'website',
      subscriptionType: (input.subscriptionType as any) || 'solo',
      credits: input.credits || { total: 0, available: 0, currency: settings.currency, perLocation: {}, lockedLocations: [] },
      active: false,
      status: 'suspended',
      ownerUserId: input.ownerUserId || null,
      ownerEmail: input.ownerEmail || '',
      billingEmail: input.billingEmail || '',
      createdByUserId: input.createdByUserId || '',
      nextPaymentDate: null,
      paymentStatus: 'unpaid',
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };

    return this.db.createBusiness(business);
  }

  async getBusiness(businessId: string): Promise<BusinessEntity> {
    const business = await this.db.getBusiness(businessId);
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async listBusinessesForUser(userId: string, userEmail: string): Promise<BusinessEntity[]> {
    const byOwner = await this.db.getBusinessesByOwner(userId);
    const byCreator = await this.db.getBusinessesByCreator(userId);
    const byEmail = await this.db.getBusinessesByAuthorizedEmail(userEmail);
    
    // Merge unique by id - include all business types
    const map = new Map<string, BusinessEntity>();
    [...byOwner, ...byCreator, ...byEmail].forEach((b) => map.set(b.businessId, b));
    
    // Sort by creation date (newest first)
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateBusiness(businessId: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity> {
    if (updates.subscriptionType === 'solo' && updates.locations && updates.locations.length > 1) {
      throw new BadRequestException('Planul solo permite o singură locație');
    }
    return this.db.updateBusiness(businessId, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteBusiness(businessId: string): Promise<void> {
    const business = await this.getBusiness(businessId);
    
    // Mark business as deleted
    await this.db.updateBusiness(businessId, {
      status: 'deleted' as BusinessStatus,
      active: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Send destruction messages to SQS for each location's shard (businessId-locationId)
    try {
      const activeLocations = (business.locations || []).filter((l) => l.active !== false);
      for (const location of activeLocations) {
        await this.shardService.triggerShardDestruction(businessId, location.id);
      }
      this.logger.log(`Triggered shard destruction for ${activeLocations.length} locations of business ${businessId}`);
    } catch (err) {
      this.logger.warn(`Failed to trigger shard destruction for business ${businessId}: ${err?.message}`);
    }

    // Send destruction message to CloudFormation for stack deletion
    try {
      await this.infraService.destroyReactApp(businessId);
    } catch (err) {
      this.logger.warn(`Failed to trigger infrastructure destruction for business ${businessId}: ${err?.message}`);
    }

    // Finally delete from database
    await this.db.deleteBusiness(businessId);
  }

  async activateAfterPayment(businessId: string, subscriptionType: 'solo' | 'enterprise'): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);

    // Mark active and set status
    const updated = await this.db.updateBusiness(businessId, {
      active: true,
      status: 'active' as BusinessStatus,
      subscriptionType,
      paymentStatus: 'active',
      updatedAt: new Date().toISOString(),
    });

    // Trigger shard creation for each active location
    const activeLocations = (updated.locations || []).filter((l) => l.active !== false);
    await this.shardService.triggerMultipleShardCreations(
      updated.businessId,
      activeLocations.map((l) => ({ id: l.id, businessType: updated.businessType })),
    );

    // Create React app infrastructure (domain may be subdomain/custom)
    try {
      await this.infraService.createReactApp(
        updated.businessId,
        updated.businessType,
        updated.domainType === 'subdomain' ? updated.domainLabel : undefined,
        updated.domainType === 'custom' ? `${updated.domainLabel}${updated.customTld ? '.' + updated.customTld : ''}` : undefined,
      );
    } catch (err) {
      this.logger.warn(`Infra creation failed for business ${updated.businessId}: ${err?.message}`);
    }

    return updated;
  }

  async allocateCredits(businessId: string, locationId: string | null, amount: number, lockLocationUse?: boolean): Promise<BusinessEntity> {
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');
    const business = await this.getBusiness(businessId);
    const credits = business.credits || { total: 0, available: 0, currency: business.settings.currency, perLocation: {}, lockedLocations: [] };

    credits.total = (credits.total || 0) + amount;
    credits.available = (credits.available || 0) + amount;

    if (locationId) {
      credits.perLocation = credits.perLocation || {};
      credits.perLocation[locationId] = (credits.perLocation[locationId] || 0) + amount;
      if (lockLocationUse) {
        credits.lockedLocations = Array.from(new Set([...(credits.lockedLocations || []), locationId]));
      }
    }

    return this.db.updateBusiness(businessId, { credits, updatedAt: new Date().toISOString() });
  }

  async deallocateCredits(businessId: string, locationId: string | null, amount: number): Promise<BusinessEntity> {
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');
    const business = await this.getBusiness(businessId);
    const credits = business.credits;
    if (!credits) throw new BadRequestException('No credits available');

    if (locationId) {
      const current = credits.perLocation?.[locationId] || 0;
      if (current < amount) throw new BadRequestException('Insufficient location credits');
      credits.perLocation = credits.perLocation || {};
      credits.perLocation[locationId] = current - amount;
    }
    const totalAvail = credits.available || 0;
    if (totalAvail < amount) throw new BadRequestException('Insufficient available credits');
    credits.available = totalAvail - amount;
    credits.total = Math.max(0, (credits.total || 0) - amount);

    return this.db.updateBusiness(businessId, { credits, updatedAt: new Date().toISOString() });
  }

  async reallocateCredits(businessId: string, fromLocationId: string, toLocationId: string, amount: number): Promise<BusinessEntity> {
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');
    const business = await this.getBusiness(businessId);
    const credits = business.credits;
    if (!credits) throw new BadRequestException('No credits available');

    const from = credits.perLocation?.[fromLocationId] || 0;
    if (from < amount) throw new BadRequestException('Insufficient source location credits');
    credits.perLocation = credits.perLocation || {};
    credits.perLocation[fromLocationId] = from - amount;
    credits.perLocation[toLocationId] = (credits.perLocation[toLocationId] || 0) + amount;

    return this.db.updateBusiness(businessId, { credits, updatedAt: new Date().toISOString() });
  }

  async lockLocation(businessId: string, locationId: string): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);
    const credits = business.credits || { total: 0, available: 0, currency: business.settings.currency, perLocation: {}, lockedLocations: [] };
    credits.lockedLocations = Array.from(new Set([...(credits.lockedLocations || []), locationId]));
    return this.db.updateBusiness(businessId, { credits, updatedAt: new Date().toISOString() });
  }

  async unlockLocation(businessId: string, locationId: string): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);
    const credits = business.credits || { total: 0, available: 0, currency: business.settings.currency, perLocation: {}, lockedLocations: [] };
    credits.lockedLocations = (credits.lockedLocations || []).filter((id) => id !== locationId);
    return this.db.updateBusiness(businessId, { credits, updatedAt: new Date().toISOString() });
  }

  async updatePaymentInfo(businessId: string, params: { paymentStatus: BusinessEntity['paymentStatus']; nextPaymentDate?: string | null }): Promise<BusinessEntity> {
    return this.db.updateBusiness(businessId, { paymentStatus: params.paymentStatus, nextPaymentDate: params.nextPaymentDate ?? null, updatedAt: new Date().toISOString() });
  }

  async suspendIfGracePeriodPassed(businessId: string): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);
    if (business.paymentStatus === 'active') return business;
    const ref = business.nextPaymentDate ? new Date(business.nextPaymentDate) : null;
    if (!ref) return business;
    const graceEnd = new Date(ref.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (Date.now() > graceEnd.getTime()) {
      return this.db.updateBusiness(businessId, { status: 'suspended', active: false, updatedAt: new Date().toISOString() });
    }
    return business;
  }
}

