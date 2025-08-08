import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessSchedulerService } from './business-scheduler.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentModule } from '../payment/payment.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [DatabaseModule, PaymentModule, InfrastructureModule, SharedModule, AuthModule],
  controllers: [BusinessController],
  providers: [BusinessService, BusinessSchedulerService],
  exports: [BusinessService],
})
export class BusinessModule {} 