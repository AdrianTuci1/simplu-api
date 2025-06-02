import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    const topics = ['conversations', 'conversation-events'];
    topics.forEach((topic) => {
      this.kafkaClient.subscribeToResponseOf(topic);
    });
    await this.kafkaClient.connect();
  }

  async createMessage(tenantId: string, messageId: string, content: string) {
    const message = this.messageRepository.create({
      tenantId,
      messageId,
      content,
    });
    const savedMessage = await this.messageRepository.save(message);

    // Publish to Kafka
    await this.kafkaClient.emit('conversation-events', {
      type: 'message.created',
      tenantId,
      messageId,
      content,
      timestamp: new Date().toISOString(),
    });

    return savedMessage;
  }

  async getMessages(tenantId: string, limit = 10) {
    return this.messageRepository.find({
      where: { tenantId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getMessageByMessageId(messageId: string) {
    return this.messageRepository.findOne({
      where: { messageId },
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
} 