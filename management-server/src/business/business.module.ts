import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BusinessScheduler } from './business.scheduler';

@Module({
  imports: [ConfigModule, DatabaseModule, SharedModule, InfrastructureModule, AuthModule],
  providers: [BusinessService, BusinessScheduler],
  controllers: [BusinessController],
  exports: [BusinessService],
})
export class BusinessModule {}

