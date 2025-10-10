import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';

// Bedrock Services
import { BedrockAgentService } from './bedrock/bedrock-agent.service';
import { ToolExecutorService } from './bedrock/tool-executor.service';

// HTTP Tools
import { AppServerTool } from './http-tools/app-server.tool';
import { ElixirNotificationTool } from './http-tools/elixir-notification.tool';
import { ExternalApiTool } from './http-tools/external-api.tool';
import { ManagementServerTool } from './http-tools/management-server.tool';

// WebSocket Tools
import { BroadcastTool } from './websocket-tools/broadcast.tool';
import { FrontendInteractionTool } from './websocket-tools/frontend-interaction.tool';

// Import ExternalApisModule pentru ExternalApiTool
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    ExternalApisModule, // Pentru ExternalApiTool
  ],
  providers: [
    // Main Services
    ToolsService,
    BedrockAgentService,
    ToolExecutorService,
    
    // HTTP Tools
    AppServerTool,
    ElixirNotificationTool,
    ExternalApiTool,
    ManagementServerTool,
    
    // WebSocket Tools
    BroadcastTool,
    FrontendInteractionTool,
  ],
  exports: [
    ToolsService,
    BedrockAgentService,
    ToolExecutorService,
  ],
})
export class ToolsModule {}

