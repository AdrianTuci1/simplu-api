import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
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
    this.tableName = this.configService.get('DYNAMODB_USERS_TABLE_NAME', 'users');
  }

  async getOrCreateUser(userId: string, email: string, name?: string): Promise<UserEntity> {
    const existing = await this.getUser(userId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const user: UserEntity = {
      userId,
      email,
      name,
      createdAt: now,
      updatedAt: now,
    };
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: user }));
    this.logger.log(`Created user profile ${userId}`);
    return user;
  }

  async getUser(userId: string): Promise<UserEntity | null> {
    const res = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { userId } }));
    return (res.Item as UserEntity) || null;
  }

  async updateUser(userId: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    const payload = { ...updates, updatedAt: new Date().toISOString() } as Partial<UserEntity>;
    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof UserEntity] !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = (payload as any)[key];
      }
    });
    const res = await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes as UserEntity;
  }
}

