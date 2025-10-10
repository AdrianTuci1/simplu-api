/**
 * Agent Module Interfaces
 * 
 * Interfețe folosite de Agent Service pentru orchestrarea Bedrock Agent
 */

/**
 * Webhook Data - date primite de la webhooks externe (Meta, Twilio, Email)
 */
export interface WebhookData {
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  source: 'meta' | 'twilio' | 'email';
  externalId?: string;
  sessionId?: string;
}

/**
 * Autonomous Action Result - rezultatul procesării autonome pentru clienți
 */
export interface AutonomousActionResult {
  success: boolean;
  workflowResults: WorkflowStepResult[];
  notification: string;
  shouldRespond: boolean;
  response?: string;
}

/**
 * Workflow Step Result - rezultatul unui pas din workflow
 */
export interface WorkflowStepResult {
  step: number;
  action: string;
  success: boolean;
  data: any;
  timestamp: string;
}

/**
 * Business Info - informații despre business
 */
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

/**
 * Location Info - informații despre o locație
 */
export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

/**
 * Agent Action - acțiune sugerată de agent
 * Note: Folosit în AgentResponse din message.interface.ts
 */
export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
}
