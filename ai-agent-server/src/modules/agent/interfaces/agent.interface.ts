export interface AgentState {
  // Input
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId: string;
  source: 'websocket' | 'webhook' | 'cron';
  role?: 'operator' | 'client_nou' | 'client_existent' | 'webhook';

  // Context
  businessInfo: BusinessInfo | null;
  ragResults: RagResult[];
  resourceOperations: ResourceOperation[];
  externalApiResults: ExternalApiResult[];
  // Dynamic memory snapshots
  dynamicUserMemory?: Record<string, any> | null;
  dynamicBusinessMemory?: Record<string, any> | null;
  // Discovery results
  discoveredResourceTypes?: string[];
  discoveredSchemas?: Record<string, any>;

  // Logică
  needsResourceSearch: boolean;
  needsExternalApi: boolean;
  needsHumanApproval: boolean;
  needsIntrospection?: boolean;
  needsRagUpdate?: boolean;

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

export interface RagResult {
  instruction: string;
  workflow: any[];
  successCriteria: string[];
  notificationTemplate: string;
}

export interface ResourceOperation {
  operation: any;
  result: any;
}

export interface ExternalApiResult {
  type: string;
  success: boolean;
  data: any;
}

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
} 