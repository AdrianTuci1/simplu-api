import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceDataService } from './services/resource-data.service';
import { DatabaseService } from './services/database.service';
import { KinesisConsumerService } from './services/kinesis-consumer.service';
import { ResourceQueryService } from './services/resource-query.service';
import { KinesisModule } from '../kinesis/kinesis.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    KinesisModule,
    NotificationModule,
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    ResourceDataService,
    DatabaseService,
    KinesisConsumerService,
    ResourceQueryService,
  ],
  exports: [
    ResourcesService,
    DatabaseService,
    KinesisConsumerService,
    ResourceQueryService,
  ],
})
export class ResourcesModule {}
