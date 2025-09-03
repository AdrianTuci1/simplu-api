import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebSocketGateway } from './websocket.gateway';
import { ElixirHttpService } from './elixir-http.service';
import { SessionModule } from '../session/session.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [SessionModule, HttpModule, forwardRef(() => AgentModule)],
  providers: [WebSocketGateway, ElixirHttpService],
  exports: [WebSocketGateway, ElixirHttpService],
})
export class WebSocketModule {} 