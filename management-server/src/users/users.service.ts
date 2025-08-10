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

  async getMe(userId: string, email: string): Promise<UserProfileEntity> {
    const res = await this.doc.send(new GetCommand({ TableName: this.usersTable, Key: { userId } }));
    const now = new Date().toISOString();
    const profile: UserProfileEntity = res.Item as any || {
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };
    // Ensure Stripe customer exists
    const customerId = await this.payments.ensureCustomer(userId, email);
    if (profile.stripeCustomerId !== customerId) {
      profile.stripeCustomerId = customerId;
      await this.doc.send(new PutCommand({ TableName: this.usersTable, Item: profile }));
    }
    return profile;
  }

  async updateMe(userId: string, email: string, updates: Partial<UserProfileEntity>): Promise<UserProfileEntity> {
    const current = await this.getMe(userId, email);
    const merged = { ...current, ...updates, userId, email, updatedAt: new Date().toISOString() };
    await this.doc.send(new PutCommand({ TableName: this.usersTable, Item: merged }));
    return merged;
  }

  async addPaymentMethod(userId: string, email: string, paymentMethodId: string): Promise<{ ok: true }>{
    const profile = await this.getMe(userId, email);
    if (!profile.stripeCustomerId) {
      profile.stripeCustomerId = await this.payments.ensureCustomer(userId, email);
    }
    await this.payments.attachPaymentMethod(profile.stripeCustomerId, paymentMethodId);
    await this.updateMe(userId, email, { defaultPaymentMethodId: paymentMethodId });
    return { ok: true };
  }
}

