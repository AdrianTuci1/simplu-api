import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { BusinessScheduler } from './business.scheduler';

@Module({
  imports: [ConfigModule, DatabaseModule, SharedModule, InfrastructureModule],
  providers: [BusinessService, BusinessScheduler],
  controllers: [BusinessController],
  exports: [BusinessService],
})
export class BusinessModule {}

