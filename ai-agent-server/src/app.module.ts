import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from './agent/agent.module';
import { EventsModule } from './events/events.module';
import { PolicyModule } from './policy/policy.module';
import { RoutesModule } from './routes/routes.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TokenModule } from './token/token.module';
import { ActionsModule } from './actions/actions.module';
import { CommunicationsModule } from './communications/communications.module';
import { ResourcesModule } from './resources/resources.module';
import { getDatabaseConfig } from './config/database.config';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    EventsModule,
    RedisModule,
    AgentModule,
    PolicyModule,
    RoutesModule,
    ConversationsModule,
    TokenModule,
    ActionsModule,
    CommunicationsModule,
    ResourcesModule,
  ],
})
export class AppModule {} 