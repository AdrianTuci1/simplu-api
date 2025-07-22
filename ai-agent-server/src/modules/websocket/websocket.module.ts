import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebSocketGateway } from './websocket.gateway';
import { ElixirHttpService } from './elixir-http.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule, HttpModule],
  providers: [WebSocketGateway, ElixirHttpService],
  exports: [WebSocketGateway, ElixirHttpService],
})
export class WebSocketModule {} 