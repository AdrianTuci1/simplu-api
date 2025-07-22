import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

export interface MetaCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret: string;
  phoneNumber: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface ExternalCredentials {
  businessId: string;
  serviceType: 'meta' | 'twilio';
  credentials: MetaCredentials | TwilioCredentials;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    webhookUrl?: string;
    permissions?: string[];
    rateLimits?: any;
  };
}

@Injectable()
export class ExternalApisService {
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);
  private metaClients = new Map<string, any>();
  private twilioClients = new Map<string, any>();

  // Meta API Methods
  async sendMetaMessage(
    to: string,
    message: string,
    businessId: string
  ): Promise<any> {
    const metaClient = await this.getMetaClient(businessId);
    
    try {
      const response = await metaClient.post('/messages', {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Meta API error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async sendMetaTemplate(
    to: string,
    templateName: string,
    parameters: any[],
    businessId: string
  ): Promise<any> {
    const metaClient = await this.getMetaClient(businessId);
    
    try {
      const response = await metaClient.post('/messages', {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'ro'
          },
          components: parameters.map(param => ({
            type: 'body',
            parameters: [{
              type: 'text',
              text: param
            }]
          }))
        }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Meta template error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Twilio API Methods
  async sendSMS(
    to: string,
    message: string,
    businessId: string
  ): Promise<any> {
    const twilioClient = await this.getTwilioClient(businessId);
    const credentials = await this.getTwilioCredentials(businessId);
    
    try {
      const response = await twilioClient.messages.create({
        body: message,
        from: credentials.phoneNumber,
        to: to
      });

      return {
        success: true,
        messageId: response.sid,
        data: response
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    businessId: string
  ): Promise<any> {
    // Implementare pentru serviciu de email (SendGrid, AWS SES, etc.)
    // Pentru moment, simulăm trimiterea
    console.log(`Email would be sent to ${to}: ${subject}`);
    
    return {
      success: true,
      messageId: `email_${Date.now()}`,
      data: { to, subject, body }
    };
  }

  // Credentials Management
  async saveMetaCredentials(
    businessId: string,
    credentials: MetaCredentials
  ): Promise<ExternalCredentials> {
    const externalCredentials: ExternalCredentials = {
      businessId,
      serviceType: 'meta',
      credentials,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalCredentials,
      Item: externalCredentials
    }));

    // Clear cached client
    this.metaClients.delete(businessId);

    return externalCredentials;
  }

  async saveTwilioCredentials(
    businessId: string,
    credentials: TwilioCredentials
  ): Promise<ExternalCredentials> {
    const externalCredentials: ExternalCredentials = {
      businessId,
      serviceType: 'twilio',
      credentials,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalCredentials,
      Item: externalCredentials
    }));

    // Clear cached client
    this.twilioClients.delete(businessId);

    return externalCredentials;
  }

  async getMetaCredentials(businessId: string): Promise<MetaCredentials | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.externalCredentials,
        Key: {
          businessId,
          serviceType: 'meta'
        }
      }));

      if (!result.Item) {
        return null;
      }

      const credentials = result.Item as ExternalCredentials;
      return credentials.isActive ? credentials.credentials as MetaCredentials : null;
    } catch (error) {
      console.error('Error getting Meta credentials:', error);
      return null;
    }
  }

  async getTwilioCredentials(businessId: string): Promise<TwilioCredentials | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.externalCredentials,
        Key: {
          businessId,
          serviceType: 'twilio'
        }
      }));

      if (!result.Item) {
        return null;
      }

      const credentials = result.Item as ExternalCredentials;
      return credentials.isActive ? credentials.credentials as TwilioCredentials : null;
    } catch (error) {
      console.error('Error getting Twilio credentials:', error);
      return null;
    }
  }

  async getBusinessPhoneNumber(businessId: string, serviceType: 'meta' | 'twilio'): Promise<string | null> {
    if (serviceType === 'meta') {
      const credentials = await this.getMetaCredentials(businessId);
      return credentials?.phoneNumber || null;
    } else {
      const credentials = await this.getTwilioCredentials(businessId);
      return credentials?.phoneNumber || null;
    }
  }

  // Private methods for client management
  private async getMetaClient(businessId: string): Promise<any> {
    if (this.metaClients.has(businessId)) {
      return this.metaClients.get(businessId);
    }

    const credentials = await this.getMetaCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Meta credentials found for business ${businessId}`);
    }

    // Create Meta client (using axios for simplicity)
    const { default: axios } = await import('axios');
    const client = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.metaClients.set(businessId, client);
    return client;
  }

  private async getTwilioClient(businessId: string): Promise<any> {
    if (this.twilioClients.has(businessId)) {
      return this.twilioClients.get(businessId);
    }

    const credentials = await this.getTwilioCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Twilio credentials found for business ${businessId}`);
    }

    // Create Twilio client
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);

    this.twilioClients.set(businessId, client);
    return client;
  }
} 