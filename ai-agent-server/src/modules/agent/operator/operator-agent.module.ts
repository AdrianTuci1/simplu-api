import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OperatorAgentService } from './operator-agent.service';
import { BusinessInfoModule } from '../../business-info/business-info.module';
import { RagModule } from '../../rag/rag.module';
import { SessionModule } from '../../session/session.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { ExternalApisModule } from '../../external-apis/external-apis.module';
import { ExternalApisService } from '../../external-apis/external-apis.service';

@Module({
  imports: [
    HttpModule,
    BusinessInfoModule,
    RagModule,
    SessionModule,
    forwardRef(() => WebSocketModule),
    // Optionally include ExternalApisModule; otherwise provide a lightweight mock
    ...(process.env.DISABLE_EXTERNAL_APIS === 'true' ? [] : [ExternalApisModule]),
  ],
  providers: [
    OperatorAgentService,
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
  exports: [OperatorAgentService],
})
export class OperatorAgentModule {}
