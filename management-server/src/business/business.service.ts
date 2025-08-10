import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { BusinessEntity, BusinessLocation, BusinessSettings, BusinessStatus } from './entities/business.entity';
import { ShardManagementService } from '../shared/services/shard-management.service';
import { InfrastructureService } from '../infrastructure/infrastructure.service';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly shardService: ShardManagementService,
    private readonly infraService: InfrastructureService,
  ) {}

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
    const byEmail = await this.db.getBusinessesByAuthorizedEmail(userEmail);
    // Merge unique by id
    const map = new Map<string, BusinessEntity>();
    [...byOwner, ...byEmail].forEach((b) => map.set(b.businessId, b));
    return Array.from(map.values());
  }

  async updateBusiness(businessId: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity> {
    if (updates.subscriptionType === 'solo' && updates.locations && updates.locations.length > 1) {
      throw new BadRequestException('Planul solo permite o singură locație');
    }
    return this.db.updateBusiness(businessId, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteBusiness(businessId: string): Promise<void> {
    // In a real implementation, trigger shard + stack deletion here via infra
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

