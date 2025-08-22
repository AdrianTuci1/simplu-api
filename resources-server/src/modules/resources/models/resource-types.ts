// Simplified resource type definitions - no business-specific classifications
// All resources use the same BaseResource structure with flexible data field

// Core resource types for all businesses
export type CoreResourceType = 
  | 'timeline'    // Reservations, appointments, events
  | 'clients'     // Customers, members, patients
  | 'staff'       // Employees, team members
  | 'invoices'    // Billing and payments
  | 'stocks'      // Inventory management
  | 'activities'  // Business activities and logs
  | 'reports'     // Analytics and reporting
  | 'roles'       // User roles and permissions
  | 'sales'       // Sales data
  | 'workflows'   // Business processes
  | 'permissions' // Access control
  | 'userData'    // User-specific data
  | 'history';    // Alias for activities (frontend compatibility)

// Union of all valid resource types
export type ResourceType = CoreResourceType;

// Resource operation types
export type ResourceOperation = 'create' | 'read' | 'update' | 'patch' | 'delete' | 'list';