import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AuthModule } from '../modules/auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';
import { BusinessScheduler } from './business.scheduler';
import { BusinessIdService } from './business-id.service';
import { CustomFormService } from './custom-form.service';
import { CognitoUserService } from '../modules/auth/cognito-user.service';

@Module({
  imports: [ConfigModule, DatabaseModule, SharedModule, InfrastructureModule, AuthModule, forwardRef(() => PaymentModule), UsersModule],
  providers: [BusinessService, BusinessScheduler, BusinessIdService, CustomFormService, CognitoUserService],
  controllers: [BusinessController],
  exports: [BusinessService],
})
export class BusinessModule {}

