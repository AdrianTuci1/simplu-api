import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { RagModule } from './modules/rag/rag.module';
import { AgentModule } from './modules/agent/agent.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ExternalApisModule } from './modules/external-apis/external-apis.module';
import { CredentialsModule } from './modules/external-apis/credentials/credentials.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CronModule } from './modules/cron/cron.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WebhookSecurityMiddleware } from './modules/webhooks/middleware/webhook-security.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    HttpModule,
    WebSocketModule,
    SessionModule,
    BusinessInfoModule,
    RagModule,
    AgentModule,
    ResourcesModule,
    ExternalApisModule,
    CredentialsModule,
    WebhooksModule,
    CronModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WebhookSecurityMiddleware)
      .forRoutes(
        { path: 'webhooks/meta/:businessId', method: RequestMethod.POST },
        { path: 'webhooks/twilio/:businessId', method: RequestMethod.POST }
      );
  }
} 