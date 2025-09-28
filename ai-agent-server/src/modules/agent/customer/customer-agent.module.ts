import { Module, forwardRef } from '@nestjs/common';
import { CustomerAgentService } from './customer-agent.service';
import { BusinessInfoModule } from '../../business-info/business-info.module';
import { RagModule } from '../../rag/rag.module';
import { SessionModule } from '../../session/session.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { ExternalApisModule } from '../../external-apis/external-apis.module';
import { ExternalApisService } from '../../external-apis/external-apis.service';
import { AppServerClient } from './clients/app-server.client';

@Module({
  imports: [
    BusinessInfoModule,
    RagModule,
    SessionModule,
    forwardRef(() => WebSocketModule),
    ExternalApisModule,
  ],
  providers: [
    CustomerAgentService,
    AppServerClient,
  ],
  exports: [CustomerAgentService, AppServerClient],
})
export class CustomerAgentModule {}
