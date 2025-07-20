import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { DynamoDBService } from './dynamodb.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        useFactory: (configService: ConfigService) => {
          const brokers = configService.get<string>('KAFKA_BROKERS');
          const groupId = configService.get<string>('KAFKA_GROUP_ID') || 'elixir-consumer-group';
          
          if (!brokers) {
            throw new Error('KAFKA_BROKERS is not defined');
          }
          
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                brokers: brokers.split(','),
              },
              consumer: {
                groupId,
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [ConversationsService, DynamoDBService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {} 