import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async createMessage(tenantId: string, userId: string, messageId: string, content: string, sessionId?: string) {
    // If no sessionId is provided, create a new session
    if (!sessionId) {
      const session = this.sessionRepository.create({
        tenantId,
        userId,
        isActive: true,
      });
      const savedSession = await this.sessionRepository.save(session);
      sessionId = savedSession.id;
    }

    const message = this.messageRepository.create({
      tenantId,
      messageId,
      content,
      sessionId,
    });
    const savedMessage = await this.messageRepository.save(message);

    // Publish to Kafka
    await this.kafkaClient.emit('conversation-events', {
      type: 'message.created',
      tenantId,
      userId,
      sessionId,
      messageId,
      content,
      timestamp: new Date().toISOString(),
    });

    return savedMessage;
  }

  async getMessages(tenantId: string, sessionId?: string, limit = 10) {
    const query = this.messageRepository.createQueryBuilder('message')
      .where('message.tenantId = :tenantId', { tenantId });

    if (sessionId) {
      query.andWhere('message.sessionId = :sessionId', { sessionId });
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

  async closeSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (session) {
      session.isActive = false;
      await this.sessionRepository.save(session);
    }
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
} 