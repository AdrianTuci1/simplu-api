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
}

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
} 