import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebSocketGateway } from './websocket.gateway';
import { ElixirHttpService } from './elixir-http.service';
import { SessionModule } from '../session/session.module';
import { AgentModule } from '../agent/agent.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [SessionModule, HttpModule, AgentModule, ToolsModule],
  providers: [WebSocketGateway, ElixirHttpService],
  exports: [WebSocketGateway, ElixirHttpService],
})
export class WebSocketModule {} 