import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export interface BusinessSubscriptionRecord {
  businessId: string;
  subscriptionId: string;
  customerId: string;
  priceId: string;
  status: string;
}

@Injectable()
export class SubscriptionStoreService {
  private docClient: DynamoDBDocumentClient;
  private subsTable: string;
  private usersTable: string;

  constructor(private readonly config: ConfigService) {
    const ddb = new DynamoDBClient({
      region: config.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.docClient = DynamoDBDocumentClient.from(ddb);
    this.subsTable = config.get('DYNAMODB_SUBSCRIPTIONS_TABLE_NAME', 'business-subscriptions');
    this.usersTable = config.get('DYNAMODB_USERS_TABLE_NAME', 'users');
  }

  async setSubscriptionForBusiness(businessId: string, record: BusinessSubscriptionRecord): Promise<void> {
    await this.docClient.send(new PutCommand({ TableName: this.subsTable, Item: { ...record, pk: `business#${businessId}` } }));
  }

  async getSubscriptionForBusiness(businessId: string): Promise<BusinessSubscriptionRecord | null> {
    const res = await this.docClient.send(new GetCommand({ TableName: this.subsTable, Key: { pk: `business#${businessId}` } }));
    return (res.Item as any) || null;
  }

  async removeSubscriptionForBusiness(businessId: string): Promise<void> {
    await this.docClient.send(new DeleteCommand({ TableName: this.subsTable, Key: { pk: `business#${businessId}` } }));
  }

  // Map user to Stripe customer id
  async setStripeCustomerForUser(userId: string, customerId: string): Promise<void> {
    await this.docClient.send(new PutCommand({ TableName: this.usersTable, Item: { userId, stripeCustomerId: customerId } }));
  }

  async getStripeCustomerForUser(userId: string): Promise<string | null> {
    const res = await this.docClient.send(new GetCommand({ TableName: this.usersTable, Key: { userId } }));
    return (res.Item as any)?.stripeCustomerId || null;
  }
}

