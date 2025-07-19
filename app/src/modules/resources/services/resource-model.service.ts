import { Injectable } from '@nestjs/common';
import { 
  BusinessResourceDataMap, 
  BusinessType 
} from '../models/unified-data-types';
import { RoleData } from '../models/common/role-models';
import { 
  BusinessTypeService, 
  ResourceStructureService, 
  ResourceValidatorService 
} from './core';
import { RoleManagerService } from './roles';

@Injectable()
export class ResourceModelService {
  
  constructor(
    private readonly businessTypeService: BusinessTypeService,
    private readonly resourceStructureService: ResourceStructureService,
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly roleManagerService: RoleManagerService,
  ) {}

  /**
   * Get typed resource data structure for a business type and resource
   */
  getResourceStructure<
    TBusinessType extends BusinessType,
    TResourceName extends keyof BusinessResourceDataMap[TBusinessType]
  >(
    businessType: TBusinessType,
    resourceName: TResourceName,
  ): Partial<BusinessResourceDataMap[TBusinessType][TResourceName]> {
    return this.resourceStructureService.getResourceStructure(businessType, resourceName);
  }

  /**
   * Validate resource data against the expected structure
   */
  validateResourceData<
    TBusinessType extends BusinessType,
    TResourceName extends keyof BusinessResourceDataMap[TBusinessType]
  >(
    businessType: TBusinessType,
    resourceName: TResourceName,
    data: any,
  ): data is BusinessResourceDataMap[TBusinessType][TResourceName] {
    return this.resourceValidatorService.validateResourceData(businessType, resourceName, data);
  }

  /**
   * Get all available resource names for a business type
   */
  getResourceNames(businessType: BusinessType): string[] {
    return this.businessTypeService.getResourceNames(businessType);
  }

  /**
   * Get roles for a specific business and location
   */
  async getRoles(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<RoleData[]> {
    return this.roleManagerService.getRoles(businessId, locationId, businessType);
  }

  /**
   * Get a specific role by name
   */
  async getRole(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
    roleName: string,
  ): Promise<RoleData | null> {
    return this.roleManagerService.getRole(businessId, locationId, businessType, roleName);
  }

  /**
   * Create or update a role
   */
  async saveRole(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
    roleData: RoleData,
    userId: string,
  ): Promise<RoleData> {
    return this.roleManagerService.saveRole(businessId, locationId, businessType, roleData, userId);
  }

  /**
   * Delete a role (only if not system role)
   */
  async deleteRole(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
    roleName: string,
  ): Promise<boolean> {
    return this.roleManagerService.deleteRole(businessId, locationId, businessType, roleName);
  }

} 