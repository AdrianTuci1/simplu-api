import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceModelService } from './services/resource-model.service';
import { ResourcePermissionsService } from './services/resource-permissions.service';
import { KinesisService } from '../../kinesis.service';

// Core services
import {
  BusinessTypeService,
  ResourceValidatorService,
  ResourceStructureService,
} from './services/core';

// Role services
import {
  RoleManagerService,
  RolePermissionService,
  BusinessRoleService,
} from './services/roles';

// Data services
import { ResourceDataService } from './services/data';

@Module({
  imports: [TypeOrmModule.forFeature([]), ConfigModule],
  controllers: [ResourcesController],
  providers: [
    // Main services
    ResourcesService,
    ResourceModelService,
    ResourcePermissionsService,

    // Core services
    BusinessTypeService,
    ResourceValidatorService,
    ResourceStructureService,

    // Role services
    RoleManagerService,
    RolePermissionService,
    BusinessRoleService,

    // Data services
    ResourceDataService,

    // External services
    KinesisService,
  ],
  exports: [
    ResourcesService,
    ResourceModelService,
    ResourcePermissionsService,
    BusinessTypeService,
    ResourceValidatorService,
    ResourceStructureService,
    RoleManagerService,
    RolePermissionService,
    BusinessRoleService,
    ResourceDataService,
    KinesisService,
  ],
})
export class ResourcesModule {}
