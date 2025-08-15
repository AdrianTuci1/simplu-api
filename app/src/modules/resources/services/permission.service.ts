import { Injectable, ForbiddenException } from '@nestjs/common';
import { ResourceType, ResourceAction, Permission } from '../types/base-resource';

@Injectable()
export class PermissionService {
  
  /**
   * Check if user has permission for resource operation
   * Format: resourceType:action (e.g., "clients:create", "invoices:delete")
   */
  async checkPermission(
    userId: string, 
    resourceType: ResourceType, 
    action: ResourceAction
  ): Promise<void> {
    const permission: Permission = `${resourceType}:${action}`;
    
    // TODO: Implement your actual permission checking logic here
    // This could check against:
    // - Database permissions table
    // - JWT token claims  
    // - External auth service
    // - Role-based permissions
    
    const hasPermission = await this.hasPermission(userId, permission);
    
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission}`);
    }
  }

  /**
   * Check if user has specific permission
   * Implement this method based on your auth system
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
   * Get all permissions for a user
   * Useful for frontend to know what actions are available
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // TODO: Implement based on your auth system
    // Return array of permissions like ["clients:create", "clients:read", "invoices:delete"]
    return [];
  }
}