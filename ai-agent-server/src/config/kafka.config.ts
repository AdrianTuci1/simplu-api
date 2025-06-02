import { KafkaOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Partitioners } from 'kafkajs';

export const getKafkaConfig = (configService: ConfigService): KafkaOptions => {
  const brokers = configService.get<string>('KAFKA_BROKERS');
  const clientId = configService.get<string>('KAFKA_CLIENT_ID');
  const groupId = configService.get<string>('KAFKA_GROUP_ID');

  if (!brokers) throw new Error('KAFKA_BROKERS is not defined');
  if (!clientId) throw new Error('KAFKA_CLIENT_ID is not defined');
  if (!groupId) throw new Error('KAFKA_GROUP_ID is not defined');

  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId,
        brokers: [brokers],
      },
      consumer: {
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      },
      producer: {
        createPartitioner: Partitioners.LegacyPartitioner,
      },
    },
  };
}; 