import { Injectable } from '@nestjs/common';
import { BusinessType } from '../../models/unified-data-types';
import { RoleData } from '../../models/common/role-models';

@Injectable()
export class BusinessRoleService {
  /**
   * Get business-specific roles
   */
  getBusinessSpecificRoles(businessType: BusinessType): RoleData[] {
    switch (businessType) {
      case 'dental':
        return this.getDentalRoles();
      case 'gym':
        return this.getGymRoles();
      case 'hotel':
        return this.getHotelRoles();
      default:
        return [];
    }
  }

  /**
   * Get dental-specific roles
   */
  private getDentalRoles(): RoleData[] {
    return [
      {
        name: 'dentist',
        displayName: 'Dentist',
        description: 'Licensed dental practitioner',
        hierarchy: 75,
        permissions: {
          clients: ['create', 'read', 'update', 'list'],
          services: ['create', 'read', 'update', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
          staff: ['read', 'list'],
          roles: ['read', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'hygienist',
        displayName: 'Dental Hygienist',
        description: 'Dental hygiene specialist',
        hierarchy: 65,
        permissions: {
          clients: ['read', 'update', 'list'],
          services: ['read', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
          staff: ['read', 'list'],
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
          clients: ['create', 'read', 'update', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
          services: ['read', 'list'],
          staff: ['read', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
    ];
  }

  /**
   * Get gym-specific roles
   */
  private getGymRoles(): RoleData[] {
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
          timeline: ['create', 'read', 'update', 'list'],
          staff: ['read', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'instructor',
        displayName: 'Group Instructor',
        description: 'Group fitness class instructor',
        hierarchy: 65,
        permissions: {
          members: ['read', 'list'],
          classes: ['create', 'read', 'update', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
    ];
  }

  /**
   * Get hotel-specific roles
   */
  private getHotelRoles(): RoleData[] {
    return [
      {
        name: 'concierge',
        displayName: 'Concierge',
        description: 'Guest services and assistance',
        hierarchy: 75,
        permissions: {
          clients: ['create', 'read', 'update', 'list'],
          rooms: ['read', 'update', 'list'],
          services: ['create', 'read', 'update', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
          staff: ['read', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'housekeeper',
        displayName: 'Housekeeper',
        description: 'Room maintenance and cleaning',
        hierarchy: 60,
        permissions: {
          rooms: ['read', 'update', 'list'],
          timeline: ['read', 'update', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
      {
        name: 'front_desk',
        displayName: 'Front Desk',
        description: 'Check-in/out and guest management',
        hierarchy: 65,
        permissions: {
          clients: ['create', 'read', 'update', 'list'],
          rooms: ['read', 'update', 'list'],
          services: ['read', 'list'],
          timeline: ['create', 'read', 'update', 'list'],
        },
        active: true,
        businessTypeSpecific: true,
        isSystemRole: true,
      },
    ];
  }
}
