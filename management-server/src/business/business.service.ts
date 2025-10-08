import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BusinessEntity, BusinessLocation, BusinessSettings, BusinessStatus } from './entities/business.entity';
import { ShardManagementService } from '../shared/services/shard-management.service';
import { InfrastructureService } from '../infrastructure/infrastructure.service';
import { PaymentService } from '../payment/payment.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../shared/services/email.service';
import { CognitoUserService } from '../modules/auth/cognito-user.service';
import { BusinessIdService } from './business-id.service';
import { SqsService } from '../shared/services/sqs.service';
import { EventBridgeService } from '../shared/services/event-bridge.service';

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
    private readonly cognitoUserService: CognitoUserService,
    private readonly businessIdService: BusinessIdService,
    private readonly sqsService: SqsService,
    private readonly eventBridgeService: EventBridgeService,
  ) {}

  private getDbType(): string {
    return process.env.DB_TYPE || 'citrus';
  }

  // Step 1: Configuration - Create business with suspended status
  async configureBusiness(input: any, user: any): Promise<BusinessEntity> {
    const nowIso = new Date().toISOString();

    // Generate business ID first
    const businessId = await this.businessIdService.generateBusinessId();

    const locations: BusinessLocation[] = await Promise.all((input.locations || []).map(async (l) => ({
      id: l.id || await this.businessIdService.generateLocationId(businessId),
      name: l.name,
      address: l.address,
      active: l.active ?? true,
      timezone: l.timezone || 'Europe/Bucharest',
    })));

    // Determine subscription type automatically based on number of locations
    const subscriptionType = locations.length === 1 ? 'solo' : 'enterprise';
    
    // Validate solo plan constraint
    if (subscriptionType === 'solo' && locations.length > 1) {
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
    let temporaryPassword = '';
    
    if (input.configureForEmail && input.configureForEmail !== user.email) {
      try {
        const { userId, isNew } = await this.usersService.findOrCreateUserByEmail(input.configureForEmail);
        ownerUserId = userId;
        ownerEmail = input.configureForEmail;
        isNewUser = isNew;
        
        if (isNew) {
          this.logger.log(`Created placeholder user for email ${input.configureForEmail} - they will complete registration later`);
          
          // Create user in Cognito with temporary password
          try {
            const cognitoResult = await this.cognitoUserService.createUserWithTemporaryPassword(
              input.configureForEmail,
              undefined, // firstName - can be extracted from user object if available
              undefined, // lastName - can be extracted from user object if available
              input.companyName
            );
            
            temporaryPassword = cognitoResult.temporaryPassword;
            this.logger.log(`Created Cognito user for ${input.configureForEmail} with username: ${cognitoResult.username}`);
          } catch (cognitoError) {
            this.logger.error(`Failed to create Cognito user for ${input.configureForEmail}:`, cognitoError);
            // Don't fail business creation if Cognito user creation fails
            // The user can still complete registration later
          }
        }
      } catch (error) {
        this.logger.error(`Failed to find/create user for email ${input.configureForEmail}:`, error);
        throw new BadRequestException(`Cannot configure business for email ${input.configureForEmail}: ${error.message}`);
      }
    }

    const business: BusinessEntity = {
      businessId: businessId,
      companyName: input.companyName,
      registrationNumber: input.registrationNumber || '',
      businessType: input.businessType,
      locations,
      settings,
      configureForEmail: input.configureForEmail || '',
      domainType: input.domainType || 'subdomain',
      domainLabel: input.domainLabel || '',
      customTld: input.customTld,
      clientPageType: input.clientPageType || 'website',
      subscriptionType, // Use automatically determined subscription type
      credits: input.credits || { total: 0, available: 0, currency: settings.currency },
      active: false,
      status: 'suspended',
      ownerUserId,
      ownerEmail,
      billingEmail: input.billingEmail || ownerEmail,
      createdByUserId: user.userId,
      nextPaymentDate: null,
      paymentStatus: 'unpaid', // Will be set to 'active' when launched without payment
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    };

    const createdBusiness = await this.db.createBusiness(business);

    // Send invitation email if this is a new user
    if (isNewUser && input.configureForEmail) {
      try {
        const invitationUrl = `${this.getBaseUrl()}/businesses/${createdBusiness.businessId}/invitation?email=${encodeURIComponent(input.configureForEmail)}`;
        
        // Send the business invitation email (this will also include the temporary password if Cognito user was created)
        await this.emailService.sendBusinessInvitationEmail(
          input.configureForEmail,
          input.companyName,
          createdBusiness.businessId,
          invitationUrl,
          user.email,
          temporaryPassword // Pass the temporary password if available
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
    paymentConfig: { planKey?: 'basic' | 'premium'; billingInterval?: 'month' | 'year'; currency?: string },
    user: any
  ): Promise<{ subscriptionId: string; status: string; clientSecret?: string }> {
    const business = await this.getBusiness(businessId);
    
    // Verify business ownership - only the owner can setup payment
    if (business.ownerUserId !== user.userId) {
      throw new BadRequestException('Only the business owner can setup payment for this business');
    }

    // Use the automatically determined subscription type from business creation
    const subscriptionType = business.subscriptionType;

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

  // Step 3: Launch - Activate business and deploy infrastructure (with secret code)
  async launchBusinessWithSecret(businessId: string, secretCode: string): Promise<BusinessEntity> {
    // Validate secret code
    const expectedSecretCode = process.env.BUSINESS_LAUNCH_SECRET_CODE || 'LAUNCH_SECRET_2024';
    if (secretCode !== expectedSecretCode) {
      throw new BadRequestException('Invalid secret code');
    }

    return this.launchBusinessInternal(businessId);
  }

  // Internal method for business launch logic (shared by both secret code and user auth)
  private async launchBusinessInternal(businessId: string): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);

    // Check if business is already active
    if (business.status === 'active' && business.active === true) {
      this.logger.warn(`Business ${businessId} is already active, skipping launch`);
      return business;
    }

    // Validate that domainLabel is set for infrastructure deployment
    if (!business.domainLabel) {
      throw new BadRequestException('Domain label is required for business launch. Please configure the business domain first.');
    }

    // Skip payment validation for free businesses
    // Note: Payment validation can be re-enabled by uncommenting the lines below
    // const subscriptionStatus = await this.paymentService.refreshSubscriptionStatus(businessId);
    // if (subscriptionStatus.status !== 'active' && subscriptionStatus.status !== 'trialing') {
    //   throw new BadRequestException('Business subscription is not active. Please complete payment first.');
    // }

    // Publish EventBridge event to process launch asynchronously (deploy, update, admin creation handled externally)
    // Send all locations with their IDs, but downstream will process only active ones
    await this.eventBridgeService.publishBusinessLaunchRequested({
      businessId: business.businessId,
      businessType: business.businessType,
      domainLabel: business.domainLabel,
      ownerEmail: business.ownerEmail,
      ownerUserId: business.ownerUserId,
      locations: (business.locations || []).map((l) => ({ id: l.id, active: l.active })),
      timestamp: new Date().toISOString(),
    });

    // Do not change status/active; frontend will show: "cererea a fost trimisa spre procesare, poate dura pana la 10 minute pana primiti acces"
    return this.db.updateBusiness(businessId, { updatedAt: new Date().toISOString() });
  }

  // Step 3: Launch - Activate business and deploy infrastructure (legacy with user auth)
  // Note: Payment validation is disabled to allow free business launches
  async launchBusiness(businessId: string, user: any): Promise<BusinessEntity> {
    const business = await this.getBusiness(businessId);
    
    // Verify business ownership or authorization
    if (business.ownerUserId !== user.userId && business.createdByUserId !== user.userId) {
      throw new BadRequestException('Unauthorized to launch this business');
    }

    return this.launchBusinessInternal(businessId);
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



  async getAllBusinesses(): Promise<BusinessEntity[]> {
    return this.db.getAllBusinesses();
  }

  async updateBusiness(businessId: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity> {
    // If locations are being updated, validate subscription type constraint
    if (updates.locations) {
      const subscriptionType = updates.locations.length === 1 ? 'solo' : 'enterprise';
      if (subscriptionType === 'solo' && updates.locations.length > 1) {
        throw new BadRequestException('Planul solo permite o singură locație');
      }
      // Automatically update subscription type based on location count
      updates.subscriptionType = subscriptionType;
    }
    
    return this.db.updateBusiness(businessId, { ...updates, updatedAt: new Date().toISOString() });
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

  /**
   * Search for businesses by domainLabel to avoid duplicates
   */
  async searchBusinessesByDomainLabel(domainLabel: string): Promise<BusinessEntity[]> {
    try {
      return await this.db.searchBusinessesByDomainLabel(domainLabel);
    } catch (error) {
      this.logger.error(`Error searching businesses by domainLabel ${domainLabel}:`, error);
      throw new BadRequestException(`Failed to search businesses by domainLabel: ${error.message}`);
    }
  }

  /**
   * Check if domainLabel is available (not already used)
   */
  async isDomainLabelAvailable(domainLabel: string): Promise<boolean> {
    const existingBusinesses = await this.searchBusinessesByDomainLabel(domainLabel);
    return existingBusinesses.length === 0;
  }

  /**
   * Trigger admin account creation for business activation
   */
  async triggerAdminAccountCreation(
    businessId: string,
    locationId: string,
    adminEmail: string,
    adminUserId: string,
    businessType: string,
    domainLabel: string
  ): Promise<void> {
    try {
      const message = {
        businessId,
        locationId,
        adminEmail,
        adminUserId,
        businessType,
        domainLabel,
        timestamp: new Date().toISOString(),
      };

      await this.sqsService.sendAdminAccountCreationMessage(message);
      this.logger.log(`Admin account creation triggered for business ${businessId}, location ${locationId}, admin ${adminEmail}`);
    } catch (error) {
      this.logger.error(`Failed to trigger admin account creation for business ${businessId}:`, error);
      throw new BadRequestException(`Failed to trigger admin account creation: ${error.message}`);
    }
  }
}

