import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientBookingController } from './patient-booking.controller';
import { PatientBookingService } from './patient-booking.service';
import { ResourceEntity } from '../resources/entities/resource.entity';
import { ResourceQueryService } from '../resources/services/resource-query.service';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { AuthModule } from '../auth/auth.module';
import { KinesisService } from '../../kinesis.service';
import { MessageAutomationService } from '../../services/message-automation.service';
import { ExternalApiConfigService } from '../../services/external-api-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceEntity]),
    BusinessInfoModule,
    AuthModule,
  ],
  controllers: [PatientBookingController],
  providers: [
    PatientBookingService, 
    ResourceQueryService, 
    KinesisService,
    MessageAutomationService,
    ExternalApiConfigService
  ],
  exports: [PatientBookingService],
})
export class PatientBookingModule {}


