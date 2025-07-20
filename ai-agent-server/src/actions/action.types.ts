export enum ActionCategory {
  COMMUNICATION = 'communication',
  RESOURCE_MANAGEMENT = 'resource_management',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL_API = 'internal_api',
  COORDINATION = 'coordination',
}

export enum ActionType {
  // Communication actions
  SEND_EMAIL = 'send_email',
  READ_EMAIL = 'read_email',
  SEND_SMS = 'send_sms',
  SEND_WHATSAPP = 'send_whatsapp',
  READ_WHATSAPP = 'read_whatsapp',
  MAKE_PHONE_CALL = 'make_phone_call',
  RECEIVE_PHONE_CALL = 'receive_phone_call',

  // Resource management actions
  CREATE_RESOURCE = 'create_resource',
  READ_RESOURCE = 'read_resource',
  UPDATE_RESOURCE = 'update_resource',
  DELETE_RESOURCE = 'delete_resource',
  LIST_RESOURCES = 'list_resources',

  // External service actions
  BOOK_APPOINTMENT = 'book_appointment',
  CANCEL_APPOINTMENT = 'cancel_appointment',
  PROCESS_PAYMENT = 'process_payment',
  GENERATE_REPORT = 'generate_report',

  // Internal API actions
  ANALYZE_DATA = 'analyze_data',
  GENERATE_SUGGESTIONS = 'generate_suggestions',
  VALIDATE_INPUT = 'validate_input',

  // Coordination actions
  REQUEST_HUMAN_APPROVAL = 'request_human_approval',
  ESCALATE_ISSUE = 'escalate_issue',
  NOTIFY_COORDINATOR = 'notify_coordinator',
}

export enum DecisionLevel {
  AUTOMATIC = 'automatic',
  SUGGESTION = 'suggestion',
  CONSULTATION = 'consultation',
  APPROVAL_REQUIRED = 'approval_required',
}

export interface ActionContext {
  tenantId: string;
  userId: string;
  locationId?: string;
  sessionId?: string;
  userPermissions?: string[];
  businessContext?: any;
  conversationHistory?: any[];
}

export interface ActionDefinition {
  type: ActionType;
  category: ActionCategory;
  name: string;
  description: string;
  requiredPermissions: string[];
  tokenCost: number;
  defaultDecisionLevel: DecisionLevel;
  parameters: ActionParameter[];
  isAsync?: boolean;
  requiresApproval?: boolean;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface ActionRequest {
  type: ActionType;
  context: ActionContext;
  parameters: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
}

export interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokenUsed?: number;
  requiresApproval?: boolean;
  approvalRequestId?: string;
}

export interface ActionExecutionResult {
  actionType: ActionType;
  success: boolean;
  result: any;
  tokensUsed: number;
  executionTime: number;
  error?: string;
} 