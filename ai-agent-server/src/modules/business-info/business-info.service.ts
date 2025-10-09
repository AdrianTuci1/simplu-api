import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

export interface BusinessInfo {
  businessId: string;
  businessName: string;
  businessType: 'dental' | 'gym' | 'hotel';
  domainLabel?: string; // Domain label for URL generation
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
      
      const command = new GetCommand({
        TableName: tableNames.businessInfo,
        Key: { businessId },
      });


      const result = await this.dynamoClient.send(command);
      
      
      if (!result.Item) {
        console.log(`No business info found for businessId: ${businessId}`);
        return null;
      }

      // console.log(`Raw DynamoDB data for ${businessId}:`, JSON.stringify(result.Item, null, 2));
      
      // Transform DynamoDB data to expected interface
      const transformedData = this.transformDynamoDBData(result.Item as DynamoDBBusinessInfo);
      
      return transformedData;
    } catch (error) {
      console.error(`Error fetching business info for ${businessId}:`, error);
      console.error(`Error details:`, {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      

    }
  }

    /**
   * Transform DynamoDB data format to BusinessInfo interface
   */
    private transformDynamoDBData(dynamoData: DynamoDBBusinessInfo): BusinessInfo {
      const businessId = (dynamoData as any).businessId || (dynamoData as any).id || 'UNKNOWN';
      const businessName = (dynamoData as any).companyName || (dynamoData as any).name || `Business ${businessId}`;
      const businessTypeRaw = (dynamoData as any).businessType || (dynamoData as any).type || 'general';
      const currency = (dynamoData as any).settings?.currency || (dynamoData as any).credits?.currency || 'RON';
      const language = (dynamoData as any).settings?.language || (dynamoData as any).customTld || 'ro';
  
    return {
      businessId,
      businessName,
      businessType: this.mapBusinessType(businessTypeRaw),
      domainLabel: (dynamoData as any).domainLabel || undefined,
      locations: (dynamoData.locations || []).map(location => ({
        locationId: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        timezone: location.timezone,
        isActive: location.active
      })),
      settings: {
        currency,
        language,
        dateFormat: 'DD/MM/YYYY', // Default value
        timeFormat: 'HH:mm', // Default value
        workingHours: this.getDefaultWorkingHours()
      },
      permissions: this.getDefaultPermissions(String(businessTypeRaw)),
      createdAt: (dynamoData as any).createdAt || new Date().toISOString(),
      updatedAt: (dynamoData as any).updatedAt || new Date().toISOString()
    };
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

}