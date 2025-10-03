// UserCapabilities interface removed - not used in current implementation

export interface AgentState {
  // Core Input
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId: string;
  source: 'websocket' | 'webhook' | 'cron';
  clientSource?: 'meta' | 'twilio' | 'email' | 'web' | 'unknown';
  role: 'operator' | 'customer';
  businessType: 'dental' | 'gym' | 'hotel';
  // Context
  businessInfo: BusinessInfo | null;
  sessionMessages?: Array<{
    content: string;
    type: 'user' | 'agent' | 'system';
    timestamp: string;
  }>;
  timeContext?: {
    currentTimestamp: string;
    currentDate: string;
    currentTime: string;
    timezone: string;
    dayOfWeek: string;
    isWeekend: boolean;
    isBusinessHours: boolean;
  };

  // Operator-specific properties
  needsFrontendInteraction?: boolean;
  frontendQueries?: any[];
  frontendQueryResults?: any[];
  waitingForFrontendResults?: boolean;
  drafts?: any[];
  draft?: any; // Single draft for response
  needsDraftCreation?: boolean;

  // Customer-specific properties
  needsAppServerData?: boolean;
  appServerData?: any;
  needsDatabaseQuery?: boolean;
  databaseQueryResults?: any[];
  needsBookingGuidance?: boolean;
  bookingGuidance?: any;
  // Platform-specific user IDs for customer recognition
  metaUserId?: string;
  twilioUserId?: string;
  emailUserId?: string;

  // Output
  response: string;
  actions: AgentAction[];
}

export interface Intent {
  action: 'rezervare' | 'servicii' | 'clienti' | 'membrii' | 'stock-uri' | 'analiza_date' | 'sms' | 'email' | 'whatsapp';
  category: 'booking' | 'customer_service' | 'inventory' | 'analysis' | 'communication';
  confidence: number;
  canHandleAutonomously: boolean;
  requiresHumanApproval: boolean;
}

export interface WebhookData {
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  source: 'meta' | 'twilio' | 'email';
  externalId?: string;
  sessionId?: string;
}

export interface AutonomousActionResult {
  success: boolean;
  workflowResults: WorkflowStepResult[];
  notification: string;
  shouldRespond: boolean;
  response?: string;
}

export interface WorkflowStepResult {
  step: number;
  action: string;
  success: boolean;
  data: any;
  timestamp: string;
}

export interface WorkflowContext {
  webhookData: WebhookData;
  businessInfo: BusinessInfo;
  locationInfo: LocationInfo;
  intent: Intent;
}

export interface BusinessInfo {
  businessId: string;
  businessName: string;
  businessType: 'dental' | 'gym' | 'hotel';
  locations: LocationInfo[];
  settings: any;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

// RagResult, ResourceOperation, ExternalApiResult interfaces removed - not used in current implementation

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
} 