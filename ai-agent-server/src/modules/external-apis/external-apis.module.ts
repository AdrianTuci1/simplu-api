import { Module } from '@nestjs/common';
import { ExternalApisService } from './external-apis.service';
import { GmailController } from './gmail/gmail.controller';
import { GmailService } from './gmail/gmail.service';
import { ElevenLabsController } from '@/modules/external-apis/voice/elevenlabs.controller';
import { ElevenLabsService } from '@/modules/external-apis/voice/elevenlabs.service';
import { MetaController } from '@/modules/external-apis/meta/meta.controller';
import { MetaService } from '@/modules/external-apis/meta/meta.service';
import { ExternalApiConfigController } from './controllers/external-api-config.controller';
import { ExternalApiConfigService } from './services/external-api-config.service';
import { MessageAutomationService } from './services/message-automation.service';
import { MessageAutomationController } from './controllers/message-automation.controller';
import { SMSController } from './sms/sms.controller';
import { BusinessInfoModule } from '@/modules/business-info/business-info.module';

@Module({
  imports: [BusinessInfoModule],
  providers: [ExternalApisService, GmailService, ElevenLabsService, MetaService, ExternalApiConfigService, MessageAutomationService],
  controllers: [GmailController, ElevenLabsController, MetaController, ExternalApiConfigController, MessageAutomationController, SMSController],
  exports: [ExternalApisService, GmailService, ElevenLabsService, MetaService, ExternalApiConfigService, MessageAutomationService],
})
export class ExternalApisModule {} 