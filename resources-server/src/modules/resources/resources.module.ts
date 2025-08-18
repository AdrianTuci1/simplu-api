import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceDataService } from './services/resource-data.service';
import { DatabaseService } from './services/database.service';
import { ResourceQueryService } from './services/resource-query.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    NotificationModule,
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    ResourceDataService,
    DatabaseService,
    ResourceQueryService,
  ],
  exports: [
    ResourcesService,
    DatabaseService,
    ResourceQueryService,
  ],
})
export class ResourcesModule {}
