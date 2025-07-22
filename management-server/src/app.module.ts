import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { BusinessModule } from './business/business.module';
import { PaymentModule } from './payment/payment.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    BusinessModule,
    PaymentModule,
    InfrastructureModule,
  ],
  controllers: [AppController],
})
export class AppModule {} 