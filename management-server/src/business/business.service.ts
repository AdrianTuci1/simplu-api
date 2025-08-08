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

      // Create Stripe customer for the target email
      const stripeCustomer = await this.paymentService.createCustomer(
        targetEmail,
        createBusinessDto.companyName
      );

      // Create Stripe subscription
      const priceId = this.getPriceIdForBusinessType(createBusinessDto.businessType);
      const subscription = await this.paymentService.createSubscription(
        stripeCustomer.id,
        priceId
      );

      // Generate subdomain if no custom domain
      const subdomain = createBusinessDto.customDomain 
        ? undefined 
        : this.generateSubdomain(createBusinessDto.companyName);

      // Create React app infrastructure
      const infrastructure = await this.infrastructureService.createReactApp(
        businessId,
        createBusinessDto.businessType,
        subdomain,
        createBusinessDto.customDomain
      );

      // Create custom domain if provided
      if (createBusinessDto.customDomain) {
        await this.infrastructureService.createCustomDomain(createBusinessDto.customDomain);
        await this.infrastructureService.setupDomainDNS(
          createBusinessDto.customDomain,
          infrastructure.appUrl
        );
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
        ownerUserId: undefined,
        ownerEmail: targetEmail,
        createdByUserId,
        isActivated: false,
        activationToken,
        activationUrl,
        authorizedEmails: createBusinessDto.authorizedEmails ?? [],
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
        customDomain: createBusinessDto.customDomain,
        subdomain,
        stripeCustomerId: stripeCustomer.id,
        stripeSubscriptionId: subscription.id,
        paymentStatus: subscription.status as 'active' | 'past_due' | 'canceled' | 'unpaid',
        nextPaymentDate: this.calculateNextPaymentDate(subscription),
        status: 'active',
        cloudFormationStackName: infrastructure.stackName,
        reactAppUrl: infrastructure.appUrl,
        createdAt: now,
        updatedAt: now,
      };

      // Save to database
      const savedBusiness = await this.databaseService.createBusiness(business);

      // Trigger shard creation for business locations via SQS
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

      this.logger.log(`Business created successfully: ${businessId}`);
      this.logger.log(`Activation URL for owner ${targetEmail}: ${activationUrl}`);

      // Fire and forget activation email
      this.emailService.sendActivationEmail(targetEmail, activationUrl, createBusinessDto.companyName)
        .catch(() => undefined);
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

      // Cancel Stripe subscription
      if (business.stripeSubscriptionId) {
        await this.paymentService.cancelSubscription(business.stripeSubscriptionId);
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

  private getPriceIdForBusinessType(businessType: string): string {
    const priceIds = {
      dental: this.configService.get('STRIPE_DENTAL_PRICE_ID'),
      gym: this.configService.get('STRIPE_GYM_PRICE_ID'),
      hotel: this.configService.get('STRIPE_HOTEL_PRICE_ID'),
    };

    const priceId = priceIds[businessType];
    if (!priceId) {
      throw new BadRequestException(`No price ID configured for business type: ${businessType}`);
    }

    return priceId;
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
} 