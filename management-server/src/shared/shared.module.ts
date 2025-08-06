import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqsService } from './services/sqs.service';
import { ShardManagementService } from './services/shard-management.service';

@Module({
  imports: [ConfigModule],
  providers: [SqsService, ShardManagementService],
  exports: [SqsService, ShardManagementService],
})
export class SharedModule {} 