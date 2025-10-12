// Simple base resource interface for streaming operations
export interface BaseResource {
  id: string; // businessId-locationId-resourceId
  businessId: string;
  locationId: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, any>; // Generic JSON data
  timestamp: string;
  lastUpdated: string;
}

// Valid resource types - simplified list matching resources-server
export const VALID_RESOURCE_TYPES = [

  // Dental resource types
  'appointment',
  'patient',
  'medic',
  'treatment',
  'product',
  'role', // User roles and permissions
  'report', // Analytics and reporting
  'sale', // Sales data
  'dental-chart', // Dental chart
  'plan', // Dental plan
  'setting', // Settings
  'invoice-client',
  'invoice',
  'rating', // Appointment ratings

  // Statistics resource types
  'statistics', // General business statistics
  'recent-activities', // Recent activities for current day
] as const;

export type ResourceType = (typeof VALID_RESOURCE_TYPES)[number];

// Permission format: resourceType:action
export type ResourceAction = 'create' | 'update' | 'patch' | 'delete' | 'read';
export type Permission = `${ResourceType}:${ResourceAction}`;
