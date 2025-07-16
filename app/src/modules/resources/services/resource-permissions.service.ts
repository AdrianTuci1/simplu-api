import { Injectable, ForbiddenException } from '@nestjs/common';
import { BusinessTypeResourceData, RoleData } from '../models/business-types';
import { ResourceModelService } from './resource-model.service';

// Resource actions that can be performed
export type ResourceAction = 'create' | 'read' | 'update' | 'delete' | 'list';

// Business type definitions
export type BusinessType = keyof BusinessTypeResourceData;

// User context for permission checking
export interface UserContext {
  userId: string;
  roles: string[];
  businessId: string;
  locationId?: string;
}

@Injectable()
export class ResourcePermissionsService {
  
  constructor(private readonly resourceModelService: ResourceModelService) {}

  // Cache for role data to avoid repeated database calls
  private roleCache: Map<string, RoleData[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has permission to perform an action on a resource
   */
  async checkPermission(
    user: UserContext,
    businessType: BusinessType,
    resourceName: string,
    action: ResourceAction,
    resourceId?: string,
  ): Promise<boolean> {
    try {
      // Get user's highest role from dynamic role data
      const userRole = await this.getHighestRole(user, businessType);
      if (!userRole) {
        return false;
      }

      // Check if role has permission for this resource
      const resourcePermissions = userRole.permissions[resourceName];
      if (!resourcePermissions) {
        return false;
      }

      // Check if action is allowed
      const hasPermission = resourcePermissions.includes(action);

      // Additional context-based checks can be added here
      if (hasPermission && resourceId) {
        return this.checkResourceSpecificPermission(
          user,
          businessType,
          resourceName,
          action,
          resourceId,
        );
      }

      return hasPermission;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Validate permission and throw exception if not allowed
   */
  async validatePermission(
    user: UserContext,
    businessType: BusinessType,
    resourceName: string,
    action: ResourceAction,
    resourceId?: string,
  ): Promise<void> {
    const hasPermission = await this.checkPermission(
      user,
      businessType,
      resourceName,
      action,
      resourceId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have permission to ${action} ${resourceName} in ${businessType} business`,
      );
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(user: UserContext, businessType: BusinessType): Promise<Record<string, ResourceAction[]>> {
    const userRole = await this.getHighestRole(user, businessType);
    return userRole?.permissions || {};
  }

  /**
   * Get available actions for a user on a specific resource
   */
  async getAvailableActions(
    user: UserContext,
    businessType: BusinessType,
    resourceName: string,
  ): Promise<ResourceAction[]> {
    const userRole = await this.getHighestRole(user, businessType);
    if (!userRole) {
      return [];
    }

    return userRole.permissions[resourceName] || [];
  }

  /**
   * Get user's highest role (by hierarchy) from dynamic role data
   */
  async getHighestRole(user: UserContext, businessType: BusinessType): Promise<RoleData | null> {
    try {
      const roles = await this.getCachedRoles(user.businessId, user.locationId || '', businessType);
      
      let highestRole: RoleData | null = null;
      let highestHierarchy = -1;

      for (const roleName of user.roles) {
        const role = roles.find(r => r.name === roleName && r.active);
        if (role && role.hierarchy > highestHierarchy) {
          highestRole = role;
          highestHierarchy = role.hierarchy;
        }
      }

      return highestRole;
    } catch (error) {
      console.error('Error getting highest role:', error);
      return null;
    }
  }

  /**
   * Get roles for a business with caching
   */
  private async getCachedRoles(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<RoleData[]> {
    const cacheKey = `${businessId}-${locationId}-${businessType}`;
    const now = Date.now();
    
    // Check if cache is valid
    if (
      this.roleCache.has(cacheKey) && 
      this.cacheExpiry.has(cacheKey) &&
      this.cacheExpiry.get(cacheKey)! > now
    ) {
      return this.roleCache.get(cacheKey)!;
    }

    // Fetch fresh data
    const roles = await this.resourceModelService.getRoles(businessId, locationId, businessType);
    
    // Update cache
    this.roleCache.set(cacheKey, roles);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
    
    return roles;
  }

  /**
   * Clear role cache for a specific business (call when roles are updated)
   */
  clearRoleCache(businessId: string, locationId: string, businessType: BusinessType): void {
    const cacheKey = `${businessId}-${locationId}-${businessType}`;
    this.roleCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Additional resource-specific permission checks
   * Can be extended to implement more complex business logic
   */
  private async checkResourceSpecificPermission(
    user: UserContext,
    businessType: BusinessType,
    resourceName: string,
    action: ResourceAction,
    resourceId: string,
  ): Promise<boolean> {
    // Example: Staff can only modify their own records
    if (resourceName === 'staff' && action !== 'read' && action !== 'list') {
      const userRole = await this.getHighestRole(user, businessType);
      if (userRole && userRole.hierarchy < 80) { // Below manager level
        // Check if trying to modify own record
        return resourceId === user.userId;
      }
    }



    return true;
  }

  /**
   * Get all supported business types
   */
  getSupportedBusinessTypes(): BusinessType[] {
    return ['dental', 'gym', 'hotel'];
  }

  /**
   * Get all resource names for a business type
   */
  getResourceNamesForBusinessType(businessType: BusinessType): string[] {
    return this.resourceModelService.getResourceNames(businessType);
  }

  /**
   * Get role hierarchy for debugging/admin purposes
   */
  async getRoleHierarchy(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<Record<string, number>> {
    const roles = await this.getCachedRoles(businessId, locationId, businessType);
    return roles.reduce(
      (acc, role) => {
        acc[role.name] = role.hierarchy;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get all roles for a business (for admin management)
   */
  async getAllRoles(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<RoleData[]> {
    return this.getCachedRoles(businessId, locationId, businessType);
  }

  /**
   * Create or update a role (admin only operation)
   */
  async saveRole(
    user: UserContext,
    businessType: BusinessType,
    roleData: RoleData,
  ): Promise<RoleData> {
    // Validate user has permission to manage roles
    await this.validatePermission(user, businessType, 'roles', 'create');

    // Clear cache after saving
    this.clearRoleCache(user.businessId, user.locationId || '', businessType);

    return this.resourceModelService.saveRole(
      user.businessId,
      user.locationId || '',
      businessType,
      roleData,
      user.userId,
    );
  }

  /**
   * Delete a role (admin only operation)
   */
  async deleteRole(
    user: UserContext,
    businessType: BusinessType,
    roleName: string,
  ): Promise<boolean> {
    // Validate user has permission to delete roles
    await this.validatePermission(user, businessType, 'roles', 'delete');

    // Clear cache after deleting
    this.clearRoleCache(user.businessId, user.locationId || '', businessType);

    return this.resourceModelService.deleteRole(
      user.businessId,
      user.locationId || '',
      businessType,
      roleName,
    );
  }
} 