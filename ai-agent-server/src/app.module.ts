import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    // TypeORM configuration for RDS
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rdsConfig = configService.get('database.rds');
        return {
          type: 'postgres',
          host: rdsConfig.host,
          port: rdsConfig.port,
          username: rdsConfig.username,
          password: rdsConfig.password,
          database: rdsConfig.database,
          ssl: rdsConfig.ssl ? { rejectUnauthorized: false } : false,
          synchronize: rdsConfig.synchronize,
          logging: rdsConfig.logging,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          // Additional connection options
          extra: {
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 20,
          },
        };
      },
      inject: [ConfigService],
    }),
    HttpModule,
    WebSocketModule,
    SessionModule,
    BusinessInfoModule,
    RagModule,
    AgentModule,
    ResourcesModule,
    // Optionally include external-apis and webhooks modules based on env flags
    ...(process.env.DISABLE_EXTERNAL_APIS === 'true'
      ? (console.warn('ExternalApisModule disabled via DISABLE_EXTERNAL_APIS=true'), [])
      : [ExternalApisModule, CredentialsModule]),
    ...(process.env.DISABLE_WEBHOOKS === 'true'
      ? (console.warn('WebhooksModule disabled via DISABLE_WEBHOOKS=true'), [])
      : [WebhooksModule]),
    CronModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    if (process.env.DISABLE_WEBHOOKS === 'true') {
      console.warn('WebhookSecurityMiddleware not applied due to DISABLE_WEBHOOKS=true');
      return;
    }
    consumer
      .apply(WebhookSecurityMiddleware)
      .forRoutes(
        { path: 'webhooks/meta/:businessId', method: RequestMethod.POST },
        { path: 'webhooks/twilio/:businessId', method: RequestMethod.POST }
      );
  }
} 