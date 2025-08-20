import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceDataService } from './services/resource-data.service';
import { DatabaseService } from './services/database.service';
import { ResourceIdService } from './services/resource-id.service';
import { NotificationModule } from '../notification/notification.module';
import { ResourceEntity } from './models/resource.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ResourceEntity]),
    NotificationModule,
  ],
  providers: [
    ResourceDataService,
    DatabaseService,
    ResourceIdService,
  ],
  exports: [
    ResourceDataService,
    DatabaseService,
    ResourceIdService,
  ],
})
export class ResourcesModule {}
