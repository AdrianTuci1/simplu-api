/**
 * Tool Result Interfaces - definește rezultatele returnate de tools
 */

export interface HttpToolResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
}

export interface WebSocketToolResult {
  success: boolean;
  messagesSent?: number;
  recipients?: string[];
  error?: string;
}

export interface ExternalApiToolResult {
  success: boolean;
  messageId?: string;
  provider?: 'meta' | 'twilio' | 'gmail' | 'sns';
  error?: string;
  data?: any;
}

export interface DatabaseToolResult {
  success: boolean;
  recordsAffected?: number;
  data?: any;
  error?: string;
}

export interface BedrockInvocationResult {
  success: boolean;
  output: {
    message: string;
    actions?: any[];
  };
  toolsUsed?: string[];
  error?: string;
  sessionState?: any;
  trace?: any;
}

