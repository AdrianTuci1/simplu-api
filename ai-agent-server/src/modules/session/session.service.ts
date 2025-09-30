import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
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
    console.log(`🔧 SessionService: Creating session for businessId=${businessId}, userId=${userId}`);
    
    // Încearcă să folosească crypto.randomUUID dacă este disponibil
    let sessionId: string;
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      sessionId = global.crypto.randomUUID();
    } else {
      // Fallback la implementarea existentă
      sessionId = `${businessId}:${userId}:${Date.now()}`;
    }
    
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

    try {
      console.log(`🔧 SessionService: Saving session to DynamoDB table: ${tableNames.sessions}`);
      await this.dynamoClient.send(new PutItemCommand({
        TableName: tableNames.sessions,
        Item: marshall(session)
      }));
      console.log(`✅ SessionService: Session created successfully: ${sessionId}`);
    } catch (error) {
      console.error(`❌ SessionService: Failed to create session:`, error);
      throw error;
    }

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

  async getActiveSessionForUser(businessId: string, userId: string): Promise<Session | null> {
    try {
      // Get all sessions for this user in this business, then sort by updatedAt
      console.log(`🔧 SessionService: Getting active session for businessId=${businessId}, userId=${userId}`);
      
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.sessions,
        FilterExpression: 'businessId = :businessId AND userId = :userId AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':businessId': businessId,
          ':userId': userId,
          ':status': 'active'
        })
      }));

      if (!result.Items || result.Items.length === 0) {
        console.log(`🔧 SessionService: No active sessions found`);
        return null;
      }

      const sessions = result.Items.map(item => unmarshall(item) as Session);
      
      // Sort by updatedAt descending (most recently updated first)
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const mostRecentActiveSession = sessions[0];
      console.log(`✅ SessionService: Found most recent active session: ${mostRecentActiveSession.sessionId} (updated: ${mostRecentActiveSession.updatedAt})`);
      
      return mostRecentActiveSession;
    } catch (error) {
      console.error('Error getting active session for user:', error);
      return null;
    }
  }

  async getActiveSessionsForBusiness(businessId: string): Promise<Session[]> {
    try {
      // Try with GSI first
      try {
        const result = await this.dynamoClient.send(new QueryCommand({
          TableName: tableNames.sessions,
          IndexName: 'businessId-userId-index',
          KeyConditionExpression: 'businessId = :businessId',
          FilterExpression: 'status = :status',
          ExpressionAttributeValues: marshall({
            ':businessId': businessId,
            ':status': 'active'
          }),
          Limit: 40 // CRITICAL: Limit query results to prevent memory issues
        }));

        return result.Items ? result.Items.map(item => unmarshall(item) as Session) : [];
      } catch (gsiError) {
        // If GSI doesn't exist, fall back to scan
        console.warn('GSI not available, falling back to scan for business sessions lookup');
        
        const scanResult = await this.dynamoClient.send(new QueryCommand({
          TableName: tableNames.sessions,
          FilterExpression: 'businessId = :businessId AND status = :status',
          ExpressionAttributeValues: marshall({
            ':businessId': businessId,
            ':status': 'active'
          }),
          Limit: 40
        }));

        return scanResult.Items ? scanResult.Items.map(item => unmarshall(item) as Session) : [];
      }
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
    try {
      console.log(`🔧 SessionService: Saving message to DynamoDB table: ${tableNames.messages}`);
      console.log(`🔧 SessionService: Message details - sessionId: ${message.sessionId}, userId: ${message.userId}`);
      
      await this.dynamoClient.send(new PutItemCommand({
        TableName: tableNames.messages,
        Item: marshall(message)
      }));

      // Actualizare timestamp ultimului mesaj în sesiune
      await this.updateSession(message.sessionId, {
        lastMessageAt: message.timestamp
      });
      
      console.log(`✅ SessionService: Message saved successfully`);
    } catch (error) {
      console.error(`❌ SessionService: Failed to save message:`, error);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      console.log(`🔧 SessionService: Getting messages for sessionId: ${sessionId}`);
      
      // Use ScanCommand to avoid schema issues completely
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.messages,
        FilterExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: marshall({
          ':sessionId': sessionId
        }),
        Limit: limit
      }));

      const messages = result.Items ? result.Items.map(item => unmarshall(item) as Message) : [];
      console.log(`✅ SessionService: Found ${messages.length} messages`);
      return messages;
    } catch (error) {
      console.error('Error getting session messages:', error);
      console.log('🔧 SessionService: Returning empty array as fallback');
      return [];
    }
  }

  async getSessionHistoryForUser(businessId: string, userId: string, limit: number = 20): Promise<Session[]> {
    try {
      console.log(`🔧 SessionService: Getting session history for businessId=${businessId}, userId=${userId}`);
      
      // Use ScanCommand to get all sessions for this user in this business
      // Since we only have partition key (sessionId), we need to scan the entire table
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.sessions,
        FilterExpression: 'businessId = :businessId AND userId = :userId',
        ExpressionAttributeValues: marshall({
          ':businessId': businessId,
          ':userId': userId
        }),
        Limit: limit * 2 // Get more items to account for filtering
      }));

      const sessions = result.Items ? result.Items.map(item => unmarshall(item) as Session) : [];
      
      // Sort by createdAt descending (most recent first)
      sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Return only the requested limit
      const limitedSessions = sessions.slice(0, limit);
      
      console.log(`✅ SessionService: Found ${limitedSessions.length} sessions in history`);
      return limitedSessions;
    } catch (error) {
      console.error('Error getting session history:', error);
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