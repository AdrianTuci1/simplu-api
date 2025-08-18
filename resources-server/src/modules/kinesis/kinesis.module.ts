import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinesisConsumerService } from './kinesis-consumer.service';

@Module({
  imports: [ConfigModule],
  providers: [KinesisConsumerService],
  exports: [KinesisConsumerService],
})
export class KinesisModule {} 