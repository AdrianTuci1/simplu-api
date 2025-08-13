import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface BusinessSubscriptionRecord {
  businessId: string;
  subscriptionId: string;
  customerId: string;
  priceId: string;
  status: string;
}

export interface DynamoDBSubscriptionItem extends BusinessSubscriptionRecord {
  id: string; // Primary key: business#${businessId}
  subscriptionId: string; // GSI key for reverse lookup
}

@Injectable()
export class SubscriptionStoreService {
  private readonly logger = new Logger(SubscriptionStoreService.name);
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
    const item: DynamoDBSubscriptionItem = {
      id: `business#${businessId}`,
      ...record,
    };
    await this.docClient.send(new PutCommand({ TableName: this.subsTable, Item: item }));
  }

  async getSubscriptionForBusiness(businessId: string): Promise<BusinessSubscriptionRecord | null> {
    const res = await this.docClient.send(new GetCommand({ 
      TableName: this.subsTable, 
      Key: { id: `business#${businessId}` } 
    }));
    
    if (!res.Item) return null;
    
    // Remove the id field and return only the business subscription record
    const { id, ...record } = res.Item as DynamoDBSubscriptionItem;
    return record as BusinessSubscriptionRecord;
  }

  async removeSubscriptionForBusiness(businessId: string): Promise<void> {
    await this.docClient.send(new DeleteCommand({ 
      TableName: this.subsTable, 
      Key: { id: `business#${businessId}` } 
    }));
  }

  async getAllSubscriptions(): Promise<BusinessSubscriptionRecord[]> {
    const res = await this.docClient.send(new ScanCommand({ TableName: this.subsTable }));
    
    if (!res.Items) return [];
    
    // Remove the id field from each item
    return res.Items.map(item => {
      const { id, ...record } = item as DynamoDBSubscriptionItem;
      return record as BusinessSubscriptionRecord;
    });
  }

  /**
   * Find business by subscription ID using GSI
   * This requires a GSI on subscriptionId in the DynamoDB table
   */
  async findBusinessBySubscriptionId(subscriptionId: string): Promise<string | null> {
    try {
      // Try to use GSI first (if it exists)
      const res = await this.docClient.send(new QueryCommand({
        TableName: this.subsTable,
        IndexName: 'subscriptionId-index', // This GSI needs to be created in DynamoDB
        KeyConditionExpression: 'subscriptionId = :subscriptionId',
        ExpressionAttributeValues: {
          ':subscriptionId': subscriptionId
        },
        Limit: 1
      }));

      if (res.Items && res.Items.length > 0) {
        const item = res.Items[0] as DynamoDBSubscriptionItem;
        return item.businessId;
      }

      // Fallback to scan if GSI doesn't exist
      this.logger.warn('GSI not found, falling back to scan for subscription lookup');
      return this.findBusinessBySubscriptionIdScan(subscriptionId);
    } catch (error) {
      // If GSI doesn't exist, fallback to scan
      if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
        return this.findBusinessBySubscriptionIdScan(subscriptionId);
      }
      throw error;
    }
  }

  /**
   * Fallback method using scan (inefficient, but works without GSI)
   */
  private async findBusinessBySubscriptionIdScan(subscriptionId: string): Promise<string | null> {
    try {
      const allSubscriptions = await this.getAllSubscriptions();
      const found = allSubscriptions.find(sub => sub.subscriptionId === subscriptionId);
      return found ? found.businessId : null;
    } catch (error) {
      this.logger.error(`Error finding business for subscription ${subscriptionId}:`, error);
      return null;
    }
  }

  // Map user to Stripe customer id
  async setStripeCustomerForUser(userId: string, customerId: string): Promise<void> {
    await this.docClient.send(new PutCommand({ 
      TableName: this.usersTable, 
      Item: { userId, stripeCustomerId: customerId } 
    }));
  }

  async getStripeCustomerForUser(userId: string): Promise<string | null> {
    const res = await this.docClient.send(new GetCommand({ 
      TableName: this.usersTable, 
      Key: { userId } 
    }));
    return (res.Item as any)?.stripeCustomerId || null;
  }
}

