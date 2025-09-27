import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OperatorAgentService } from './operator-agent.service';
import { BusinessInfoModule } from '../../business-info/business-info.module';
import { RagModule } from '../../rag/rag.module';
import { SessionModule } from '../../session/session.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { ResourcesModule } from '../../resources/resources.module';
import { ExternalApisModule } from '../../external-apis/external-apis.module';
import { ExternalApisService } from '../../external-apis/external-apis.service';
import { AgentWebSocketHandler } from './handlers/agent-websocket.handler';
import { AgentQueryModifier } from './handlers/agent-query-modifier';

@Module({
  imports: [
    HttpModule,
    BusinessInfoModule,
    RagModule,
    SessionModule,
    forwardRef(() => WebSocketModule),
    ResourcesModule,
    // Optionally include ExternalApisModule; otherwise provide a lightweight mock
    ...(process.env.DISABLE_EXTERNAL_APIS === 'true' ? [] : [ExternalApisModule]),
  ],
  providers: [
    OperatorAgentService,
    AgentWebSocketHandler,
    AgentQueryModifier,
    // When external APIs are disabled, inject a minimal mock to satisfy dependencies
    ...(process.env.DISABLE_EXTERNAL_APIS === 'true'
      ? [{
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: async () => ({ success: false }),
            sendSMS: async () => ({ success: false }),
            sendEmail: async () => ({ success: false }),
            sendEmailFromGmail: async () => ({ success: false }),
          },
        }]
      : []),
  ],
  exports: [OperatorAgentService, AgentWebSocketHandler, AgentQueryModifier],
})
export class OperatorAgentModule {}
