import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { google } from 'googleapis';

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

export interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
  email: string;
}

export interface ExternalCredentials {
  businessId: string;
  serviceType: string;
  credentials: MetaCredentials | TwilioCredentials | GmailCredentials | Record<string, any>;
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

  // Meta API Methods
  async sendMetaMessage(
    to: string,
    message: string,
    businessId: string
  ): Promise<any> {
    let metaClient;
    try {
      metaClient = await this.getMetaClient(businessId);
    } catch (credentialsError) {
      console.warn(`⚠️ Meta credentials not found for business ${businessId}:`, credentialsError.message);
      return {
        success: false,
        error: 'Meta credentials not configured',
        data: null
      };
    }
    
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
    } catch (error: any) {
      console.error('Meta API error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        data: null
      };
    } finally {
      // Clean up client resources
      if (metaClient) {
        try {
          if (metaClient.defaults.httpAgent) {
            metaClient.defaults.httpAgent.destroy();
          }
          if (metaClient.defaults.httpsAgent) {
            metaClient.defaults.httpsAgent.destroy();
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
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
    // Prefer AWS SNS for SMS sending (our shared credentials)
    let snsClient;
    try {
      snsClient = new SNSClient({});
      const response = await snsClient.send(
        new PublishCommand({
          PhoneNumber: to,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
          },
        })
      );

      return {
        success: true,
        messageId: response.MessageId,
        data: response,
      };
    } catch (snsError: any) {
      console.warn('AWS SNS SMS error, attempting Twilio fallback:', snsError?.message || snsError);
      // Fallback to Twilio only if credentials exist for business
      try {
        const twilioClient = await this.getTwilioClient(businessId);
        const credentials = await this.getTwilioCredentials(businessId);
        if (twilioClient && credentials?.phoneNumber) {
          const twilioResp = await twilioClient.messages.create({
            body: message,
            from: credentials.phoneNumber,
            to: to,
          });
          return {
            success: true,
            messageId: twilioResp.sid,
            data: twilioResp,
          };
        }
      } catch (twilioError: any) {
        console.warn('Twilio fallback failed:', twilioError?.message || twilioError);
      }

      return {
        success: false,
        error: 'SMS credentials not configured or API unavailable',
        data: null
      };
    } finally {
      // Clean up SNS client resources
      if (snsClient) {
        try {
          snsClient.destroy();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    businessId: string
  ): Promise<any> {
    // Legacy simulated email method; prefer using Gmail OAuth2 per user via sendEmailFromGmail
    console.log(`Email would be sent to ${to}: ${subject}`);
    return { success: true, messageId: `email_${Date.now()}`, data: { to, subject, body } };
  }

  async sendEmailFromGmail(
    businessId: string,
    locationId: string,
    to: string,
    subject: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }>
  {
    let creds = await this.getGmailCredentials(businessId, locationId);
    if (!creds) {
      return { success: false, error: 'Missing Gmail credentials for location' };
    }
    const clientId = process.env.GOOGLE_CLIENT_ID as string;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET as string;
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET' };
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/external/gmail/callback'
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: creds.accessToken,
        refresh_token: creds.refreshToken,
        expiry_date: creds.expiryDate,
      });

      // OAuth2 client will automatically refresh the token if expired
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          console.log('Gmail access token refreshed automatically');
          const updatedCreds: GmailCredentials = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || creds.refreshToken,
            expiryDate: tokens.expiry_date || undefined,
            email: creds.email,
          };
          await this.saveGmailCredentials(businessId, locationId, updatedCreds);
        }
      });

      // Create Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email in RFC 2822 format
      const emailLines = [
        `From: ${creds.email}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
      ];
      const email = emailLines.join('\r\n');

      // Encode email in base64url
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email using Gmail API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log('Gmail API send response:', response.data);
      return { 
        success: true, 
        messageId: response.data.id || `gmail_${Date.now()}` 
      };
    } catch (err: any) {
      console.error('sendEmailFromGmail failed:', err?.message || err);
      
      // Check if it's an auth error
      if (err?.code === 401 || err?.message?.includes('invalid_grant')) {
        return { 
          success: false, 
          error: 'Gmail authentication failed. Please re-authenticate your Gmail account.' 
        };
      }
      
      return { 
        success: false, 
        error: err?.message || 'Failed to send email via Gmail' 
      };
    }
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

    // No in-memory clients to clear

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

    // No in-memory clients to clear

    return externalCredentials;
  }

  async saveGmailCredentials(
    businessId: string,
    locationId: string,
    credentials: GmailCredentials
  ): Promise<ExternalCredentials> {
    console.log(`Saving Gmail credentials for businessId: ${businessId}, locationId: ${locationId}`);
    console.log('Gmail credentials:', credentials);
    
    const externalCredentials: ExternalCredentials = {
      businessId,
      serviceType: `gmail#${locationId}`,
      credentials,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { permissions: ['gmail.read', 'gmail.send'] },
    };
    
    console.log('External credentials to save:', externalCredentials);

    await this.dynamoClient.send(
      new PutCommand({
        TableName: tableNames.externalCredentials,
        Item: externalCredentials,
      })
    );

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

  async getGmailCredentials(
    businessId: string,
    locationId: string
  ): Promise<GmailCredentials | null> {
    try {
      console.log(`Getting Gmail credentials for businessId: ${businessId}, locationId: ${locationId}`);
      const key = {
        businessId,
        serviceType: `gmail#${locationId}`,
      };
      console.log('DynamoDB key:', key);
      
      const result = await this.dynamoClient.send(
        new GetCommand({
          TableName: tableNames.externalCredentials,
          Key: key,
        })
      );

      console.log('DynamoDB result:', result);

      if (!result.Item) {
        console.log('No item found in DynamoDB');
        return null;
      }

      const credentials = result.Item as ExternalCredentials;
      console.log('Found credentials:', credentials);
      console.log('isActive:', credentials.isActive);
      
      return credentials.isActive ? (credentials.credentials as GmailCredentials) : null;
    } catch (error) {
      console.error('Error getting Gmail credentials:', error);
      return null;
    }
  }

  // Private methods for client creation (ephemeral per call)
  private async getMetaClient(businessId: string): Promise<any> {
    const credentials = await this.getMetaCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Meta credentials found for business ${businessId}`);
    }
    const { default: axios } = await import('axios');
    // Use default Node agents (no keep-alive pooling) for ephemeral requests
    const client = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      maxRedirects: 3
    });
    
    // Ensure client is properly disposed after use to prevent memory leaks
    const originalRequest = client.request;
    client.request = function(config) {
      return originalRequest.call(this, config).finally(() => {
        // Clean up any resources
        if (client.defaults.httpAgent) {
          client.defaults.httpAgent.destroy();
        }
        if (client.defaults.httpsAgent) {
          client.defaults.httpsAgent.destroy();
        }
      });
    };
    
    return client;
  }

  private async getTwilioClient(businessId: string): Promise<any> {
    const credentials = await this.getTwilioCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Twilio credentials found for business ${businessId}`);
    }
    const twilio = require('twilio');
    return twilio(credentials.accountSid, credentials.authToken);
  }
  // No long-lived clients maintained; nothing to clean up
} 