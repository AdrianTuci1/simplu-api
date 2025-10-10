import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BedrockAgentService } from './bedrock/bedrock-agent.service';
import { ToolExecutorService } from './bedrock/tool-executor.service';
import { ToolContext, BedrockInvocationResult } from './interfaces';

// HTTP Tools
import { AppServerTool } from './http-tools/app-server.tool';
import { ElixirNotificationTool } from './http-tools/elixir-notification.tool';
import { ExternalApiTool } from './http-tools/external-api.tool';
import { ManagementServerTool } from './http-tools/management-server.tool';

// WebSocket Tools
import { BroadcastTool } from './websocket-tools/broadcast.tool';
import { FrontendInteractionTool } from './websocket-tools/frontend-interaction.tool';

/**
 * Tools Service - orchestrează toate tools-urile și integrarea cu Bedrock
 */
@Injectable()
export class ToolsService implements OnModuleInit {
  private readonly logger = new Logger(ToolsService.name);

  constructor(
    private readonly bedrockAgentService: BedrockAgentService,
    private readonly toolExecutorService: ToolExecutorService,
    // HTTP Tools
    private readonly appServerTool: AppServerTool,
    private readonly elixirNotificationTool: ElixirNotificationTool,
    private readonly externalApiTool: ExternalApiTool,
    private readonly managementServerTool: ManagementServerTool,
    // WebSocket Tools
    private readonly broadcastTool: BroadcastTool,
    private readonly frontendInteractionTool: FrontendInteractionTool,
  ) {}

  /**
   * Înregistrează toate tools-urile la inițializare
   */
  onModuleInit() {
    this.logger.log('🔧 Registering tools...');

    // Register HTTP Tools
    this.toolExecutorService.registerTool(this.appServerTool);
    this.toolExecutorService.registerTool(this.elixirNotificationTool);
    this.toolExecutorService.registerTool(this.externalApiTool);
    this.toolExecutorService.registerTool(this.managementServerTool);

    // Register WebSocket Tools
    this.toolExecutorService.registerTool(this.broadcastTool);
    this.toolExecutorService.registerTool(this.frontendInteractionTool);

    const registeredTools = this.toolExecutorService.getRegisteredTools();
    this.logger.log(`✅ Registered ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
  }

  /**
   * Procesează un mesaj prin Bedrock Agent
   */
  async processMessage(
    message: string,
    context: ToolContext,
    sessionId?: string,
  ): Promise<BedrockInvocationResult> {
    return this.bedrockAgentService.invokeAgent(message, context, sessionId);
  }

  /**
   * Execută un tool specific (apelat de Bedrock sau manual)
   */
  async executeTool(toolName: string, parameters: Record<string, any>, context: ToolContext) {
    return this.toolExecutorService.executeTool({
      toolName,
      parameters,
      context,
    });
  }

  /**
   * Obține lista tools-urilor înregistrate
   */
  getRegisteredTools(): string[] {
    return this.toolExecutorService.getRegisteredTools();
  }

  /**
   * Obține definițiile tuturor tools-urilor (pentru configurare Bedrock)
   */
  getToolDefinitions() {
    return this.toolExecutorService.getToolDefinitions();
  }

  /**
   * Setează WebSocket Gateway pentru tools-urile care au nevoie
   */
  setWebSocketGateway(gateway: any) {
    this.broadcastTool.setWebSocketGateway(gateway);
    this.frontendInteractionTool.setWebSocketGateway(gateway);
    this.logger.log('✅ WebSocket Gateway set for WebSocket tools');
  }

  /**
   * Retrieve direct din Knowledge Base
   */
  async retrieveFromKnowledgeBase(query: string, numberOfResults: number = 5) {
    return this.bedrockAgentService.retrieveFromKnowledgeBase(query, numberOfResults);
  }

  /**
   * Get Bedrock configuration
   */
  getBedrockConfig() {
    return this.bedrockAgentService.getConfig();
  }
}

