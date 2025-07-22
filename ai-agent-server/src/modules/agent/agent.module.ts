import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { RagModule } from '../rag/rag.module';
import { SessionModule } from '../session/session.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ResourcesModule } from '../resources/resources.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    BusinessInfoModule,
    RagModule,
    SessionModule,
    WebSocketModule,
    ResourcesModule,
    ExternalApisModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {} 