import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceDataService } from './services/resource-data.service';
import { DatabaseService } from './services/database.service';
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
  ],
  exports: [
    ResourcesService,
    ResourceDataService,
    DatabaseService,
  ],
})
export class ResourcesModule {}
