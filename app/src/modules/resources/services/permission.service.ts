import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResourceType,
  ResourceAction,
  Permission,
} from '../types/base-resource';
import { ResourceQueryService } from './resource-query.service';

// Interfaces for user data from Cognito
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
   * New Flow:
   * 1. User comes with Cognito user ID
   * 2. Query resursa "medic" using Cognito user ID as resource_id
   * 3. Extract role from medic.data.role
   * 4. Query resursa "roles" using role name
   * 5. Extract permissions from roles.data.permissions
   * 6. Check if user has the required permission
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

    // Check if authentication bypass is enabled for development
    const authBypass = this.configService.get<boolean>('AUTH_BYPASS');
    if (authBypass) {
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
      locationId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${permission} for role ${userRole.role} in location ${locationId}`,
      );
    }
  }

  /**
   * Check if a role has a specific permission by querying the database
   * New flow: Query medic -> extract role -> query roles -> check permissions
   */
  private async hasPermissionForRole(
    userRole: UserLocationRole,
    permission: Permission,
    businessId: string,
    locationId: string,
  ): Promise<boolean> {
    try {
      // Get permissions for the user's role in this location
      const permissions = await this.getRolePermissionsFromDatabase(
        userRole.role,
        businessId,
        locationId,
      );

      // Check if the role has the required permission
      const hasPermission = permissions.includes(permission);

      this.logger.debug(
        `Role ${userRole.role} permissions: ${permissions.join(', ')}`,
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
   * Get permissions for a role from the database
   * New flow: Query medic -> extract role -> query roles -> extract permissions
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
        locationId,
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
   * Get user permissions by querying medic resource first, then roles resource
   * This is the new main method for getting permissions
   */
  async getUserPermissionsFromMedic(
    cognitoUserId: string,
    businessId: string,
    locationId: string,
  ): Promise<Permission[]> {
    try {
      this.logger.debug(
        `Getting permissions for Cognito user ${cognitoUserId} in ${businessId}/${locationId}`,
      );

      // Step 1: Query resursa "medic" using Cognito user ID as resource_id
      const medicResource = await this.resourceQueryService.getResourceById(
        businessId,
        locationId,
        'medic',
        cognitoUserId, // Use Cognito user ID to find medic resource
      );

      if (!medicResource) {
        this.logger.warn(
          `No medic resource found for Cognito user ${cognitoUserId} in ${businessId}/${locationId}`,
        );
        return [];
      }
      const roleName = medicResource.data?.role;

      if (!roleName) {
        this.logger.warn(
          `No role found in medic resource for user ${cognitoUserId}`,
        );
        return [];
      }

      this.logger.debug(`Found role ${roleName} for user ${cognitoUserId}`);

      // Step 2: Query resursa "roles" using role name
      // For roles, we need to find by name, so we'll use queryResources with name filter
      const roleResources = await this.resourceQueryService.queryResources(
        businessId,
        locationId,
        {
          resourceType: 'role',
          filters: {
            name: roleName,
          },
          limit: 1,
        },
      );

      if (roleResources.data.length === 0) {
        this.logger.warn(
          `No role resource found for role ${roleName} in ${businessId}/${locationId}`,
        );
        return [];
      }

      const roleResource = roleResources.data[0];
      const permissions = roleResource.data?.permissions;

      if (!permissions || !Array.isArray(permissions)) {
        this.logger.warn(
          `No permissions found in role resource for role ${roleName}`,
        );
        return [];
      }

      this.logger.debug(
        `Retrieved permissions for role ${roleName}: ${permissions.join(', ')}`,
      );

      return permissions as Permission[];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting permissions for user ${cognitoUserId}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Check permission using the new medic -> roles flow
   */
  async checkPermissionFromMedic(
    cognitoUserId: string,
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    action: ResourceAction,
  ): Promise<void> {
    const permission: Permission = `${resourceType}:${action}`;

    this.logger.debug(
      `Checking permission from medic: ${cognitoUserId} -> ${permission} in ${businessId}/${locationId}`,
    );

    // Check if authentication bypass is enabled for development
    const authBypass = this.configService.get<boolean>('AUTH_BYPASS');
    if (authBypass) {
      this.logger.warn(
        `Permission check bypassed for development: ${permission}`,
      );
      return; // Allow all permissions in development mode
    }

    // Get user permissions using the new medic -> roles flow
    const permissions = await this.getUserPermissionsFromMedic(
      cognitoUserId,
      businessId,
      locationId,
    );

    // Check if user has the required permission
    const hasPermission = permissions.includes(permission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${permission} for user ${cognitoUserId} in location ${locationId}`,
      );
    }

    this.logger.debug(
      `Permission ${permission} granted for user ${cognitoUserId}`,
    );
  }

  /**
   * Get default permissions for a role (fallback implementation)
   * In production, this should be replaced with actual database queries
   */
  private getDefaultPermissionsForRole(roleName: string): Permission[] {
    const rolePermissions: Record<string, Permission[]> = {
      admin: [
        // Appointment management
        'appointment:create',
        'appointment:read',
        'appointment:update',
        'appointment:patch',
        'appointment:delete',
        
        // Patient management
        'patient:create',
        'patient:read',
        'patient:update',
        'patient:patch',
        'patient:delete',
        
        // Medic management
        'medic:create',
        'medic:read',
        'medic:update',
        'medic:patch',
        'medic:delete',
        
        // Treatment management
        'treatment:create',
        'treatment:read',
        'treatment:update',
        'treatment:patch',
        'treatment:delete',
        
        // Product management
        'product:create',
        'product:read',
        'product:update',
        'product:patch',
        'product:delete',
        
        // Role management
        'role:create',
        'role:read',
        'role:update',
        'role:patch',
        'role:delete',
        
        // Reports
        'report:create',
        'report:read',
        'report:update',
        'report:patch',
        'report:delete',
        
        // Sales
        'sale:create',
        'sale:read',
        'sale:update',
        'sale:patch',
        'sale:delete',
        
        // Dental chart
        'dental-chart:create',
        'dental-chart:read',
        'dental-chart:update',
        'dental-chart:patch',
        'dental-chart:delete',
        
        // Plans
        'plan:create',
        'plan:read',
        'plan:update',
        'plan:patch',
        'plan:delete',
        
        // Settings
        'setting:create',
        'setting:read',
        'setting:update',
        'setting:patch',
        'setting:delete',
        
        // Invoice client
        'invoice-client:create',
        'invoice-client:read',
        'invoice-client:update',
        'invoice-client:patch',
        'invoice-client:delete',
        
        // Statistics
        'statistics:create',
        'statistics:read',
        'statistics:update',
        'statistics:patch',
        'statistics:delete',
        
        // Recent activities
        'recent-activities:create',
        'recent-activities:read',
        'recent-activities:update',
        'recent-activities:patch',
        'recent-activities:delete',
      ],
      manager: [
        // Appointment management
        'appointment:create',
        'appointment:read',
        'appointment:update',
        'appointment:patch',
        
        // Patient management
        'patient:create',
        'patient:read',
        'patient:update',
        'patient:patch',
        
        // Medic management (limited)
        'medic:read',
        'medic:update',
        'medic:patch',
        
        // Treatment management
        'treatment:create',
        'treatment:read',
        'treatment:update',
        'treatment:patch',
        
        // Product management
        'product:read',
        'product:update',
        'product:patch',
        
        // Role management (read-only)
        'role:read',
        
        // Reports
        'report:read',
        'report:update',
        'report:patch',
        
        // Sales
        'sale:read',
        'sale:update',
        'sale:patch',
        
        // Dental chart
        'dental-chart:read',
        'dental-chart:update',
        'dental-chart:patch',
        
        // Plans
        'plan:read',
        'plan:update',
        'plan:patch',
        
        // Settings
        'setting:read',
        'setting:update',
        'setting:patch',
        
        // Invoice client
        'invoice-client:read',
        'invoice-client:update',
        'invoice-client:patch',
        
        // Statistics
        'statistics:read',
        
        // Recent activities
        'recent-activities:read',
      ],
      user: [
        // Appointment management (read-only)
        'appointment:read',
        
        // Patient management (read-only)
        'patient:read',
        
        // Medic management (read-only)
        'medic:read',
        
        // Treatment management (read-only)
        'treatment:read',
        
        // Product management (read-only)
        'product:read',
        
        // Role management (read-only)
        'role:read',
        
        // Reports (read-only)
        'report:read',
        
        // Sales (read-only)
        'sale:read',
        
        // Dental chart (read-only)
        'dental-chart:read',
        
        // Plans (read-only)
        'plan:read',
        
        // Settings (read-only)
        'setting:read',
        
        // Invoice client (read-only)
        'invoice-client:read',
        
        // Statistics (read-only)
        'statistics:read',
        
        // Recent activities (read-only)
        'recent-activities:read',
      ],
      viewer: [
        // Read-only access to all resources
        'appointment:read',
        'patient:read',
        'medic:read',
        'treatment:read',
        'product:read',
        'report:read',
        'sale:read',
        'dental-chart:read',
        'plan:read',
        'setting:read',
        'invoice-client:read',
        'statistics:read',
        'recent-activities:read',
      ],
    };

    return rolePermissions[roleName] || [];
  }

  /**
   * Get all permissions for a user in a specific location using the new medic -> roles flow
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

      // Use the new medic -> roles flow
      return await this.getUserPermissionsFromMedic(
        user.userId,
        user.businessId,
        locationId,
      );
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
   * Get all permissions for a user across all locations using the new medic -> roles flow
   */
  async getUserPermissionsAllLocations(
    user: AuthenticatedUser,
  ): Promise<Record<string, Permission[]>> {
    const permissionsByLocation: Record<string, Permission[]> = {};

    for (const role of user.roles) {
      try {
        const permissions = await this.getUserPermissionsFromMedic(
          user.userId,
          user.businessId,
          role.locationId,
        );
        permissionsByLocation[role.locationId] = permissions;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error getting permissions for user ${user.userId} in location ${role.locationId}: ${errorMessage}`,
        );
        permissionsByLocation[role.locationId] = [];
      }
    }

    return permissionsByLocation;
  }

  /**
   * Get all user roles from all locations in a business
   * Uses LIKE operator to search for business_location_id starting with businessId
   */
  async getAllUserRolesFromBusiness(
    cognitoUserId: string,
    businessId: string,
  ): Promise<Array<{
    locationId: string;
    locationName: string;
    roleName: string;
  }>> {
    try {
      this.logger.debug(
        `Getting all roles for Cognito user ${cognitoUserId} in business ${businessId}`,
      );

      // Search for all medic resources where business_location_id starts with businessId
      // This will find resources from all locations in the business
      const medicResources = await this.resourceQueryService.searchResourcesByBusinessPattern(
        businessId,
        'medic',
        cognitoUserId,
      );

      if (medicResources.length === 0) {
        this.logger.warn(
          `No medic resources found for Cognito user ${cognitoUserId} in business ${businessId}`,
        );
        return [];
      }

      const userRoles: Array<{
        locationId: string;
        locationName: string;
        roleName: string;
      }> = [];

      // Process each medic resource to extract role information
      for (const medicResource of medicResources) {
        try {
          const roleName = medicResource.data?.role;
          if (!roleName) {
            this.logger.warn(
              `No role found in medic resource for user ${cognitoUserId} in business location ${medicResource.business_location_id}`,
            );
            continue;
          }

          // Extract locationId from business_location_id (format: B010001-L010001)
          const businessLocationId = medicResource.business_location_id;
          const locationId = businessLocationId.split('-')[1]; // Extract L010001 part
          
          // For now, use locationId as locationName (you might want to fetch this from a service)
          const locationName = locationId;

          userRoles.push({
            locationId,
            locationName,
            roleName,
          });

          this.logger.debug(
            `Found role ${roleName} for user ${cognitoUserId} in location ${locationId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing medic resource for user ${cognitoUserId}: ${error.message}`,
          );
          continue;
        }
      }

      this.logger.debug(
        `Retrieved ${userRoles.length} roles for user ${cognitoUserId} in business ${businessId}`,
      );

      return userRoles;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting all user roles from business ${businessId}: ${errorMessage}`,
      );
      return [];
    }
  }
}
