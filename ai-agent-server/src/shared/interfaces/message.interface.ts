export interface MessageDto {
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId?: string;
  timestamp?: string;
}

export interface AgentResponse {
  responseId: string;
  message: string;
  actions: AgentAction[];
  timestamp: string;
  sessionId: string;
  draft?: any; // Optional draft field for resource creation assistance
  ragContext?: { // Optional RAG context for debugging and tracking
    type: 'general' | 'resource';
    key: string;
    data: any;
  };
  metadata?: { // Optional metadata for Bedrock integration
    toolsUsed?: string[];
    executionTime?: number;
    [key: string]: any;
  };
}

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
} 