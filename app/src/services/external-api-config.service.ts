import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBService } from '../config/dynamodb.config';

export interface ExternalApiConfig {
  businessId: string;
  locationId?: string;
  sms: {
    enabled: boolean;
    sendOnBooking: boolean;
    sendReminder: boolean;
    reminderTiming: 'day_before' | 'same_day' | 'both';
    serviceType: 'aws_sns' | 'twilio' | 'meta';
  };
  email: {
    enabled: boolean;
    sendOnBooking: boolean;
    sendReminder: boolean;
    reminderTiming: 'day_before' | 'same_day' | 'both';
    serviceType: 'gmail' | 'smtp';
  };
  rating?: {
    enabled: boolean;
    sendOnCompletion: boolean;
    defaultTemplate: string;
    templates: any[];
    allowAnonymous: boolean;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

@Injectable()
export class ExternalApiConfigService {
  private readonly logger = new Logger(ExternalApiConfigService.name);
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(private configService: ConfigService) {
    this.dynamoClient = dynamoDBService.getClient();
    this.tableName = dynamoDBService.getExternalApiConfigTableName();
  }

  async getConfig(businessId: string, locationId?: string): Promise<ExternalApiConfig | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          businessId,
          locationId: locationId || 'default'
        }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        this.logger.debug(`No external API config found for business ${businessId}, location ${locationId || 'default'}`);
        return null;
      }

      return result.Item as ExternalApiConfig;
    } catch (error) {
      this.logger.error(`Error getting external API config for business ${businessId}: ${error.message}`);
      return null;
    }
  }

  async isSmsEnabled(businessId: string, locationId?: string): Promise<boolean> {
    const config = await this.getConfig(businessId, locationId);
    return config?.sms?.enabled || false;
  }

  async isEmailEnabled(businessId: string, locationId?: string): Promise<boolean> {
    const config = await this.getConfig(businessId, locationId);
    return config?.email?.enabled || false;
  }

  async shouldSendOnBooking(businessId: string, locationId?: string): Promise<{
    sms: boolean;
    email: boolean;
  }> {
    const config = await this.getConfig(businessId, locationId);
    
    return {
      sms: config?.sms?.enabled && config?.sms?.sendOnBooking || false,
      email: config?.email?.enabled && config?.email?.sendOnBooking || false
    };
  }

  async shouldSendReminders(businessId: string, locationId?: string): Promise<{
    sms: boolean;
    email: boolean;
  }> {
    const config = await this.getConfig(businessId, locationId);
    
    return {
      sms: config?.sms?.enabled && config?.sms?.sendReminder || false,
      email: config?.email?.enabled && config?.email?.sendReminder || false
    };
  }

  async getReminderTiming(businessId: string, locationId?: string): Promise<{
    sms: 'day_before' | 'same_day' | 'both';
    email: 'day_before' | 'same_day' | 'both';
  }> {
    const config = await this.getConfig(businessId, locationId);
    
    return {
      sms: config?.sms?.reminderTiming || 'day_before',
      email: config?.email?.reminderTiming || 'day_before'
    };
  }

  async isAnyServiceEnabled(businessId: string, locationId?: string): Promise<boolean> {
    const config = await this.getConfig(businessId, locationId);
    return (config?.sms?.enabled || false) || (config?.email?.enabled || false);
  }
}
