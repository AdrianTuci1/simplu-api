import { Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export interface UserProfileEntity {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  billingAddress?: {
    company?: string;
    street?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    country?: string;
  };
  entityType?: 'pf' | 'pfa' | 'srl';
  registrationNumber?: string;
  taxCode?: string;
  stripeCustomerId?: string;
  defaultPaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  private doc: DynamoDBDocumentClient;
  private usersTable: string;

  constructor(private readonly payments: PaymentService, private readonly config: ConfigService) {
    const ddb = new DynamoDBClient({
      region: config.get('AWS_REGION', 'us-east-1'),
      credentials: { accessKeyId: config.get('AWS_ACCESS_KEY_ID'), secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY') },
    });
    this.doc = DynamoDBDocumentClient.from(ddb);
    this.usersTable = config.get('DYNAMODB_USERS_TABLE_NAME', 'users');
  }

  async getMe(userId: string, email: string, firstName?: string, lastName?: string): Promise<UserProfileEntity> {
    const res = await this.doc.send(new GetCommand({ TableName: this.usersTable, Key: { userId } }));
    const now = new Date().toISOString();
    
    let profile: UserProfileEntity = res.Item as any || {
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };

    // If we have name data from Cognito and the profile doesn't have firstName/lastName, populate them
    if ((firstName || lastName) && (!profile.firstName && !profile.lastName)) {
      profile.firstName = firstName || profile.firstName;
      profile.lastName = lastName || profile.lastName;
      profile.updatedAt = now;
      await this.doc.send(new PutCommand({ TableName: this.usersTable, Item: profile }));
    }

    // Ensure Stripe customer exists
    const customerId = await this.payments.ensureCustomer(userId, email);
    if (profile.stripeCustomerId !== customerId) {
      profile.stripeCustomerId = customerId;
      await this.doc.send(new PutCommand({ TableName: this.usersTable, Item: profile }));
    }
    return profile;
  }

  async updateMe(userId: string, email: string, updates: Partial<UserProfileEntity>, firstName?: string, lastName?: string): Promise<UserProfileEntity> {
    const current = await this.getMe(userId, email, firstName, lastName);
    const merged = { ...current, ...updates, userId, email, updatedAt: new Date().toISOString() };
    await this.doc.send(new PutCommand({ TableName: this.usersTable, Item: merged }));
    return merged;
  }

  async addPaymentMethod(userId: string, email: string, paymentMethodId: string, firstName?: string, lastName?: string): Promise<{ ok: true }>{
    const profile = await this.getMe(userId, email, firstName, lastName);
    if (!profile.stripeCustomerId) {
      profile.stripeCustomerId = await this.payments.ensureCustomer(userId, email);
    }
    await this.payments.attachPaymentMethod(profile.stripeCustomerId, paymentMethodId);
    await this.updateMe(userId, email, { defaultPaymentMethodId: paymentMethodId }, firstName, lastName);
    return { ok: true };
  }

  async getPaymentMethods(userId: string, email: string, firstName?: string, lastName?: string): Promise<any[]> {
    const profile = await this.getMe(userId, email, firstName, lastName);
    if (!profile.stripeCustomerId) {
      return [];
    }
    const paymentMethods = await this.payments.listPaymentMethods(profile.stripeCustomerId);
    return paymentMethods.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : null,
      billingDetails: pm.billing_details,
      isDefault: pm.id === profile.defaultPaymentMethodId,
    }));
  }

  /**
   * Find or create a user by email
   * If user doesn't exist, creates a placeholder profile that will be completed later
   */
  async findOrCreateUserByEmail(email: string): Promise<{ userId: string; isNew: boolean }> {
    // First, try to find existing user by email
    // Note: This is a simplified search - in production you might want a GSI on email
    const scanCommand = {
      TableName: this.usersTable,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: email },
      },
    };

    try {
      const { DynamoDBClient, ScanCommand } = await import('@aws-sdk/client-dynamodb');
      const ddb = new DynamoDBClient({
        region: this.config.get('AWS_REGION', 'us-east-1'),
        credentials: { 
          accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'), 
          secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY') 
        },
      });

      const result = await ddb.send(new ScanCommand(scanCommand));
      
      if (result.Items && result.Items.length > 0) {
        // User exists, return the first match
        const user = result.Items[0];
        const userId = user.userId?.S || '';
        return { 
          userId, 
          isNew: false 
        };
      }
    } catch (error) {
      console.warn(`Error searching for user by email ${email}:`, error);
    }

    // User doesn't exist, create a placeholder profile
    const { v4: uuidv4 } = await import('uuid');
    const userId = uuidv4();
    const now = new Date().toISOString();

    const placeholderProfile: UserProfileEntity = {
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.doc.send(new PutCommand({ 
        TableName: this.usersTable, 
        Item: placeholderProfile 
      }));

      return { userId, isNew: true };
    } catch (error) {
      throw new Error(`Failed to create placeholder user for email ${email}: ${error.message}`);
    }
  }
}

