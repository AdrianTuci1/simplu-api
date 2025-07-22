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
}

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
} 