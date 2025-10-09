import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsConsumerService } from './sqs-consumer.service';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [ConfigModule, ResourcesModule],
  providers: [SqsConsumerService],
  exports: [SqsConsumerService],
})
export class SqsModule implements OnModuleInit {
  constructor(private readonly sqsConsumerService: SqsConsumerService) {}

  async onModuleInit() {
    // Start polling for SQS messages when the module initializes
    await this.sqsConsumerService.startPolling();
  }
} 