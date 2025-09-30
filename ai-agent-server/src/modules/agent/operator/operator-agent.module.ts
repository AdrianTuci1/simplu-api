import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OperatorAgentService } from './operator-agent.service';
import { BusinessInfoModule } from '../../business-info/business-info.module';
import { RagModule } from '../../rag/rag.module';
import { SessionModule } from '../../session/session.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { ElixirHttpService } from '../../websocket/elixir-http.service';

@Module({
  imports: [
    HttpModule,
    BusinessInfoModule,
    RagModule,
    SessionModule,
    forwardRef(() => WebSocketModule),
  ],
  providers: [
    OperatorAgentService,
    ElixirHttpService,
  ],
  exports: [OperatorAgentService],
})
export class OperatorAgentModule {}
