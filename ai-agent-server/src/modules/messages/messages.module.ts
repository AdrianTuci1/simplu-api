import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ElixirHttpService } from '../websocket/elixir-http.service';
import { AgentModule } from '../agent/agent.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    HttpModule, 
    SessionModule,
    forwardRef(() => AgentModule), 
    forwardRef(() => WebSocketModule)
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ElixirHttpService],
  exports: [MessagesService, ElixirHttpService],
})
export class MessagesModule {}