import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MessagesController } from './messages.controller';
import { ElixirHttpService } from '../websocket/elixir-http.service';

@Module({
  imports: [HttpModule],
  controllers: [MessagesController],
  providers: [ElixirHttpService],
  exports: [ElixirHttpService],
})
export class MessagesModule {}