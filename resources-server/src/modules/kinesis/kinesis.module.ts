import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinesisService } from './kinesis.service';
import { KinesisErrorHandlerService } from './kinesis-error-handler.service';
import { KinesisConsumerService } from './kinesis-consumer.service';

@Module({
  imports: [ConfigModule],
  providers: [
    KinesisService, 
    KinesisErrorHandlerService,
    KinesisConsumerService,
  ],
  exports: [
    KinesisService, 
    KinesisErrorHandlerService,
    KinesisConsumerService,
  ],
})
export class KinesisModule {} 