import { Injectable, Logger } from '@nestjs/common';
import { ToolInput, ToolResult, ToolExecutor } from '../interfaces';

/**
 * Tool Executor Service - execută tools-urile cerute de Bedrock Agent
 * 
 * Acest service păstrează un registry de tools și le execută când
 * Bedrock Agent le solicită prin action groups.
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);
  private toolRegistry = new Map<string, ToolExecutor>();

  /**
   * Înregistrează un tool în registry
   */
  registerTool(tool: ToolExecutor): void {
    const definition = tool.getDefinition();
    this.toolRegistry.set(definition.name, tool);
    this.logger.log(`🔧 Registered tool: ${definition.name}`);
  }

  /**
   * Execută un tool
   */
  async executeTool(input: ToolInput): Promise<ToolResult> {
    const startTime = Date.now();
    const { toolName, parameters, context } = input;

    try {
      this.logger.log(`⚙️ Executing tool: ${toolName}`);
      this.logger.debug(`Parameters: ${JSON.stringify(parameters)}`);

      const tool = this.toolRegistry.get(toolName);

      if (!tool) {
        this.logger.error(`❌ Tool not found: ${toolName}`);
        return {
          success: false,
          error: `Tool ${toolName} not found in registry`,
          metadata: {
            toolName,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - startTime,
          },
        };
      }

      const result = await tool.execute(input);
      const executionTime = Date.now() - startTime;

      this.logger.log(`✅ Tool ${toolName} executed successfully in ${executionTime}ms`);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          toolName,
          timestamp: new Date().toISOString(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Tool ${toolName} execution failed after ${executionTime}ms:`, error);

      return {
        success: false,
        error: error.message,
        metadata: {
          toolName,
          timestamp: new Date().toISOString(),
          executionTime,
        },
      };
    }
  }

  /**
   * Obține lista tuturor tools-urilor înregistrate
   */
  getRegisteredTools(): string[] {
    return Array.from(this.toolRegistry.keys());
  }

  /**
   * Obține definițiile tuturor tools-urilor pentru Bedrock
   */
  getToolDefinitions(): any[] {
    return Array.from(this.toolRegistry.values()).map(tool => tool.getDefinition());
  }

  /**
   * Verifică dacă un tool este înregistrat
   */
  hasTool(toolName: string): boolean {
    return this.toolRegistry.has(toolName);
  }
}

