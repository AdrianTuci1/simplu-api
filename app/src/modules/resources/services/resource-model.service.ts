import { Injectable } from '@nestjs/common';
import { 
  BusinessResourceDataMap, 
  BusinessType 
} from '../models/unified-data-types';
import { RoleData } from '../models/common/role-models';
import { citrusShardingService } from '../../../config/citrus-sharding.config';

@Injectable()
export class ResourceModelService {
  
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
    // Return the structure/template for the resource type
    return this.getDefaultResourceData(businessType, resourceName as string);
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
    try {
      const requiredFields = this.getRequiredFields(businessType, resourceName as string);
      
      for (const field of requiredFields) {
        if (!(field in data) || data[field] === undefined || data[field] === null) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Resource validation error:', error);
      return false;
    }
  }

  /**
   * Get all available resource names for a business type
   */
  getResourceNames(businessType: BusinessType): string[] {
    const resourceMap = {
      dental: ['patients', 'appointments', 'treatments', 'staff', 'roles'],
      gym: ['members', 'memberships', 'classes', 'equipment', 'roles'],
      hotel: ['guests', 'reservations', 'rooms', 'services', 'roles'],
    };

    return resourceMap[businessType] || [];
  }

  /**
   * Get roles for a specific business and location
   */
  async getRoles(
    businessId: string,
    locationId: string,
    businessType: BusinessType,
  ): Promise<RoleData[]> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      
      // Mock implementation - in real system would query database
      return this.getMockRoles(businessType);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return this.getMockRoles(businessType);
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
    return roles.find(role => role.name === roleName) || null;
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
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      
      // Mock implementation - in real system would save to database
      const updatedRole = {
        ...roleData,
        modifiedBy: userId,
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
      const role = await this.getRole(businessId, locationId, businessType, roleName);
      
      if (!role) {
        return false;
      }

      if (role.isSystemRole) {
        throw new Error('Cannot delete system role');
      }

      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      
      // Mock implementation - in real system would delete from database
      console.log(`Deleting role ${roleName} for business ${businessId}`);
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get required fields for a resource type
   */
  private getRequiredFields(businessType: BusinessType, resourceName: string): string[] {
    const requiredFieldsMap: Record<string, Record<string, string[]>> = {
      dental: {
        patients: ['firstName', 'lastName', 'email', 'phone', 'status'],
        appointments: ['patientId', 'dentistId', 'appointmentDate', 'duration', 'status'],
        treatments: ['name', 'description', 'duration', 'cost', 'category', 'active'],
        staff: ['firstName', 'lastName', 'email', 'phone', 'role', 'status'],
        roles: ['name', 'displayName', 'hierarchy', 'permissions', 'active'],
      },
      gym: {
        members: ['firstName', 'lastName', 'email', 'phone', 'membershipType', 'status'],
        memberships: ['name', 'description', 'duration', 'price', 'active'],
        classes: ['name', 'instructorId', 'date', 'duration', 'maxCapacity', 'category'],
        equipment: ['name', 'category', 'manufacturer', 'model', 'status'],
        roles: ['name', 'displayName', 'hierarchy', 'permissions', 'active'],
      },
      hotel: {
        guests: ['firstName', 'lastName', 'email', 'phone', 'idDocument', 'status'],
        reservations: ['guestId', 'roomId', 'checkInDate', 'checkOutDate', 'status'],
        rooms: ['roomNumber', 'roomType', 'floor', 'capacity', 'bedType', 'status'],
        services: ['name', 'description', 'category', 'active'],
        roles: ['name', 'displayName', 'hierarchy', 'permissions', 'active'],
      },
    };

    return requiredFieldsMap[businessType]?.[resourceName] || [];
  }

  /**
   * Get default/template data for a resource type
   */
  private getDefaultResourceData(businessType: BusinessType, resourceName: string): any {
    const defaults: Record<string, Record<string, any>> = {
      dental: {
        patients: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          status: 'active',
        },
        appointments: {
          patientId: '',
          dentistId: '',
          treatmentId: '',
          appointmentDate: '',
          duration: 60,
          status: 'scheduled',
        },
        treatments: {
          name: '',
          description: '',
          duration: 30,
          cost: 0,
          category: 'cleaning',
          requiresAnesthesia: false,
          followUpRequired: false,
          active: true,
        },
        staff: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'staff',
          status: 'active',
          workingHours: {},
        },
        roles: {
          name: '',
          displayName: '',
          description: '',
          hierarchy: 50,
          permissions: {},
          active: true,
          businessTypeSpecific: true,
          isSystemRole: false,
        },
      },
      // Similar defaults for other business types...
    };

    return defaults[businessType]?.[resourceName] || {};
  }

  /**
   * Mock roles data - in real implementation would come from database
   */
  private getMockRoles(businessType: BusinessType): RoleData[] {
    const commonRoles: RoleData[] = [
      {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access across all business types',
        hierarchy: 100,
        permissions: {
          patients: ['create', 'read', 'update', 'delete', 'list'],
          appointments: ['create', 'read', 'update', 'delete', 'list'],
          treatments: ['create', 'read', 'update', 'delete', 'list'],
          staff: ['create', 'read', 'update', 'delete', 'list'],
          roles: ['create', 'read', 'update', 'delete', 'list'],
          members: ['create', 'read', 'update', 'delete', 'list'],
          memberships: ['create', 'read', 'update', 'delete', 'list'],
          classes: ['create', 'read', 'update', 'delete', 'list'],
          equipment: ['create', 'read', 'update', 'delete', 'list'],
          guests: ['create', 'read', 'update', 'delete', 'list'],
          reservations: ['create', 'read', 'update', 'delete', 'list'],
          rooms: ['create', 'read', 'update', 'delete', 'list'],
          services: ['create', 'read', 'update', 'delete', 'list'],
        },
        active: true,
        businessTypeSpecific: false,
        isSystemRole: true,
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access within business type',
        hierarchy: 90,
        permissions: this.getBusinessTypePermissions(businessType, 'admin'),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manage operations and staff',
        hierarchy: 80,
        permissions: this.getBusinessTypePermissions(businessType, 'manager'),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'staff',
        displayName: 'Staff',
        description: 'Basic operations',
        hierarchy: 70,
        permissions: this.getBusinessTypePermissions(businessType, 'staff'),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        hierarchy: 50,
        permissions: this.getBusinessTypePermissions(businessType, 'viewer'),
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
    ];

    // Add business-specific roles
    const businessSpecificRoles = this.getBusinessSpecificRoles(businessType);
    
    return [...commonRoles, ...businessSpecificRoles];
  }

  /**
   * Get permissions for a business type and role level
   */
  private getBusinessTypePermissions(businessType: BusinessType, roleLevel: string): Record<string, Array<'create' | 'read' | 'update' | 'delete' | 'list'>> {
    const resourceNames = this.getResourceNames(businessType);
    const permissions: Record<string, Array<'create' | 'read' | 'update' | 'delete' | 'list'>> = {};

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
   * Get business-specific roles
   */
  private getBusinessSpecificRoles(businessType: BusinessType): RoleData[] {
    switch (businessType) {
      case 'dental':
        return [
          {
            name: 'dentist',
            displayName: 'Dentist',
            description: 'Licensed dental practitioner',
            hierarchy: 75,
            permissions: {
              patients: ['create', 'read', 'update', 'list'],
              appointments: ['create', 'read', 'update', 'list'],
              treatments: ['create', 'read', 'update', 'list'],
              staff: ['read', 'list'],
              roles: ['read', 'list'],
            },
            active: true,
            businessTypeSpecific: true,
            isSystemRole: true,
          },
          {
            name: 'receptionist',
            displayName: 'Receptionist',
            description: 'Front desk and appointment management',
            hierarchy: 60,
            permissions: {
              patients: ['create', 'read', 'update', 'list'],
              appointments: ['create', 'read', 'update', 'list'],
              treatments: ['read', 'list'],
              staff: ['read', 'list'],
              roles: ['read', 'list'],
            },
            active: true,
            businessTypeSpecific: true,
            isSystemRole: true,
          },
        ];
      
      case 'gym':
        return [
          {
            name: 'trainer',
            displayName: 'Personal Trainer',
            description: 'Fitness instructor and class manager',
            hierarchy: 75,
            permissions: {
              members: ['read', 'update', 'list'],
              classes: ['create', 'read', 'update', 'delete', 'list'],
              equipment: ['read', 'update', 'list'],
              roles: ['read', 'list'],
            },
            active: true,
            businessTypeSpecific: true,
            isSystemRole: true,
          },
        ];
      

      
      default:
        return [];
    }
  }
} 