export interface Session {
  sessionId: string;           // Partition Key
  businessId: string;          // Sort Key
  locationId: string;
  userId: string;
  status: 'active' | 'closed' | 'resolved' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata: {
    businessType: string;
    context: any;
  };
}

export interface Message {
  messageId: string;           // Partition Key
  sessionId: string;           // Sort Key
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: string;
  metadata: {
    source: 'websocket' | 'webhook' | 'cron';
    externalId?: string;
    responseId?: string;
    businessType?: string;
    actions?: any[];
    clientSource?: string;
  };
} 