import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService {
  private producer: Producer;

  constructor(private configService: ConfigService) {
    const broker = this.configService.get<string>('KAFKA_BROKER');
    if (!broker) {
      throw new Error('KAFKA_BROKER is not defined');
    }

    const kafka = new Kafka({
      clientId: 'communication-agent',
      brokers: [broker],
    });

    this.producer = kafka.producer();
    this.connect();
  }

  private async connect() {
    try {
      await this.producer.connect();
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
    }
  }

  async publish(topic: string, message: any) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
    } catch (error) {
      console.error('Failed to publish message to Kafka:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
  }
} 