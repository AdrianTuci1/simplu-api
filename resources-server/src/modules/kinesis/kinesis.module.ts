import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinesisService } from './kinesis.service';

@Module({
  imports: [ConfigModule],
  providers: [KinesisService],
  exports: [KinesisService],
})
export class KinesisModule {} 