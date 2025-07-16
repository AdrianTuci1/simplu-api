import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private kafka = new Kafka({ brokers: ['localhost:9092'] });
  private producer: Producer;
  private consumer: Consumer;

  async onModuleInit() {
    this.producer = this.kafka.producer();
    await this.producer.connect();

    this.consumer = this.kafka.consumer({ groupId: 'simplu-api-group' });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'agent.recommendation',
      fromBeginning: true,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        console.log(
          `📩 [Kafka] Mesaj primit pe ${topic}:`,
          message?.value?.toString(),
        );
      },
    });
  }

  async send(topic: string, message: object) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }
}
