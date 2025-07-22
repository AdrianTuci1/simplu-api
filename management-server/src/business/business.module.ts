import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessSchedulerService } from './business-scheduler.service';
import { DatabaseModule } from '../database/database.module';
import { PaymentModule } from '../payment/payment.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [DatabaseModule, PaymentModule, InfrastructureModule],
  controllers: [BusinessController],
  providers: [BusinessService, BusinessSchedulerService],
  exports: [BusinessService],
})
export class BusinessModule {} 