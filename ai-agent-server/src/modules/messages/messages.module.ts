import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { ElixirHttpService } from '../websocket/elixir-http.service';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [HttpModule, AgentModule],
  controllers: [MessagesController],
  providers: [ElixirHttpService],
  exports: [ElixirHttpService],
})
export class MessagesModule {}