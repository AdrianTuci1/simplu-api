import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(private configService: ConfigService) {
    const kafkaConfig = this.configService.get('kafka');

    const kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publishEvent(topic: string, data: any) {
    const message: ProducerRecord = {
      topic,
      messages: [
        {
          value: JSON.stringify({
            timestamp: new Date().toISOString(),
            data,
          }),
        },
      ],
    };

    return this.producer.send(message);
  }
}
