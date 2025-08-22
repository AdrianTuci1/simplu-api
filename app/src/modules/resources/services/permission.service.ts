import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResourceType, ResourceAction, Permission } from '../types/base-resource';
import { AuthenticatedUser } from '../../auth/auth.service';
import { LocationRole } from '../../auth/interfaces';
import { ResourceQueryService } from './resource-query.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly resourceQueryService: ResourceQueryService,
    private readonly configService: ConfigService,
  ) {}
  
  /**
   * Check if user has permission for resource operation in a specific location
   * Format: resourceType:action (e.g., "clients:create", "invoices:delete")
   */
  async checkPermission(
    user: AuthenticatedUser,
    locationId: string,
    resourceType: ResourceType, 
    action: ResourceAction
  ): Promise<void> {
    const permission: Permission = `${resourceType}:${action}`;
    
    this.logger.debug(`Checking permission: ${user.userId} -> ${permission} in location ${locationId}`);
    
    // Check if Lambda authorizer bypass is enabled for development
    const lambdaAuthorizerConfig = this.configService.get('lambdaAuthorizer');
    if (lambdaAuthorizerConfig.bypassForDevelopment) {
      this.logger.warn(`Permission check bypassed for development: ${permission}`);
      return; // Allow all permissions in development mode
    }
    
    // Check if user has access to this location
    const userRole = user.roles.find(role => role.locationId === locationId);
    if (!userRole) {
      throw new ForbiddenException(`Access denied: No access to location ${locationId}`);
    }
    
    // Check if user has the required permission for this role
    const hasPermission = await this.hasPermissionForRole(userRole, permission);
    
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission} for role ${userRole.role} in location ${locationId}`);
    }
  }

  /**
   * Check if user has permission for resource operation (legacy method)
   * @deprecated Use checkPermission(user, locationId, resourceType, action) instead
   */
  async checkPermissionLegacy(
    userId: string, 
    resourceType: ResourceType, 
    action: ResourceAction
  ): Promise<void> {
    const permission: Permission = `${resourceType}:${action}`;
    
    const hasPermission = await this.hasPermission(userId, permission);
    
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission}`);
    }
  }

  /**
   * Check if a role has a specific permission by querying the database
   */
  private async hasPermissionForRole(userRole: LocationRole, permission: Permission): Promise<boolean> {
    try {
      // Query the database for role permissions
      const rolePermissions = await this.getRolePermissionsFromDatabase(userRole.role);
      
      // Check if the role has the required permission
      const hasPermission = rolePermissions.includes(permission);
      
      this.logger.debug(`Role ${userRole.role} permissions: ${rolePermissions.join(', ')}`);
      this.logger.debug(`Required permission: ${permission}, Has permission: ${hasPermission}`);
      
      return hasPermission;
    } catch (error) {
      this.logger.error(`Error checking permission for role ${userRole.role}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get permissions for a role from the database
   * This queries the 'roles' resource to get the permissions associated with a role
   */
  private async getRolePermissionsFromDatabase(roleName: string): Promise<Permission[]> {
    try {
      // Try to get role permissions from database first
      const rolePermissions = await this.getRolePermissionsFromDatabaseQuery(roleName);
      
      if (rolePermissions.length > 0) {
        this.logger.debug(`Retrieved permissions for role ${roleName} from database: ${rolePermissions.join(', ')}`);
        return rolePermissions;
      }
      
      // Fallback to default permissions if not found in database
      const defaultPermissions = this.getDefaultPermissionsForRole(roleName);
      this.logger.debug(`Using default permissions for role ${roleName}: ${defaultPermissions.join(', ')}`);
      
      return defaultPermissions;
    } catch (error) {
      this.logger.error(`Error getting permissions for role ${roleName}: ${error.message}`);
      
      // Fallback to default permissions on error
      const defaultPermissions = this.getDefaultPermissionsForRole(roleName);
      this.logger.debug(`Using default permissions for role ${roleName} due to error: ${defaultPermissions.join(', ')}`);
      
      return defaultPermissions;
    }
  }

  /**
   * Query the database for role permissions
   * This method queries the 'roles' resource in the database
   */
  private async getRolePermissionsFromDatabaseQuery(roleName: string): Promise<Permission[]> {
    try {
      // TODO: Implement actual database query
      // This should query the 'roles' resource to find the role and its permissions
      // For now, we'll use a mock implementation
      
      // Example implementation:
      // 1. Query the 'roles' resource type
      // 2. Filter by role name
      // 3. Extract permissions from the role data
      
      // Mock implementation - replace with actual database query
      const mockRoleData = this.getMockRoleData(roleName);
      
      if (mockRoleData) {
        return mockRoleData.permissions || [];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error querying database for role ${roleName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Mock role data for testing - replace with actual database query
   */
  private getMockRoleData(roleName: string): { permissions: Permission[] } | null {
    const mockRoles: Record<string, { permissions: Permission[] }> = {
      'admin': {
        permissions: [
          'timeline:create', 'timeline:read', 'timeline:update', 'timeline:delete',
          'clients:create', 'clients:read', 'clients:update', 'clients:delete',
          'staff:create', 'staff:read', 'staff:update', 'staff:delete',
          'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
          'stocks:create', 'stocks:read', 'stocks:update', 'stocks:delete',
          'activities:create', 'activities:read', 'activities:update', 'activities:delete',
          'reports:create', 'reports:read', 'reports:update', 'reports:delete',
          'roles:create', 'roles:read', 'roles:update', 'roles:delete',
          'sales:create', 'sales:read', 'sales:update', 'sales:delete',
          'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
          'permissions:create', 'permissions:read', 'permissions:update', 'permissions:delete',
          'userData:create', 'userData:read', 'userData:update', 'userData:delete',
          'history:create', 'history:read', 'history:update', 'history:delete'
        ]
      },
      'manager': {
        permissions: [
          'timeline:create', 'timeline:read', 'timeline:update',
          'clients:create', 'clients:read', 'clients:update',
          'staff:read', 'staff:update',
          'invoices:create', 'invoices:read', 'invoices:update',
          'stocks:read', 'stocks:update',
          'activities:read', 'activities:update',
          'reports:read',
          'roles:read',
          'sales:read', 'sales:update',
          'workflows:read', 'workflows:update',
          'permissions:read',
          'userData:read', 'userData:update',
          'history:read'
        ]
      },
      'user': {
        permissions: [
          'timeline:read',
          'clients:read',
          'staff:read',
          'invoices:read',
          'stocks:read',
          'activities:read',
          'reports:read',
          'roles:read',
          'sales:read',
          'workflows:read',
          'permissions:read',
          'userData:read',
          'history:read'
        ]
      },
      'viewer': {
        permissions: [
          'timeline:read',
          'clients:read',
          'staff:read',
          'invoices:read',
          'stocks:read',
          'activities:read',
          'reports:read',
          'history:read'
        ]
      }
    };

    return mockRoles[roleName] || null;
  }

  /**
   * Get default permissions for a role (temporary implementation)
   * In production, this should be replaced with actual database queries
   */
  private getDefaultPermissionsForRole(roleName: string): Permission[] {
    const rolePermissions: Record<string, Permission[]> = {
      'admin': [
        'timeline:create', 'timeline:read', 'timeline:update', 'timeline:delete',
        'clients:create', 'clients:read', 'clients:update', 'clients:delete',
        'staff:create', 'staff:read', 'staff:update', 'staff:delete',
        'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
        'stocks:create', 'stocks:read', 'stocks:update', 'stocks:delete',
        'activities:create', 'activities:read', 'activities:update', 'activities:delete',
        'reports:create', 'reports:read', 'reports:update', 'reports:delete',
        'roles:create', 'roles:read', 'roles:update', 'roles:delete',
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
        'permissions:create', 'permissions:read', 'permissions:update', 'permissions:delete',
        'userData:create', 'userData:read', 'userData:update', 'userData:delete',
        'history:create', 'history:read', 'history:update', 'history:delete'
      ],
      'manager': [
        'timeline:create', 'timeline:read', 'timeline:update',
        'clients:create', 'clients:read', 'clients:update',
        'staff:read', 'staff:update',
        'invoices:create', 'invoices:read', 'invoices:update',
        'stocks:read', 'stocks:update',
        'activities:read', 'activities:update',
        'reports:read',
        'roles:read',
        'sales:read', 'sales:update',
        'workflows:read', 'workflows:update',
        'permissions:read',
        'userData:read', 'userData:update',
        'history:read'
      ],
      'user': [
        'timeline:read',
        'clients:read',
        'staff:read',
        'invoices:read',
        'stocks:read',
        'activities:read',
        'reports:read',
        'roles:read',
        'sales:read',
        'workflows:read',
        'permissions:read',
        'userData:read',
        'history:read'
      ],
      'viewer': [
        'timeline:read',
        'clients:read',
        'staff:read',
        'invoices:read',
        'stocks:read',
        'activities:read',
        'reports:read',
        'history:read'
      ]
    };

    return rolePermissions[roleName] || [];
  }

  /**
   * Check if user has specific permission (legacy method)
   * @deprecated Use hasPermissionForRole instead
   */
  private async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    // TODO: Replace with your actual permission checking logic
    // Examples:
    
    // Option 1: Database lookup
    // const userPermissions = await this.userRepository.getPermissions(userId);
    // return userPermissions.includes(permission);
    
    // Option 2: JWT token claims
    // const token = this.jwtService.decode(authToken);
    // return token.permissions?.includes(permission);
    
    // Option 3: Role-based
    // const userRoles = await this.getUserRoles(userId);
    // const rolePermissions = await this.getRolePermissions(userRoles);
    // return rolePermissions.includes(permission);
    
    // For now, return true (allow all) - REMOVE THIS IN PRODUCTION
    console.log(`Permission check: ${userId} -> ${permission}`);
    return true;
  }

  /**
   * Get all permissions for a user in a specific location
   * Useful for frontend to know what actions are available
   */
  async getUserPermissions(user: AuthenticatedUser, locationId: string): Promise<Permission[]> {
    try {
      // Check if user has access to this location
      const userRole = user.roles.find(role => role.locationId === locationId);
      if (!userRole) {
        this.logger.warn(`User ${user.userId} has no access to location ${locationId}`);
        return [];
      }

      // Get permissions for the user's role in this location
      const permissions = await this.getRolePermissionsFromDatabase(userRole.role);
      
      this.logger.debug(`User ${user.userId} permissions in location ${locationId}: ${permissions.join(', ')}`);
      
      return permissions;
    } catch (error) {
      this.logger.error(`Error getting permissions for user ${user.userId} in location ${locationId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all permissions for a user across all locations
   * Returns a map of locationId -> permissions[]
   */
  async getUserPermissionsAllLocations(user: AuthenticatedUser): Promise<Record<string, Permission[]>> {
    const permissionsByLocation: Record<string, Permission[]> = {};

    for (const role of user.roles) {
      try {
        const permissions = await this.getRolePermissionsFromDatabase(role.role);
        permissionsByLocation[role.locationId] = permissions;
      } catch (error) {
        this.logger.error(`Error getting permissions for role ${role.role} in location ${role.locationId}: ${error.message}`);
        permissionsByLocation[role.locationId] = [];
      }
    }

    return permissionsByLocation;
  }

  /**
   * Get all permissions for a user (legacy method)
   * @deprecated Use getUserPermissions(user, locationId) instead
   */
  async getUserPermissionsLegacy(userId: string): Promise<Permission[]> {
    // TODO: Implement based on your auth system
    // Return array of permissions like ["clients:create", "clients:read", "invoices:delete"]
    return [];
  }
}