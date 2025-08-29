import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ResourceEntity } from '../resources/entities/resource.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ResourceEntity])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
