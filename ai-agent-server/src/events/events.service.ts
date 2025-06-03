import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import { AgentService } from '../agent/agent.service';
import { KafkaMessage } from './kafka.service';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private producer: Producer;
  private consumer: Consumer;
  private readonly kafka: Kafka;
  private readonly consumerTopic: string;
  private readonly publisherTopic: string;
  private processedMessageIds: Set<string> = new Set();
  private readonly MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => AgentService))
    private agentService: AgentService,
    private conversationsService: ConversationsService
  ) {
    const brokers = this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092';
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'ai-agent-server';
    const groupId = this.configService.get<string>('KAFKA_GROUP_ID') || 'agent-consumer-group';
    const publisherClientId = this.configService.get<string>('KAFKA_PUBLISHER_CLIENT_ID') || 'ai-agent-publisher';
    
    this.consumerTopic = this.configService.get<string>('KAFKA_CONSUMER_TOPIC') || 'elixir.to.agent';
    this.publisherTopic = this.configService.get<string>('KAFKA_PUBLISHER_TOPIC') || 'agent.to.elixir';
    
    this.logger.log(`Initializing Kafka with brokers: ${brokers}, clientId: ${clientId}, groupId: ${groupId}`);
    this.logger.log(`Publisher config - clientId: ${publisherClientId}`);
    this.logger.log(`Consumer topic: ${this.consumerTopic}, Publisher topic: ${this.publisherTopic}`);
    
    this.kafka = new Kafka({
      clientId: publisherClientId,
      brokers: brokers.split(','),
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      // Compatibilitate cu Elixir
      maxWaitTimeInMs: 10000,
      minBytes: 1,
      maxBytes: 1048576, // 1MB
      allowAutoTopicCreation: true
    });
  }

  private isMessageExpired(timestamp: string): boolean {
    const messageTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    return currentTime - messageTime > this.MESSAGE_TTL;
  }

  private cleanupOldMessages() {
    const currentTime = Date.now();
    for (const messageId of this.processedMessageIds) {
      const [timestamp] = messageId.split(':');
      if (currentTime - parseInt(timestamp) > this.MESSAGE_TTL) {
        this.processedMessageIds.delete(messageId);
      }
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Kafka service...');
      
      await this.producer.connect();
      await this.consumer.connect();
      this.logger.log('Connected to Kafka');

      await this.consumer.subscribe({ 
        topic: this.consumerTopic,
        fromBeginning: true 
      });
      this.logger.log(`Subscribed to ${this.consumerTopic} topic`);

      await this.consumer.run({
        autoCommit: true,
        autoCommitInterval: 5000,
        autoCommitThreshold: 100,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            this.logger.log(`Received message from ${topic}[${partition}]: ${message.value.toString()}`);
            
            const parsedMessage = JSON.parse(message.value.toString()) as KafkaMessage;
            this.logger.log(`Parsed message: ${JSON.stringify(parsedMessage)}`);
            
            if (parsedMessage.type === 'user.message') {
              // Save user message to database only when received
              await this.conversationsService.createMessage(
                parsedMessage.tenantId,
                parsedMessage.userId,
                parsedMessage.messageId,
                parsedMessage.payload.content,
                parsedMessage.sessionId
              );

              const agentResponse = await this.agentService.processMessage(
                parsedMessage.tenantId,
                parsedMessage.userId,
                parsedMessage.sessionId,
                parsedMessage.payload.content,
                parsedMessage.payload.context
              );

              // Save agent response to database
              const responseMessageId = `response-${Date.now()}`;
              await this.conversationsService.createMessage(
                parsedMessage.tenantId,
                parsedMessage.userId,
                responseMessageId,
                agentResponse,
                parsedMessage.sessionId
              );

              const response: KafkaMessage = {
                tenantId: parsedMessage.tenantId,
                userId: parsedMessage.userId,
                sessionId: parsedMessage.sessionId,
                messageId: responseMessageId,
                type: 'agent.response',
                payload: {
                  content: agentResponse,
                  context: parsedMessage.payload.context
                },
                timestamp: new Date().toISOString()
              };

              this.logger.log(`Preparing to send response to ${this.publisherTopic}: ${JSON.stringify(response)}`);

              await this.producer.send({
                topic: this.publisherTopic,
                messages: [
                  {
                    key: `${parsedMessage.tenantId}:${parsedMessage.messageId}`,
                    value: JSON.stringify(response),
                    headers: {
                      tenantId: parsedMessage.tenantId,
                      userId: parsedMessage.userId,
                      sessionId: parsedMessage.sessionId,
                      messageId: responseMessageId,
                      type: response.type,
                      timestamp: response.timestamp
                    },
                  },
                ],
              });

              this.logger.log('Response published successfully');
            } else {
              this.logger.warn(`Unknown message type: ${parsedMessage.type}`);
            }
          } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`, error.stack);
          }
        },
      });

      this.logger.log('Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka service', error);
      throw error;
    }
  }

  async publishEvent(topic: string, message: KafkaMessage | any) {
    try {
      this.logger.debug(`Publishing event to ${topic}: ${JSON.stringify(message)}`);
      
      // If message is already a KafkaMessage, use it directly
      if ('type' in message && 'payload' in message && 'tenantId' in message) {
        const result = await this.producer.send({
          topic,
          messages: [
            {
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
            },
          ],
        });
        this.logger.debug(`Publish result: ${JSON.stringify(result)}`);
        return result;
      }
      
      // For backward compatibility with old message format
      const result = await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      this.logger.debug(`Publish result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error publishing event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publishSuggestion(tenantId: string, userId: string, sessionId: string, message: string) {
    const suggestionMessage: KafkaMessage = {
      tenantId,
      userId,
      sessionId,
      messageId: `suggestion-${Date.now()}`,
      type: 'agent.response',
      payload: {
        content: message,
        context: {}
      },
      timestamp: new Date().toISOString()
    };
    return this.publishEvent('agent.suggestions', suggestionMessage);
  }

  async publishAction(tenantId: string, userId: string, sessionId: string, action: string, details: any) {
    const actionMessage: KafkaMessage = {
      tenantId,
      userId,
      sessionId,
      messageId: `action-${Date.now()}`,
      type: 'agent.response',
      payload: {
        content: action,
        context: details
      },
      timestamp: new Date().toISOString()
    };
    return this.publishEvent('agent.actions', actionMessage);
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
} 