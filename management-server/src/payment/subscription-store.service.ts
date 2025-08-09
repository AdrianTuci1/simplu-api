import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BusinessSubscriptionEntity } from './entities/business-subscription.entity';

@Injectable()
export class SubscriptionStoreService {
  private readonly logger = new Logger(SubscriptionStoreService.name);
  private readonly dynamoClient: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(private readonly configService: ConfigService) {
    this.dynamoClient = new DynamoDBClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.docClient = DynamoDBDocumentClient.from(this.dynamoClient);
    this.tableName = this.configService.get('DYNAMODB_SUBSCRIPTIONS_TABLE_NAME', 'business-subscriptions');
  }

  async put(record: BusinessSubscriptionEntity): Promise<BusinessSubscriptionEntity> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: record }));
    this.logger.log(`Saved subscription ${record.id} for business ${record.businessId}`);
    return record;
  }

  async getById(id: string): Promise<BusinessSubscriptionEntity | null> {
    const res = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { id } }));
    return (res.Item as BusinessSubscriptionEntity) || null;
  }

  async update(id: string, updates: Partial<BusinessSubscriptionEntity>): Promise<BusinessSubscriptionEntity> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    const payload = { ...updates, updatedAt: new Date().toISOString() } as Partial<BusinessSubscriptionEntity>;
    Object.keys(payload).forEach((key) => {
      if ((payload as any)[key] !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = (payload as any)[key];
      }
    });
    const res = await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes as BusinessSubscriptionEntity;
  }

  async listByBusiness(businessId: string): Promise<BusinessSubscriptionEntity[]> {
    const res = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'businessId-index',
      KeyConditionExpression: 'businessId = :businessId',
      ExpressionAttributeValues: {
        ':businessId': businessId,
      },
    }));
    return (res.Items as BusinessSubscriptionEntity[]) || [];
  }
}

