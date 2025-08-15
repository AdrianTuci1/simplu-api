import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PermissionService } from './services/permission.service';
import { ResourceQueryService } from './services/resource-query.service';
import { KinesisService } from '../../kinesis.service';

@Module({
  imports: [ConfigModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, PermissionService, ResourceQueryService, KinesisService],
  exports: [ResourcesService, PermissionService, ResourceQueryService],
})
export class ResourcesModule {}
