import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceDataService } from './services/resource-data.service';
import { KinesisModule } from '../kinesis/kinesis.module';

@Module({
  imports: [
    ConfigModule,
    KinesisModule,
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    ResourceDataService,
  ],
  exports: [ResourcesService],
})
export class ResourcesModule {}
