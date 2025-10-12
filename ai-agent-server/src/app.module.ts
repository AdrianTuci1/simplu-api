import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { AgentModule } from './modules/agent/agent.module';
import { ExternalApisModule } from './modules/external-apis/external-apis.module';
import { CredentialsModule } from './modules/external-apis/credentials/credentials.module';
import { CronModule } from './modules/cron/cron.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RatingModule } from './modules/rating/rating.module';
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
    AgentModule,
    ExternalApisModule,
    CredentialsModule,
    CronModule,
    MessagesModule,
    RatingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} 