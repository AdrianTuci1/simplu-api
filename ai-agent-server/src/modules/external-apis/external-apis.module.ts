import { Module, forwardRef } from '@nestjs/common';
import { ExternalApisService } from './external-apis.service';
import { GmailController } from './gmail/gmail.controller';
import { GmailService } from './gmail/gmail.service';
import { ElevenLabsController } from '@/modules/external-apis/voice/elevenlabs.controller';
import { ElevenLabsService } from '@/modules/external-apis/voice/elevenlabs.service';
// Removed legacy Bedrock bridge controller
import { ElevenLabsDirectToolsController } from '@/modules/external-apis/voice/elevenlabs-direct-tools.controller';
import { MetaController } from '@/modules/external-apis/meta/meta.controller';
import { MetaService } from '@/modules/external-apis/meta/meta.service';
import { MetaWebhookController } from '@/modules/external-apis/meta/meta-webhook.controller';
import { ExternalApiConfigController } from './controllers/external-api-config.controller';
import { ExternalApiConfigService } from './services/external-api-config.service';
import { MessageAutomationService } from './services/message-automation.service';
import { MessageAutomationController } from './controllers/message-automation.controller';
import { SMSController } from './sms/sms.controller';
import { BusinessInfoModule } from '@/modules/business-info/business-info.module';
import { AgentModule } from '@/modules/agent/agent.module';
import { ToolsModule } from '@/modules/tools/tools.module';
import { SessionModule } from '@/modules/session/session.module';
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';

@Module({
  imports: [
    BusinessInfoModule,
    forwardRef(() => AgentModule), // Pentru ElevenLabs → Bedrock bridge
    forwardRef(() => ToolsModule), // Pentru ResourcesQueryTool
    SessionModule, // Pentru session management în bridge
  ],
  providers: [
    ExternalApisService,
    GmailService,
    ElevenLabsService,
    MetaService,
    ExternalApiConfigService,
    MessageAutomationService,
    KinesisLoggerService, // Pentru logging
  ],
  controllers: [
    GmailController,
    ElevenLabsController,
    ElevenLabsDirectToolsController,   // Direct tool execution (preferred)
    MetaController,
    MetaWebhookController,
    ExternalApiConfigController,
    MessageAutomationController,
    SMSController,
  ],
  exports: [
    ExternalApisService,
    GmailService,
    ElevenLabsService,
    MetaService,
    ExternalApiConfigService,
    MessageAutomationService,
  ],
})
export class ExternalApisModule {} 