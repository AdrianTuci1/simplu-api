// Business Types
export const BUSINESS_TYPES = {
  DENTAL: 'dental',
  GYM: 'gym',
  HOTEL: 'hotel',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  DOCUMENT: 'document',
} as const;

// Session Status
export const SESSION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
} as const;

// Agent Actions
export const AGENT_ACTIONS = {
  CREATE_APPOINTMENT: 'create_appointment',
  UPDATE_APPOINTMENT: 'update_appointment',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  SEND_MESSAGE: 'send_message',
  GET_BUSINESS_INFO: 'get_business_info',
  UPDATE_RESOURCE: 'update_resource',
} as const;

// External API Providers
export const EXTERNAL_APIS = {
  TWILIO: 'twilio',
  META: 'meta',
  EMAIL: 'email',
} as const;

// Error Codes
export const ERROR_CODES = {
  INVALID_SESSION: 'INVALID_SESSION',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  INVALID_ACTION: 'INVALID_ACTION',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  AI_MODEL_ERROR: 'AI_MODEL_ERROR',
} as const; 