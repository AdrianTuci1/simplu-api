import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinesisService } from './kinesis.service';
import { KinesisErrorHandlerService } from './kinesis-error-handler.service';

@Module({
  imports: [ConfigModule],
  providers: [KinesisService, KinesisErrorHandlerService],
  exports: [KinesisService, KinesisErrorHandlerService],
})
export class KinesisModule {} 