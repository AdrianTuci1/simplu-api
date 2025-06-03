import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { Session } from './entities/session.entity';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    const topics = ['conversations', 'conversation-events'];
    topics.forEach((topic) => {
      this.kafkaClient.subscribeToResponseOf(topic);
    });
    await this.kafkaClient.connect();
  }

  async getOrCreateSession(tenantId: string, userId: string, sessionId?: string): Promise<Session> {
    // If sessionId is provided, try to get the session
    if (sessionId) {
      const existingSession = await this.getSession(tenantId, sessionId);
      if (existingSession) {
        return existingSession;
      }
      this.logger.log(`Session ${sessionId} not found, creating new session with provided ID`);
    }

    // Create new session with provided sessionId or generate new one
    const session = this.sessionRepository.create({
      id: sessionId, // Use provided sessionId if available
      tenantId,
      userId,
      isActive: true,
    });
    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Created new session: ${savedSession.id}`);
    return savedSession;
  }

  async createMessage(tenantId: string, userId: string, messageId: string, content: string, sessionId?: string) {
    // Get or create session
    const session = await this.getOrCreateSession(tenantId, userId, sessionId);

    const message = this.messageRepository.create({
      tenantId,
      messageId,
      content,
      sessionId: session.id,
    });
    const savedMessage = await this.messageRepository.save(message);

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

    return savedMessage;
  }

  // Session Management
  async getSessions(tenantId: string, userId: string, limit = 10) {
    return this.sessionRepository.find({
      where: {
        tenantId,
        userId,
      },
      order: {
        updatedAt: 'DESC',
      },
      take: limit,
      relations: ['messages'],
    });
  }

  async getSession(tenantId: string, sessionId: string) {
    return this.sessionRepository.findOne({
      where: {
        id: sessionId,
        tenantId,
      },
      relations: ['messages'],
    });
  }

  async closeSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (session) {
      session.isActive = false;
      await this.sessionRepository.save(session);
    }
    return session;
  }

  // Message Management
  async getSessionMessages(tenantId: string, sessionId: string, limit = 20, before?: string) {
    const query = this.messageRepository.createQueryBuilder('message')
      .where('message.tenantId = :tenantId', { tenantId })
      .andWhere('message.sessionId = :sessionId', { sessionId });

    if (before) {
      query.andWhere('message.timestamp < :before', { before });
    }

    return query
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .getMany();
  }

  async getMessages(tenantId: string, limit = 20, before?: string) {
    const query = this.messageRepository.createQueryBuilder('message')
      .where('message.tenantId = :tenantId', { tenantId });

    if (before) {
      query.andWhere('message.timestamp < :before', { before });
    }

    return query
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .getMany();
  }

  async getMessageByMessageId(messageId: string) {
    return this.messageRepository.findOne({
      where: { messageId },
    });
  }

  async getActiveSession(tenantId: string, userId: string) {
    return this.sessionRepository.findOne({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
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

  async createSession(tenantId: string, userId: string) {
    const session = this.sessionRepository.create({
      tenantId,
      userId,
      isActive: true,
    });
    return this.sessionRepository.save(session);
  }
} 