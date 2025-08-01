import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesModule } from './modules/resources/resources.module';
import { AuthModule } from './modules/auth/auth.module';
import { KinesisModule } from './modules/kinesis/kinesis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ResourcesModule,
    KinesisModule,
  ],
})
export class AppModule {} 