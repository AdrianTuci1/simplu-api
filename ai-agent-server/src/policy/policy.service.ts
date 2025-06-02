import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum Action {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SUGGEST = 'suggest',
}

export enum Resource {
  CONVERSATIONS = 'conversations',
  RESERVATIONS = 'reservations',
  USERS = 'users',
  PRICES = 'prices',
}

export interface Policy {
  tenantId: string;
  actions: Action[];
  resources: Resource[];
  conditions?: Record<string, any>;
}

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);
  private policies: Map<string, Policy[]> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    // Default policy for all tenants
    const defaultPolicy: Policy = {
      tenantId: 'default',
      actions: [Action.READ, Action.SUGGEST],
      resources: [Resource.CONVERSATIONS],
      conditions: {
        maxSuggestionsPerDay: 100,
        allowedModels: ['deepseek/deepseek-r1-0528:free'],
      },
    };

    // Test tenant policy
    const testTenantPolicy: Policy = {
      tenantId: 'test-tenant',
      actions: [Action.READ, Action.WRITE, Action.SUGGEST],
      resources: [Resource.CONVERSATIONS],
      conditions: {
        maxSuggestionsPerDay: 1000,
        allowedModels: ['deepseek/deepseek-r1-0528:free'],
      },
    };

    this.policies.set('default', [defaultPolicy]);
    this.policies.set('test-tenant', [testTenantPolicy]);
  }

  async can(tenantId: string, action: Action, resource: Resource): Promise<boolean> {
    try {
      const tenantPolicies = this.policies.get(tenantId) || this.policies.get('default');
      
      if (!tenantPolicies) {
        this.logger.warn(`No policies found for tenant ${tenantId}`);
        return false;
      }

      return tenantPolicies.some(policy => 
        policy.actions.includes(action) && 
        policy.resources.includes(resource)
      );
    } catch (error) {
      this.logger.error(`Error checking policy for tenant ${tenantId}`, error);
      return false;
    }
  }

  async addPolicy(policy: Policy) {
    const existingPolicies = this.policies.get(policy.tenantId) || [];
    this.policies.set(policy.tenantId, [...existingPolicies, policy]);
    this.logger.log(`Added new policy for tenant ${policy.tenantId}`);
  }

  async removePolicy(tenantId: string, policyIndex: number) {
    const existingPolicies = this.policies.get(tenantId);
    if (existingPolicies) {
      existingPolicies.splice(policyIndex, 1);
      this.policies.set(tenantId, existingPolicies);
      this.logger.log(`Removed policy at index ${policyIndex} for tenant ${tenantId}`);
    }
  }

  async getPolicies(tenantId: string): Promise<Policy[]> {
    return this.policies.get(tenantId) || this.policies.get('default') || [];
  }

  async checkRateLimit(tenantId: string, action: Action): Promise<boolean> {
    const policies = await this.getPolicies(tenantId);
    const policy = policies.find(p => p.actions.includes(action));
    
    if (!policy?.conditions?.maxSuggestionsPerDay) {
      return true;
    }

    // TODO: Implement rate limiting logic using Redis or similar
    return true;
  }
} 