import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsService } from './services/sqs.service';
import { EmailService } from './services/email.service';
import { ShardManagementService } from './services/shard-management.service';
import { EventBridgeService } from './services/event-bridge.service';

@Module({
  imports: [ConfigModule],
  providers: [SqsService, ShardManagementService, EmailService, EventBridgeService],
  exports: [SqsService, ShardManagementService, EmailService, EventBridgeService],
})
export class SharedModule {} 