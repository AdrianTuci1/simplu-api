import { Injectable } from '@nestjs/common';
import { BusinessType } from '../../models/unified-data-types';
import { RoleData } from '../../models/common/role-models';
import { citrusShardingService } from '../../../../config/citrus-sharding.config';
import { RolePermissionService } from './role-permission.service';
import { BusinessRoleService } from './business-role.service';

@Injectable()
export class RoleManagerService {
  constructor(
    private readonly rolePermissionService: RolePermissionService,
    private readonly businessRoleService: BusinessRoleService,
  ) {}

  /**
   * Get roles for a specific business and location
   */
  async getRoles(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<RoleData[]> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(
        businessId,
        locationId,
      );
      console.log(`Using shard ${shardConnection.shardId} for roles query`);

      // In real implementation, would query database using shardConnection
      // For now, return system roles + business-specific roles
      const systemRoles = this.getSystemRoles(businessType);
      const businessSpecificRoles =
        this.businessRoleService.getBusinessSpecificRoles(businessType);

      return [...systemRoles, ...businessSpecificRoles];
    } catch (error) {
      console.error('Error fetching roles:', error);
      // Fallback to system roles only
      return this.getSystemRoles(businessType);
    }
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
    const roles = await this.getRoles(businessId, locationId, businessType);
    return roles.find((role) => role.name === roleName) || null;
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
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(
        businessId,
        locationId,
      );
      console.log(`Using shard ${shardConnection.shardId} for role save`);

      // In real implementation, would save to database using shardConnection
      const updatedRole = {
        ...roleData,
        modifiedBy: userId,
        modifiedAt: new Date().toISOString(),
      };

      console.log(`Saving role ${roleData.name} for business ${businessId}`);
      return updatedRole;
    } catch (error) {
      console.error('Error saving role:', error);
      throw error;
    }
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
    try {
      const role = await this.getRole(
        businessId,
        locationId,
        businessType,
        roleName,
      );

      if (!role) {
        return false;
      }

      if (role.isSystemRole) {
        throw new Error('Cannot delete system role');
      }

      const shardConnection = await citrusShardingService.getShardForBusiness(
        businessId,
        locationId,
      );
      console.log(`Using shard ${shardConnection.shardId} for role deletion`);

      // In real implementation, would delete from database using shardConnection
      console.log(`Deleting role ${roleName} for business ${businessId}`);
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get system roles (common across all businesses)
   */
  private getSystemRoles(businessType: BusinessType): RoleData[] {
    return [
      {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access across all business types',
        hierarchy: 100,
        permissions: this.rolePermissionService.getSuperAdminPermissions(),
        active: true,
        businessTypeSpecific: false,
        isSystemRole: true,
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access within business type',
        hierarchy: 90,
        permissions: this.rolePermissionService.getBusinessTypePermissions(
          businessType,
          'admin',
        ),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manage operations and staff',
        hierarchy: 80,
        permissions: this.rolePermissionService.getBusinessTypePermissions(
          businessType,
          'manager',
        ),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'staff',
        displayName: 'Staff',
        description: 'Basic operations',
        hierarchy: 70,
        permissions: this.rolePermissionService.getBusinessTypePermissions(
          businessType,
          'staff',
        ),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        hierarchy: 50,
        permissions: this.rolePermissionService.getBusinessTypePermissions(
          businessType,
          'viewer',
        ),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
    ];
  }
}
