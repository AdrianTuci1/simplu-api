import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [ConfigModule, PaymentModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

