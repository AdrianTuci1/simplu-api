import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Session, Message } from '@/shared/interfaces/session.interface';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

@Injectable()
export class SessionService {
  private dynamoClient = dynamoDBClient;

  async createSession(
    businessId: string,
    locationId: string,
    userId: string,
    businessType: string
  ): Promise<Session> {
    const sessionId = `${businessId}:${userId}:${Date.now()}`;
    
    const session: Session = {
      sessionId,
      businessId,
      locationId,
      userId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      metadata: {
        businessType,
        context: {}
      }
    };

    await this.dynamoClient.send(new PutItemCommand({
      TableName: tableNames.sessions,
      Item: marshall(session)
    }));

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const result = await this.dynamoClient.send(new GetItemCommand({
        TableName: tableNames.sessions,
        Key: marshall({ sessionId })
      }));

      return result.Item ? unmarshall(result.Item) as Session : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async getActiveSessionsForBusiness(businessId: string): Promise<Session[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.sessions,
        KeyConditionExpression: 'businessId = :businessId',
        FilterExpression: 'status = :status',
        ExpressionAttributeValues: marshall({
          ':businessId': businessId,
          ':status': 'active'
        })
      }));

      return result.Items ? result.Items.map(item => unmarshall(item) as Session) : [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach(key => {
      if (key !== 'sessionId' && key !== 'businessId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    if (updateExpression.length === 0) return;

    await this.dynamoClient.send(new UpdateItemCommand({
      TableName: tableNames.sessions,
      Key: marshall({ sessionId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues)
    }));
  }

  async markConversationResolved(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'resolved',
      updatedAt: new Date().toISOString()
    });
  }

  async saveMessage(message: Message): Promise<void> {
    await this.dynamoClient.send(new PutItemCommand({
      TableName: tableNames.messages,
      Item: marshall(message)
    }));

    // Actualizare timestamp ultimului mesaj în sesiune
    await this.updateSession(message.sessionId, {
      lastMessageAt: message.timestamp
    });
  }

  async getSessionMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.messages,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: marshall({
          ':sessionId': sessionId
        }),
        ScanIndexForward: false, // Cele mai recente primele
        Limit: limit
      }));

      return result.Items ? result.Items.map(item => unmarshall(item) as Message) : [];
    } catch (error) {
      console.error('Error getting session messages:', error);
      return [];
    }
  }

  async cleanupResolvedSessions(): Promise<void> {
    // Implementare cleanup pentru sesiuni rezolvate mai vechi de 30 de zile
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query pentru sesiuni rezolvate vechi
    // Implementare conform strategiei de cleanup
    console.log('Cleanup resolved sessions older than:', thirtyDaysAgo.toISOString());
  }
} 