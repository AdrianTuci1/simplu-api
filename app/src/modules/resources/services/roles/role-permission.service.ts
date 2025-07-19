import { Injectable } from '@nestjs/common';
import { BusinessType } from '../../models/unified-data-types';
import { BusinessTypeService } from '../core/business-type.service';

type Permission = 'create' | 'read' | 'update' | 'delete' | 'list';

@Injectable()
export class RolePermissionService {
  
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  /**
   * Get permissions for a business type and role level
   */
  getBusinessTypePermissions(businessType: BusinessType, roleLevel: string): Record<string, Permission[]> {
    const resourceNames = this.businessTypeService.getResourceNames(businessType);
    const permissions: Record<string, Permission[]> = {};

    for (const resourceName of resourceNames) {
      switch (roleLevel) {
        case 'admin':
          permissions[resourceName] = ['create', 'read', 'update', 'delete', 'list'];
          if (resourceName === 'roles') {
            permissions[resourceName] = ['create', 'read', 'update', 'list']; // Can't delete system roles
          }
          break;
        case 'manager':
          permissions[resourceName] = ['create', 'read', 'update', 'list'];
          if (resourceName === 'roles') {
            permissions[resourceName] = ['read', 'list'];
          }
          break;
        case 'staff':
          permissions[resourceName] = ['create', 'read', 'update', 'list'];
          if (resourceName === 'roles' || resourceName === 'staff') {
            permissions[resourceName] = ['read', 'list'];
          }
          break;
        case 'viewer':
          permissions[resourceName] = ['read', 'list'];
          break;
      }
    }

    return permissions;
  }

  /**
   * Get super admin permissions (all resources, all actions)
   */
  getSuperAdminPermissions(): Record<string, Permission[]> {
    const allResources = [
      // Common resources
      'stocks', 'invoices', 'activities', 'reports', 'roles', 'sales', 'workflows', 'permissions', 'userData', 'history',
      // Dental resources
      'clients', 'services', 'staff', 'timeline',
      // Gym resources  
      'members', 'packages', 'classes', 'equipment',
      // Hotel resources
      'rooms'
    ];

    const permissions: Record<string, Permission[]> = {};
    for (const resource of allResources) {
      permissions[resource] = ['create', 'read', 'update', 'delete', 'list'];
    }

    return permissions;
  }

  /**
   * Check if a role has permission for a specific action on a resource
   */
  hasPermission(
    rolePermissions: Record<string, Permission[]>,
    resourceName: string,
    action: Permission
  ): boolean {
    const resourcePermissions = rolePermissions[resourceName];
    return resourcePermissions ? resourcePermissions.includes(action) : false;
  }
}