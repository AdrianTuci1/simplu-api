import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinesisConsumerService } from './kinesis-consumer.service';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    ConfigModule,
    ResourcesModule,
  ],
  providers: [KinesisConsumerService],
  exports: [KinesisConsumerService],
})
export class KinesisModule {} 