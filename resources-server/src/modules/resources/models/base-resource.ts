// Base resource interface for all resources in resources-server
// Simplified structure without business-specific constraints

export interface BaseResource {
  id: string; // businessId-locationId-resourceId
  businessId: string;
  locationId: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, any>; // Generic JSON data - no validation constraints
  timestamp: string;
  lastUpdated: string;
  startDate?: string | null; // Optional date range for timeline resources
  endDate?: string | null;
  shardId?: string;
}

// Valid resource types - simplified list
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
  'history'      // Alias for activities (frontend compatibility)
] as const;

export type ResourceType = typeof VALID_RESOURCE_TYPES[number];

// Permission format: resourceType:action
export type ResourceAction = 'create' | 'update' | 'patch' | 'delete' | 'read';
export type Permission = `${ResourceType}:${ResourceAction}`;

// Resource status types
export type ResourceStatus = 'active' | 'inactive' | 'archived' | 'deleted';
