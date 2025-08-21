import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PermissionService } from './services/permission.service';
import { ResourceQueryService } from './services/resource-query.service';
import { KinesisService } from '../../kinesis.service';
import { ResourceEntity } from './entities/resource.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ResourceEntity]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService, PermissionService, ResourceQueryService, KinesisService],
  exports: [ResourcesService, PermissionService, ResourceQueryService],
})
export class ResourcesModule {}
