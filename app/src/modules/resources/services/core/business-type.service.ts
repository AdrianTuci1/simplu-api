import { Injectable } from '@nestjs/common';
import { BusinessType } from '../../models/unified-data-types';

@Injectable()
export class BusinessTypeService {
  /**
   * Get business type from business info
   */
  async getBusinessType(
    businessId: string,
    locationId: string,
  ): Promise<BusinessType> {
    // In real implementation, this would query business info service
    // For now, infer from business ID pattern
    const businessIdLower = businessId.toLowerCase();

    if (
      businessIdLower.includes('dental') ||
      businessIdLower.includes('clinic')
    ) {
      return 'dental';
    } else if (
      businessIdLower.includes('gym') ||
      businessIdLower.includes('fitness')
    ) {
      return 'gym';
    } else if (
      businessIdLower.includes('hotel') ||
      businessIdLower.includes('resort')
    ) {
      return 'hotel';
    }

    // Default to dental for unknown business types
    return 'dental';
  }

  /**
   * Get all available resource names for a business type
   */
  getResourceNames(businessType: BusinessType): string[] {
    const resourceMap = {
      dental: [
        'timeline',
        'clients',
        'services',
        'staff',
        'stocks',
        'invoices',
        'activities',
        'reports',
        'roles',
        'sales',
        'workflows',
        'permissions',
        'userData',
        'history',
      ],
      gym: [
        'timeline',
        'members',
        'packages',
        'classes',
        'equipment',
        'staff',
        'stocks',
        'invoices',
        'activities',
        'reports',
        'roles',
        'sales',
        'workflows',
        'permissions',
        'userData',
        'history',
      ],
      hotel: [
        'timeline',
        'clients',
        'rooms',
        'services',
        'staff',
        'stocks',
        'invoices',
        'activities',
        'reports',
        'roles',
        'sales',
        'workflows',
        'permissions',
        'userData',
        'history',
      ],
    };

    return resourceMap[businessType] || [];
  }

  /**
   * Check if a resource type is valid for a business type
   */
  isValidResourceForBusiness(
    businessType: BusinessType,
    resourceType: string,
  ): boolean {
    return this.getResourceNames(businessType).includes(resourceType);
  }
}
