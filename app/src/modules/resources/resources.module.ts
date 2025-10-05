import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PermissionService } from './services/permission.service';
import { ResourceQueryService } from './services/resource-query.service';
import { StatisticsService } from './services/statistics.service';
import { KinesisService } from '../../kinesis.service';
import { ResourceEntity } from './entities/resource.entity';
import { AuthModule } from '../auth/auth.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { MessageAutomationService } from '../../services/message-automation.service';
import { ExternalApiConfigService } from '../../services/external-api-config.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ResourceEntity]),
    AuthModule,
    BusinessInfoModule,
  ],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    PermissionService,
    ResourceQueryService,
    StatisticsService,
    KinesisService,
    MessageAutomationService,
    ExternalApiConfigService,
  ],
  exports: [
    ResourcesService,
    PermissionService,
    ResourceQueryService,
    StatisticsService,
  ],
})
export class ResourcesModule {}
