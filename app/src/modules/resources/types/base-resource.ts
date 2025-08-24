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
  'timeline',    // Reservations, appointments, events
  'clients',     // Customers, members, patients
  'staff',       // Employees, team members
  'invoices',    // Billing and payments
  'stocks',      // Inventory management
  'activities',  // Business activities and logs
  'reports',     // Analytics and reporting
  'roles',       // User roles and permissions
  'sales',       // Sales data
  'workflows',   // Business processes
  'permissions', // Access control
  'userData',    // User-specific data
  'history',      // Alias for activities (frontend compatibility)

  'appointment',
  'patient',
  'medic',
  'treatment',
] as const;

export type ResourceType = typeof VALID_RESOURCE_TYPES[number];

// Permission format: resourceType:action
export type ResourceAction = 'create' | 'update' | 'patch' | 'delete' | 'read';
export type Permission = `${ResourceType}:${ResourceAction}`;