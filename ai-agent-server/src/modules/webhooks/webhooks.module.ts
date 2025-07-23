import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { AgentModule } from '../agent/agent.module';
import { SessionModule } from '../session/session.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    AgentModule,
    SessionModule,
    BusinessInfoModule,
    ExternalApisModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {} 