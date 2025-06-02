import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';

export interface MessagePayload {
  content: string;
  context: {
    lastAgentMessage?: string;
    metadata?: Record<string, any>;
  };
}

export interface KafkaMessage {
  tenantId: string;
  userId: string;
  sessionId: string;
  messageId: string;
  type: 'user.message' | 'agent.response';
  payload: MessagePayload;
  timestamp: string;
}

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);
  private producer: Producer;
  private consumer: Consumer;
  private readonly kafka: Kafka;
  private readonly publisherClientId: string;
  private readonly publisherGroupId: string;
  private processedMessageIds: Set<string> = new Set();

  constructor(private configService: ConfigService) {
    const kafkaBrokers = this.configService.get<string>('KAFKA_BROKERS')?.split(',') || ['localhost:9092'];
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'ai-agent-consumer';
    const groupId = this.configService.get<string>('KAFKA_GROUP_ID') || 'ai-agent-consumer-group';
    this.publisherClientId = this.configService.get<string>('KAFKA_PUBLISHER_CLIENT_ID') || 'ai-agent-publisher';
    this.publisherGroupId = this.configService.get<string>('KAFKA_PUBLISHER_GROUP_ID') || 'ai-agent-publisher-group';
    
    this.kafka = new Kafka({
      clientId: this.publisherClientId,
      brokers: kafkaBrokers,
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
  }

  async onModuleInit() {
    try {
      const consumerTopic = this.configService.get<string>('KAFKA_CONSUMER_TOPIC');
      const publisherTopic = this.configService.get<string>('KAFKA_PUBLISHER_TOPIC');

      if (!consumerTopic || !publisherTopic) {
        throw new Error('KAFKA_CONSUMER_TOPIC and KAFKA_PUBLISHER_TOPIC must be defined');
      }

      this.logger.log('Initializing Kafka service...');
      this.logger.log(`Connecting to Kafka brokers: ${this.configService.get<string>('KAFKA_BROKERS')}`);
      this.logger.log(`Using publisher client ID: ${this.publisherClientId}`);
      this.logger.log(`Using publisher group ID: ${this.publisherGroupId}`);
      this.logger.log(`Consumer topic: ${consumerTopic}`);
      this.logger.log(`Publisher topic: ${publisherTopic}`);
      
      await this.producer.connect();
      this.logger.log('Producer connected successfully');
      
      await this.consumer.connect();
      this.logger.log('Consumer connected successfully');
      
      // Subscribe to the consumer topic
      await this.consumer.subscribe({
        topics: [consumerTopic],
        fromBeginning: true
      });
      this.logger.log(`Subscribed to ${consumerTopic} topic`);

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          this.logger.debug(`Received message from ${topic}[${partition}]: ${message.value}`);
          await this.handleConversationMessage(message);
        },
      });

      this.logger.log('Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka service', error);
      throw error;
    }
  }

  private async handleConversationMessage(message: any) {
    try {
      const event = JSON.parse(message.value.toString()) as KafkaMessage;
      this.logger.debug(`Processing conversation message: ${JSON.stringify(event)}`);
      
      // Skip if we've already processed this message
      if (this.processedMessageIds.has(event.messageId)) {
        this.logger.debug(`Skipping already processed message: ${event.messageId}`);
        return;
      }
      
      // Handle messages from Elixir
      if (event.type === 'user.message') {
        this.logger.log('Received user message from Elixir');
        
        // Mark message as processed before sending response
        this.processedMessageIds.add(event.messageId);
        
        const response: KafkaMessage = {
          tenantId: event.tenantId,
          userId: event.userId,
          sessionId: event.sessionId,
          messageId: event.messageId,
          type: 'agent.response',
          payload: {
            content: "I've processed your request", // Simplified response
            context: event.payload.context
          },
          timestamp: new Date().toISOString()
        };

        // Publish response to agent.to.elixir topic
        await this.publishConversation(response);
        
        this.logger.log('Response published successfully');
        return;
      }

      // Handle other message types if needed
      this.logger.debug(`Unhandled message type: ${event.type}`);
    } catch (error) {
      this.logger.error('Error handling conversation message', error);
    }
  }

  async publishConversation(message: KafkaMessage) {
    try {
      const topic = this.configService.get<string>('KAFKA_PUBLISHER_TOPIC');
      if (!topic) {
        throw new Error('KAFKA_PUBLISHER_TOPIC is not defined');
      }

      const kafkaMessage = {
        key: `${message.tenantId}:${message.messageId}`,
        value: JSON.stringify(message),
        headers: {
          tenantId: message.tenantId,
          userId: message.userId,
          sessionId: message.sessionId,
          messageId: message.messageId,
          type: message.type,
          timestamp: message.timestamp
        },
      };

      await this.producer.send({
        topic,
        messages: [kafkaMessage],
      });

      this.logger.debug(`Published message to ${topic}: ${JSON.stringify(kafkaMessage)}`);
    } catch (error) {
      this.logger.error('Error publishing conversation', error);
      throw error;
    }
  }

  // Clean up processed message IDs periodically to prevent memory leaks
  private cleanupProcessedMessages() {
    if (this.processedMessageIds.size > 1000) {
      this.processedMessageIds.clear();
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
} 