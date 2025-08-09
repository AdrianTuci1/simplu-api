import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { SubscriptionStoreService } from './subscription-store.service';

@Module({
  imports: [ConfigModule, UsersModule, DatabaseModule],
  providers: [PaymentService, SubscriptionStoreService],
  controllers: [PaymentController],
  exports: [PaymentService, SubscriptionStoreService],
})
export class PaymentModule {} 