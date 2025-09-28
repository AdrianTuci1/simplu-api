import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebSocketGateway } from './websocket.gateway';
import { ElixirHttpService } from './elixir-http.service';
import { SessionModule } from '../session/session.module';
import { AgentWebSocketHandler } from '../agent/operator/handlers/agent-websocket.handler';
import { AgentQueryModifier } from '../agent/operator/handlers/agent-query-modifier';

@Module({
  imports: [SessionModule, HttpModule],
  providers: [WebSocketGateway, ElixirHttpService, AgentWebSocketHandler, AgentQueryModifier],
  exports: [WebSocketGateway, ElixirHttpService, AgentWebSocketHandler, AgentQueryModifier],
})
export class WebSocketModule {} 