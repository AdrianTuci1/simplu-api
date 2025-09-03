import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { ElixirHttpService } from '../websocket/elixir-http.service';
import { AgentModule } from '../agent/agent.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [HttpModule, forwardRef(() => AgentModule), forwardRef(() => WebSocketModule)],
  controllers: [MessagesController],
  providers: [ElixirHttpService],
  exports: [ElixirHttpService],
})
export class MessagesModule {}