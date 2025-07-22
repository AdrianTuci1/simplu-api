import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

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
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  async getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
    try {
      const command = new GetCommand({
        TableName: tableNames.businessInfo,
        Key: { businessId },
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

  async getBusinessType(businessId: string): Promise<string> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.businessType || 'general';
  }

  /**
   * Mock data fallback for development when DynamoDB is not available
   */
  private getMockBusinessInfo(businessId: string): BusinessInfo {
    const businessTypes = ['dental', 'gym', 'hotel'] as const;
    const businessType = businessTypes[parseInt(businessId.slice(-1)) % 3];

    return {
      businessId,
      businessName: `Mock Business ${businessId}`,
      businessType,
      locations: [
        {
          locationId: `${businessId}-loc-1`,
          name: 'Locația Principală',
          address: 'Strada Exemplu, Nr. 123, București',
          phone: '+40712345678',
          email: 'contact@business.com',
          timezone: 'Europe/Bucharest',
          isActive: true
        }
      ],
      settings: {
        currency: 'RON',
        language: 'ro',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        workingHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '09:00', close: '14:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false }
        }
      },
      permissions: ['reservations:create', 'customers:read', 'services:read'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
} 