/**
 * Tool Interface - definește structura unui tool pentru AWS Bedrock
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    json: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolInput {
  toolName: string;
  parameters: Record<string, any>;
  context: ToolContext;
}

export interface ToolContext {
  businessId: string;
  locationId: string;
  userId: string;
  sessionId: string;
  role: 'operator' | 'customer';
  businessType?: 'dental' | 'gym' | 'hotel';
  source: 'websocket' | 'webhook' | 'cron';
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    toolName?: string;
    timestamp?: string;
  };
}

export interface ToolExecutor {
  execute(input: ToolInput): Promise<ToolResult>;
  getDefinition(): ToolDefinition;
}

