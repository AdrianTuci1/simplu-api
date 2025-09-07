import { Module } from '@nestjs/common';
import { ExternalApisService } from './external-apis.service';
import { GmailController } from './gmail/gmail.controller';
import { GmailService } from './gmail/gmail.service';
import { ElevenLabsController } from '@/modules/external-apis/voice/elevenlabs.controller';
import { ElevenLabsService } from '@/modules/external-apis/voice/elevenlabs.service';
import { MetaController } from '@/modules/external-apis/meta/meta.controller';
import { MetaService } from '@/modules/external-apis/meta/meta.service';

@Module({
  providers: [ExternalApisService, GmailService, ElevenLabsService, MetaService],
  controllers: [GmailController, ElevenLabsController, MetaController],
  exports: [ExternalApisService, GmailService, ElevenLabsService, MetaService],
})
export class ExternalApisModule {} 