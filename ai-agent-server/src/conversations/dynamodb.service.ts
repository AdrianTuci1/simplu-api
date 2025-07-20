import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export interface ConversationMessage {
  id: string;
  tenantId: string;
  sessionId: string;
  userId: string;
  content: string;
  role: 'user' | 'agent';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  tenantId: string;
  userId: string;
  locationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class DynamoDBService {
  private readonly logger = new Logger(DynamoDBService.name);
  private readonly dynamoClient: DynamoDBClient;
  private readonly messagesTableName: string;
  private readonly sessionsTableName: string;

  constructor(private configService: ConfigService) {
    this.dynamoClient = new DynamoDBClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.messagesTableName = this.configService.get('DYNAMODB_MESSAGES_TABLE', 'ai-agent-messages');
    this.sessionsTableName = this.configService.get('DYNAMODB_SESSIONS_TABLE', 'ai-agent-sessions');
  }

  // Session Management
  async createSession(session: Omit<ConversationSession, 'createdAt' | 'updatedAt'>): Promise<ConversationSession> {
    const now = new Date().toISOString();
    const sessionWithTimestamps: ConversationSession = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutItemCommand({
      TableName: this.sessionsTableName,
      Item: marshall(sessionWithTimestamps),
    });

    try {
      await this.dynamoClient.send(command);
      this.logger.log(`Created session: ${session.id}`);
      return sessionWithTimestamps;
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw error;
    }
  }

  async getSession(tenantId: string, sessionId: string): Promise<ConversationSession | null> {
    const command = new GetItemCommand({
      TableName: this.sessionsTableName,
      Key: marshall({
        id: sessionId,
        tenantId,
      }),
    });

    try {
      const result = await this.dynamoClient.send(command);
      if (!result.Item) {
        return null;
      }
      return unmarshall(result.Item) as ConversationSession;
    } catch (error) {
      this.logger.error(`Error getting session: ${error.message}`);
      throw error;
    }
  }

  async getSessions(tenantId: string, userId: string, limit = 10): Promise<ConversationSession[]> {
    const command = new QueryCommand({
      TableName: this.sessionsTableName,
      IndexName: 'TenantUserIndex', // You'll need to create this GSI
      KeyConditionExpression: 'tenantId = :tenantId AND userId = :userId',
      ExpressionAttributeValues: marshall({
        ':tenantId': tenantId,
        ':userId': userId,
      }),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    try {
      const result = await this.dynamoClient.send(command);
      return (result.Items || []).map(item => unmarshall(item) as ConversationSession);
    } catch (error) {
      this.logger.error(`Error getting sessions: ${error.message}`);
      throw error;
    }
  }

  async updateSession(tenantId: string, sessionId: string, updates: Partial<ConversationSession>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Add updatedAt automatically
    updates.updatedAt = new Date().toISOString();

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    const command = new UpdateItemCommand({
      TableName: this.sessionsTableName,
      Key: marshall({
        id: sessionId,
        tenantId,
      }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    });

    try {
      await this.dynamoClient.send(command);
      this.logger.log(`Updated session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error updating session: ${error.message}`);
      throw error;
    }
  }

  // Message Management
  async createMessage(message: Omit<ConversationMessage, 'timestamp'>): Promise<ConversationMessage> {
    const messageWithTimestamp: ConversationMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    const command = new PutItemCommand({
      TableName: this.messagesTableName,
      Item: marshall(messageWithTimestamp),
    });

    try {
      await this.dynamoClient.send(command);
      this.logger.log(`Created message: ${message.id}`);
      return messageWithTimestamp;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      throw error;
    }
  }

  async getSessionMessages(tenantId: string, sessionId: string, limit = 20, before?: string): Promise<ConversationMessage[]> {
    const keyConditionExpression = 'sessionId = :sessionId';
    const expressionAttributeValues: Record<string, any> = {
      ':sessionId': sessionId,
    };

    if (before) {
      expressionAttributeValues[':before'] = before;
    }

    const command = new QueryCommand({
      TableName: this.messagesTableName,
      IndexName: 'SessionTimestampIndex', // You'll need to create this GSI
      KeyConditionExpression: before 
        ? `${keyConditionExpression} AND #timestamp < :before`
        : keyConditionExpression,
      ExpressionAttributeNames: before ? { '#timestamp': 'timestamp' } : undefined,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    try {
      const result = await this.dynamoClient.send(command);
      return (result.Items || []).map(item => unmarshall(item) as ConversationMessage);
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }

  async getMessages(tenantId: string, limit = 20, before?: string): Promise<ConversationMessage[]> {
    const keyConditionExpression = 'tenantId = :tenantId';
    const expressionAttributeValues: Record<string, any> = {
      ':tenantId': tenantId,
    };

    if (before) {
      expressionAttributeValues[':before'] = before;
    }

    const command = new QueryCommand({
      TableName: this.messagesTableName,
      IndexName: 'TenantTimestampIndex', // You'll need to create this GSI
      KeyConditionExpression: before 
        ? `${keyConditionExpression} AND #timestamp < :before`
        : keyConditionExpression,
      ExpressionAttributeNames: before ? { '#timestamp': 'timestamp' } : undefined,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    try {
      const result = await this.dynamoClient.send(command);
      return (result.Items || []).map(item => unmarshall(item) as ConversationMessage);
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }

  async getMessage(messageId: string): Promise<ConversationMessage | null> {
    const command = new GetItemCommand({
      TableName: this.messagesTableName,
      Key: marshall({
        id: messageId,
      }),
    });

    try {
      const result = await this.dynamoClient.send(command);
      if (!result.Item) {
        return null;
      }
      return unmarshall(result.Item) as ConversationMessage;
    } catch (error) {
      this.logger.error(`Error getting message: ${error.message}`);
      throw error;
    }
  }
} 