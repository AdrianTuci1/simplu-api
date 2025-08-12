import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController, WebhookController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SubscriptionStoreService } from './subscription-store.service';
import { BusinessModule } from '../business/business.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [ConfigModule, forwardRef(() => BusinessModule), AuthModule],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, SubscriptionStoreService],
  exports: [PaymentService],
})
export class PaymentModule {}

