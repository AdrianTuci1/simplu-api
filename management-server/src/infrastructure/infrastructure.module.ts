import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureController } from './infrastructure.controller';

@Module({
  imports: [ConfigModule],
  providers: [InfrastructureService],
  controllers: [InfrastructureController],
  exports: [InfrastructureService],
})
export class InfrastructureModule {} 