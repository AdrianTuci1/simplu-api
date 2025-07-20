import { Module } from '@nestjs/common';
import { ActionRegistryService } from './action-registry.service';
import { DecisionEngineService } from './decision-engine.service';
import { ActionExecutorService } from './action-executor.service';
import { TokenModule } from '../token/token.module';
import { CommunicationsModule } from '../communications/communications.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    TokenModule,
    CommunicationsModule,
    ResourcesModule,
  ],
  providers: [
    ActionRegistryService,
    DecisionEngineService,
    ActionExecutorService,
  ],
  exports: [
    ActionRegistryService,
    DecisionEngineService,
    ActionExecutorService,
  ],
})
export class ActionsModule {} 