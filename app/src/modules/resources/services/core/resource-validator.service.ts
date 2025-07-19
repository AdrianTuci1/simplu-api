import { Injectable } from '@nestjs/common';
import { BusinessType, BusinessResourceDataMap } from '../../models/unified-data-types';

@Injectable()
export class ResourceValidatorService {
  
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
   * Get required fields for a resource type
   */
  getRequiredFields(businessType: BusinessType, resourceName: string): string[] {
    const requiredFieldsMap: Record<string, Record<string, string[]>> = {
      dental: {
        clients: ['firstName', 'lastName', 'email', 'phone', 'status'],
        services: ['name', 'description', 'duration', 'cost', 'category', 'active'],
        staff: ['name', 'email', 'phone', 'dutyDays'],
        timeline: ['startTime', 'endTime', 'duration'],
      },
      gym: {
        members: ['firstName', 'lastName', 'email', 'phone', 'membershipType', 'status'],
        packages: ['name', 'description', 'duration', 'price', 'active'],
        classes: ['name', 'instructorId', 'date', 'duration', 'maxCapacity', 'category'],
        equipment: ['name', 'category', 'manufacturer', 'model', 'status'],
        staff: ['name', 'email', 'phone', 'dutyDays'],
        timeline: ['startTime', 'endTime', 'duration'],
      },
      hotel: {
        clients: ['firstName', 'lastName', 'email', 'phone', 'idDocument', 'status'],
        rooms: ['roomNumber', 'roomType', 'floor', 'capacity', 'bedType', 'status'],
        services: ['name', 'description', 'category', 'active'],
        staff: ['name', 'email', 'phone', 'dutyDays'],
        timeline: ['startTime', 'endTime', 'duration'],
      },
    };

    return requiredFieldsMap[businessType]?.[resourceName] || [];
  }

  /**
   * Get default/template data for a resource type
   */
  getDefaultResourceData(businessType: BusinessType, resourceName: string): any {
    const defaults: Record<string, Record<string, any>> = {
      dental: {
        staff: {
          name: '',
          email: '',
          phone: '',
          dutyDays: [],
        },
      },
      gym: {
        staff: {
          name: '',
          email: '',
          phone: '',
          dutyDays: [],
        },
      },
      hotel: {
        staff: {
          name: '',
          email: '',
          phone: '',
          dutyDays: [],
        },
      },
    };

    return defaults[businessType]?.[resourceName] || {};
  }
}