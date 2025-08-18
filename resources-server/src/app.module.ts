import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesModule } from './modules/resources/resources.module';
import { KinesisModule } from './modules/kinesis/kinesis.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    ResourcesModule,
    KinesisModule,
    HealthModule,
  ],
})
export class AppModule {} 