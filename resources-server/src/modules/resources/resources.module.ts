import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourceDataService } from './services/resource-data.service';
import { DatabaseService } from './services/database.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    NotificationModule,
  ],
  providers: [
    ResourceDataService,
    DatabaseService,
  ],
  exports: [
    ResourceDataService,
    DatabaseService,
  ],
})
export class ResourcesModule {}
