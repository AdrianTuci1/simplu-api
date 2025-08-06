import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesModule } from './modules/resources/resources.module';
import { KinesisModule } from './modules/kinesis/kinesis.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SqsModule } from './modules/sqs/sqs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ResourcesModule,
    KinesisModule,
    HealthModule,
    NotificationModule,
    SqsModule,
  ],
})
export class AppModule {} 