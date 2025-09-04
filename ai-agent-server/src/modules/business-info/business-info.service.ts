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

// Interface for the actual DynamoDB data structure
interface DynamoDBBusinessInfo {
  businessId: string;
  companyName: string;
  businessType: string;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    active: boolean;
    timezone: string;
    phone?: string;
    email?: string;
  }>;
  settings: {
    currency: string;
    language: string;
  };
  createdAt: string;
  updatedAt: string;
  [key: string]: any; // Allow other fields
}

@Injectable()
export class BusinessInfoService {
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  async getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
    try {
      console.log(`Fetching business info for businessId: ${businessId}`);
      console.log(`Using table: ${tableNames.businessInfo}`);
      console.log(`AWS Region: ${process.env.AWS_REG|| 'eu-central-1'}`);
      
      const command = new GetCommand({
        TableName: tableNames.businessInfo,
        Key: { businessId },
      });

      console.log(`DynamoDB command:`, JSON.stringify(command, null, 2));

      const result = await this.dynamoClient.send(command);
      
      console.log(`DynamoDB result:`, JSON.stringify(result, null, 2));
      
      if (!result.Item) {
        console.log(`No business info found for businessId: ${businessId}`);
        return null;
      }

      console.log(`Raw DynamoDB data for ${businessId}:`, JSON.stringify(result.Item, null, 2));
      
      // Transform DynamoDB data to expected interface
      const transformedData = this.transformDynamoDBData(result.Item as DynamoDBBusinessInfo);
      console.log(`Transformed business info for ${businessId}:`, JSON.stringify(transformedData, null, 2));
      
      return transformedData;
    } catch (error) {
      console.error(`Error fetching business info for ${businessId}:`, error);
      console.error(`Error details:`, {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      // Return mock data as fallback for development
      console.log(`Falling back to mock data for ${businessId}`);
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
   * Transform DynamoDB data format to BusinessInfo interface
   */
  private transformDynamoDBData(dynamoData: DynamoDBBusinessInfo): BusinessInfo {
    return {
      businessId: dynamoData.businessId,
      businessName: dynamoData.companyName,
      businessType: this.mapBusinessType(dynamoData.businessType),
      locations: dynamoData.locations.map(location => ({
        locationId: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.active
      })),
      settings: {
        currency: dynamoData.settings?.currency || 'RON',
        language: dynamoData.settings?.language || 'ro',
        dateFormat: 'DD/MM/YYYY', // Default value
        timeFormat: 'HH:mm', // Default value
        workingHours: this.getDefaultWorkingHours()
      },
      permissions: this.getDefaultPermissions(dynamoData.businessType),
      createdAt: dynamoData.createdAt,
      updatedAt: dynamoData.updatedAt
    };
  }

  /**
   * Map business type from DynamoDB to expected enum
   */
  private mapBusinessType(dynamoBusinessType: string): 'dental' | 'gym' | 'hotel' {
    const type = dynamoBusinessType?.toLowerCase();
    if (type === 'dental' || type === 'gym' || type === 'hotel') {
      return type;
    }
    return 'dental'; // Default fallback
  }

  /**
   * Get default working hours based on business type
   */
  private getDefaultWorkingHours() {
    return {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '14:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false }
    };
  }

  /**
   * Get default permissions based on business type
   */
  private getDefaultPermissions(businessType: string): string[] {
    const basePermissions = ['reservations:create', 'customers:read', 'services:read'];
    
    switch (businessType?.toLowerCase()) {
      case 'dental':
        return [...basePermissions, 'appointments:manage', 'patients:manage'];
      case 'gym':
        return [...basePermissions, 'memberships:manage', 'classes:manage'];
      case 'hotel':
        return [...basePermissions, 'appointments:manage', 'rooms:manage'];
      default:
        return basePermissions;
    }
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