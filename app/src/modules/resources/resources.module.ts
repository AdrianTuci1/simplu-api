import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceModelService } from './services/resource-model.service';
import { ResourcePermissionsService } from './services/resource-permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    ConfigModule,
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    ResourceModelService,
    ResourcePermissionsService,
  ],
  exports: [
    ResourcesService,
    ResourceModelService,
    ResourcePermissionsService,
  ],
})
export class ResourcesModule {}
