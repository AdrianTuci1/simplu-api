import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { DynamoDBService, ConversationMessage, ConversationSession } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private dynamoDBService: DynamoDBService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    const topics = ['conversations', 'conversation-events'];
    topics.forEach((topic) => {
      this.kafkaClient.subscribeToResponseOf(topic);
    });
    await this.kafkaClient.connect();
  }

  async getOrCreateSession(tenantId: string, userId: string, sessionId?: string, locationId?: string): Promise<ConversationSession> {
    // If sessionId is provided, try to get the session
    if (sessionId) {
      const existingSession = await this.getSession(tenantId, sessionId);
      if (existingSession) {
        return existingSession;
      }
      this.logger.log(`Session ${sessionId} not found, creating new session with provided ID`);
    }

    // Create new session with provided sessionId or generate new one
    const sessionIdToUse = sessionId || uuidv4();
    const session = await this.dynamoDBService.createSession({
      id: sessionIdToUse,
      tenantId,
      userId,
      locationId,
      isActive: true,
    });

    this.logger.log(`Created new session: ${session.id}`);
    return session;
  }

  async createMessage(tenantId: string, userId: string, messageId: string, content: string, sessionId?: string, role: 'user' | 'agent' = 'user') {
    // Get or create session
    const session = await this.getOrCreateSession(tenantId, userId, sessionId);

    const message = await this.dynamoDBService.createMessage({
      id: messageId,
      tenantId,
      sessionId: session.id,
      userId,
      content,
      role,
    });

    // Publish to Kafka
    await this.kafkaClient.emit('conversation-events', {
      type: 'message.created',
      tenantId,
      userId,
      sessionId: session.id,
      messageId,
      content,
      timestamp: new Date().toISOString(),
    });

    return message;
  }

  // Session Management
  async getSessions(tenantId: string, userId: string, limit = 10): Promise<ConversationSession[]> {
    return this.dynamoDBService.getSessions(tenantId, userId, limit);
  }

  async getSession(tenantId: string, sessionId: string): Promise<ConversationSession | null> {
    return this.dynamoDBService.getSession(tenantId, sessionId);
  }

  async closeSession(tenantId: string, sessionId: string): Promise<void> {
    await this.dynamoDBService.updateSession(tenantId, sessionId, { isActive: false });
  }

  // Message Management
  async getSessionMessages(tenantId: string, sessionId: string, limit = 20, before?: string): Promise<ConversationMessage[]> {
    return this.dynamoDBService.getSessionMessages(tenantId, sessionId, limit, before);
  }

  async getMessages(tenantId: string, limit = 20, before?: string): Promise<ConversationMessage[]> {
    return this.dynamoDBService.getMessages(tenantId, limit, before);
  }

  async getMessageByMessageId(messageId: string): Promise<ConversationMessage | null> {
    return this.dynamoDBService.getMessage(messageId);
  }

  async getActiveSession(tenantId: string, userId: string): Promise<ConversationSession | null> {
    const sessions = await this.dynamoDBService.getSessions(tenantId, userId, 1);
    return sessions.find(session => session.isActive) || null;
  }

  async handleConversationEvent(event: any) {
    this.logger.debug(`Received conversation event: ${JSON.stringify(event)}`);
    // Handle different types of conversation events
    switch (event.type) {
      case 'message.created':
        // Already handled in createMessage
        break;
      case 'message.updated':
        // Handle message updates
        break;
      case 'message.deleted':
        // Handle message deletion
        break;
      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  async createSession(tenantId: string, userId: string, locationId?: string): Promise<ConversationSession> {
    return this.dynamoDBService.createSession({
      id: uuidv4(),
      tenantId,
      userId,
      locationId,
      isActive: true,
    });
  }
} 