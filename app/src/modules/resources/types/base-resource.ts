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
  'visits',      // Customer visits and check-ins
  'staff',       // Employees, team members
  'invoices',    // Billing and payments
  'stocks',      // Inventory management
  'activities',  // Business activities and logs
  'workflows',   // Business processes
  'permissions', // Access control
  'userData',    // User-specific data
  'history',      // Alias for activities (frontend compatibility)
  'pickups',     // Automated pickup operations

  'appointment',
  'patient',
  'medic',
  'treatment',
  'product',
  'roles',       // User roles and permissions
  'reports',     // Analytics and reporting
  'sales',       // Sales data


  // Statistics resource types
  'statistics',      // General business statistics
  'recent-activities', // Recent activities for current day
] as const;

export type ResourceType = typeof VALID_RESOURCE_TYPES[number];

// Permission format: resourceType:action
export type ResourceAction = 'create' | 'update' | 'patch' | 'delete' | 'read';
export type Permission = `${ResourceType}:${ResourceAction}`;