import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';

// Bedrock Services
import { BedrockAgentService } from './bedrock/bedrock-agent.service';
import { ToolExecutorService } from './bedrock/tool-executor.service';

// HTTP Tools
import { ElixirNotificationTool } from './http-tools/elixir-notification.tool';
import { ExternalApiTool } from './http-tools/external-api.tool';
import { ResourcesQueryTool } from './http-tools/resources.tool';
import { PatientBookingQueryTool } from './http-tools/patient-booking.tool';

// WebSocket Tools
import { BroadcastTool } from './websocket-tools/broadcast.tool';
import { FrontendInteractionTool } from './websocket-tools/frontend-interaction.tool';

// Import ExternalApisModule pentru ExternalApiTool
import { ExternalApisModule } from '../external-apis/external-apis.module';

// Shared Services
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';

@Module({
  imports: [
    ExternalApisModule, // Pentru ExternalApiTool
  ],
  providers: [
    // Shared Services
    KinesisLoggerService,
    
    // Main Services
    ToolsService,
    BedrockAgentService,
    ToolExecutorService,
    
    // HTTP Tools
    ElixirNotificationTool,
    ExternalApiTool,
    ResourcesQueryTool,
    PatientBookingQueryTool,
    
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

