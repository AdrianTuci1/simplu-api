import { Injectable } from '@nestjs/common';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBService } from '../../config/dynamodb.config';

export interface BusinessInfo {
  businessId: string;
  businessName: string;
  businessType: 'dental' | 'gym' | 'hotel';
  locations: LocationInfo[];
  settings: BusinessSettings;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

export interface BusinessSettings {
  currency: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  workingHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
}

@Injectable()
export class BusinessInfoService {
  private dynamoClient = dynamoDBService.getClient();
  private tableName = dynamoDBService.getTableName();

  async getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          businessId,
        },
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        return null;
      }

      return result.Item as BusinessInfo;
    } catch (error) {
      console.error(`Error fetching business info for ${businessId}:`, error);
      
      // Return mock data as fallback for development
      return this.getMockBusinessInfo(businessId);
    }
  }

  async getLocationInfo(businessId: string, locationId: string): Promise<LocationInfo | null> {
    const businessInfo = await this.getBusinessInfo(businessId);
    
    if (!businessInfo) {
      return null;
    }

    return businessInfo.locations.find(loc => loc.locationId === locationId) || null;
  }

  async getBusinessLocations(businessId: string): Promise<LocationInfo[]> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.locations || [];
  }

  async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.settings || null;
  }

  async getBusinessPermissions(businessId: string): Promise<string[]> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.permissions || [];
  }

  /**
   * Mock data fallback for development when DynamoDB is not available
   */
  private getMockBusinessInfo(businessId: string): BusinessInfo {
    const businessTypes = ['dental', 'gym', 'hotel'] as const;
    const businessType = businessTypes[parseInt(businessId.slice(-1)) % 3];

    return {
      businessId,
      businessName: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Business ${businessId}`,
      businessType,
      locations: [
        {
          locationId: `${businessId}-001`,
          name: 'Main Location',
          address: '123 Main St, City, Country',
          phone: '+1234567890',
          email: `contact@${businessId}.com`,
          timezone: 'UTC',
          isActive: true,
        },
        {
          locationId: `${businessId}-002`,
          name: 'Secondary Location',
          address: '456 Second St, City, Country',
          phone: '+1234567891',
          email: `secondary@${businessId}.com`,
          timezone: 'UTC',
          isActive: true,
        },
      ],
      settings: {
        currency: 'USD',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        workingHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '09:00', close: '13:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
      },
      permissions: [
        'read:resources',
        'write:resources',
        'read:reports',
        'manage:settings',
        businessType === 'dental' ? 'manage:appointments' : 
        businessType === 'gym' ? 'manage:memberships' : 'manage:reservations',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
