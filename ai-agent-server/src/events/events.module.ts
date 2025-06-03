import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AgentModule } from '../agent/agent.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AgentModule),
    ConversationsModule
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {} 