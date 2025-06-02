import { Module } from '@nestjs/common';
import { CommunicationConfigService } from './communication-config.service';
import { EntitiesModule } from '../entities/entities.module';

@Module({
  imports: [EntitiesModule],
  providers: [CommunicationConfigService],
  exports: [CommunicationConfigService],
})
export class CommunicationConfigModule {} 