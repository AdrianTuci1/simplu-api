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

// Valid resource types across all business types
export const VALID_RESOURCE_TYPES = [
  // Common resources
  'clients',
  'staff', 
  'timeline',
  'invoices',
  'stocks',
  'activities',
  'reports',
  'roles',
  'sales',
  
  // Dental specific
  'appointments',
  'treatments',
  'patients',
  
  // Gym specific  
  'members',
  'packages',
  'classes',
  'equipment',
  
  // Hotel specific
  'rooms',
  'services', 
  'reservations',
  'guests'
] as const;

export type ResourceType = typeof VALID_RESOURCE_TYPES[number];

// Permission format: resourceType:action
export type ResourceAction = 'create' | 'update' | 'patch' | 'delete' | 'read';
export type Permission = `${ResourceType}:${ResourceAction}`;