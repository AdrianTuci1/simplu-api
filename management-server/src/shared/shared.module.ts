import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsService } from './services/sqs.service';
import { EmailService } from './services/email.service';
import { ShardManagementService } from './services/shard-management.service';

@Module({
  imports: [ConfigModule],
  providers: [SqsService, ShardManagementService, EmailService],
  exports: [SqsService, ShardManagementService, EmailService],
})
export class SharedModule {} 