import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResourceType,
  ResourceAction,
  Permission,
} from '../types/base-resource';
import { ResourceQueryService } from './resource-query.service';

// Interfaces for user data from Lambda authorizer
export interface UserLocationRole {
  locationId: string;
  locationName: string;
  role: string;
}

export interface AuthenticatedUser {
  userId: string;
  userName: string;
  email?: string;
  businessId: string;
  roles: UserLocationRole[];
}

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
   *
   * Flow:
   * 1. User comes with data from Lambda authorizer (includes locationId in roles)
   * 2. Check if user has access to the specified locationId
   * 3. Query database using businessId-locationId combination
   * 4. Find role resource and check if it has the required permission
   */
  async checkPermission(
    user: AuthenticatedUser,
    locationId: string,
    resourceType: ResourceType,
    action: ResourceAction,
  ): Promise<void> {
    const permission: Permission = `${resourceType}:${action}`;

    this.logger.debug(
      `Checking permission: ${user.userId} -> ${permission} in location ${locationId}`,
    );

    // Check if Lambda authorizer bypass is enabled for development
    const lambdaAuthorizerConfig = this.configService.get<{
      bypassForDevelopment?: boolean;
    }>('lambdaAuthorizer');
    if (lambdaAuthorizerConfig?.bypassForDevelopment) {
      this.logger.warn(
        `Permission check bypassed for development: ${permission}`,
      );
      return; // Allow all permissions in development mode
    }

    // Check if user has access to this location
    const userRole = user.roles.find((role) => role.locationId === locationId);
    if (!userRole) {
      throw new ForbiddenException(
        `Access denied: No access to location ${locationId}`,
      );
    }

    // Check if user has the required permission for this role
    const hasPermission = await this.hasPermissionForRole(
      userRole,
      permission,
      user.businessId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${permission} for role ${userRole.role} in location ${locationId}`,
      );
    }
  }

  /**
   * Check if a role has a specific permission by querying the RDS database
   */
  private async hasPermissionForRole(
    userRole: UserLocationRole,
    permission: Permission,
    businessId: string,
  ): Promise<boolean> {
    try {
      // Query the database for role permissions using ResourceQueryService
      // Use businessId-locationId combination for the query
      const rolePermissions = await this.getRolePermissionsFromDatabase(
        userRole.role,
        businessId,
        userRole.locationId,
      );

      // Check if the role has the required permission
      const hasPermission = rolePermissions.includes(permission);

      this.logger.debug(
        `Role ${userRole.role} permissions: ${rolePermissions.join(', ')}`,
      );
      this.logger.debug(
        `Required permission: ${permission}, Has permission: ${hasPermission}`,
      );

      return hasPermission;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error checking permission for role ${userRole.role}: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Get permissions for a role from the RDS database
   * This queries the 'resource' table where resourceType = 'role'
   * Uses businessId-locationId combination for the query
   */
  private async getRolePermissionsFromDatabase(
    roleName: string,
    businessId: string,
    locationId: string,
  ): Promise<Permission[]> {
    try {
      // Query the 'resource' table for role permissions
      // Use businessId-locationId combination for the query
      const roleResources = await this.resourceQueryService.queryResources(
        businessId,
        locationId, // Use the specific locationId from the user's role
        {
          resourceType: 'role',
          filters: {
            name: roleName,
          },
          limit: 1,
        },
      );

      if (roleResources.data.length > 0) {
        const roleResource = roleResources.data[0];
        if (
          roleResource.data?.permissions &&
          Array.isArray(roleResource.data.permissions)
        ) {
          const permissions = roleResource.data.permissions as Permission[];
          this.logger.debug(
            `Retrieved permissions for role ${roleName} from database: ${permissions.join(', ')}`,
          );
          return permissions;
        }
      }

      // Fallback to default permissions if not found in database
      const defaultPermissions = this.getDefaultPermissionsForRole(roleName);
      this.logger.debug(
        `Using default permissions for role ${roleName}: ${defaultPermissions.join(', ')}`,
      );

      return defaultPermissions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting permissions for role ${roleName}: ${errorMessage}`,
      );

      // Fallback to default permissions on error
      const defaultPermissions = this.getDefaultPermissionsForRole(roleName);
      this.logger.debug(
        `Using default permissions for role ${roleName} due to error: ${defaultPermissions.join(', ')}`,
      );

      return defaultPermissions;
    }
  }

  /**
   * Get default permissions for a role (fallback implementation)
   * In production, this should be replaced with actual database queries
   */
  private getDefaultPermissionsForRole(roleName: string): Permission[] {
    const rolePermissions: Record<string, Permission[]> = {
      admin: [
        'timeline:create',
        'timeline:read',
        'timeline:update',
        'timeline:delete',
        'clients:create',
        'clients:read',
        'clients:update',
        'clients:delete',
        'staff:create',
        'staff:read',
        'staff:update',
        'staff:delete',
        'invoices:create',
        'invoices:read',
        'invoices:update',
        'invoices:delete',
        'stocks:create',
        'stocks:read',
        'stocks:update',
        'stocks:delete',
        'activities:create',
        'activities:read',
        'activities:update',
        'activities:delete',
        'reports:create',
        'reports:read',
        'reports:update',
        'reports:delete',
        'roles:create',
        'roles:read',
        'roles:update',
        'roles:delete',
        'sales:create',
        'sales:read',
        'sales:update',
        'sales:delete',
        'workflows:create',
        'workflows:read',
        'workflows:update',
        'workflows:delete',
        'permissions:create',
        'permissions:read',
        'permissions:update',
        'permissions:delete',
        'userData:create',
        'userData:read',
        'userData:update',
        'userData:delete',
        'history:create',
        'history:read',
        'history:update',
        'history:delete',
      ],
      manager: [
        'timeline:create',
        'timeline:read',
        'timeline:update',
        'clients:create',
        'clients:read',
        'clients:update',
        'staff:read',
        'staff:update',
        'invoices:create',
        'invoices:read',
        'invoices:update',
        'stocks:read',
        'stocks:update',
        'activities:read',
        'activities:update',
        'reports:read',
        'roles:read',
        'sales:read',
        'sales:update',
        'workflows:read',
        'workflows:update',
        'permissions:read',
        'userData:read',
        'userData:update',
        'history:read',
      ],
      user: [
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
        'history:read',
      ],
      viewer: [
        'timeline:read',
        'clients:read',
        'staff:read',
        'invoices:read',
        'stocks:read',
        'activities:read',
        'reports:read',
        'history:read',
      ],
    };

    return rolePermissions[roleName] || [];
  }

  /**
   * Get all permissions for a user in a specific location
   * Useful for frontend to know what actions are available
   */
  async getUserPermissions(
    user: AuthenticatedUser,
    locationId: string,
  ): Promise<Permission[]> {
    try {
      // Check if user has access to this location
      const userRole = user.roles.find(
        (role) => role.locationId === locationId,
      );
      if (!userRole) {
        this.logger.warn(
          `User ${user.userId} has no access to location ${locationId}`,
        );
        return [];
      }

      // Get permissions for the user's role in this location
      const permissions = await this.getRolePermissionsFromDatabase(
        userRole.role,
        user.businessId,
        userRole.locationId,
      );

      this.logger.debug(
        `User ${user.userId} permissions in location ${locationId}: ${permissions.join(', ')}`,
      );

      return permissions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting permissions for user ${user.userId} in location ${locationId}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get all permissions for a user across all locations
   * Returns a map of locationId -> permissions[]
   */
  async getUserPermissionsAllLocations(
    user: AuthenticatedUser,
  ): Promise<Record<string, Permission[]>> {
    const permissionsByLocation: Record<string, Permission[]> = {};

    for (const role of user.roles) {
      try {
        const permissions = await this.getRolePermissionsFromDatabase(
          role.role,
          user.businessId,
          role.locationId,
        );
        permissionsByLocation[role.locationId] = permissions;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error getting permissions for role ${role.role} in location ${role.locationId}: ${errorMessage}`,
        );
        permissionsByLocation[role.locationId] = [];
      }
    }

    return permissionsByLocation;
  }
}
