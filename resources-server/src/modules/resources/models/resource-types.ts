// Resource type definitions for all business types
export type BusinessType = 'dental' | 'gym' | 'hotel';

// Common resource types (available for all business types)
export type CommonResourceType = 
  | 'stocks' 
  | 'invoices' 
  | 'activities' 
  | 'reports'
  | 'roles'
  | 'sales'
  | 'workflows'
  | 'permissions'
  | 'userData'
  | 'history'; // Alias for activities (frontend compatibility)

// Dental-specific resource types
export type DentalResourceType = 
  | 'timeline'
  | 'clients' 
  | 'services'
  | 'staff'
  | CommonResourceType;

// Gym-specific resource types
export type GymResourceType = 
  | 'timeline'
  | 'members' 
  | 'packages'
  | 'classes'
  | 'equipment'
  | 'staff'
  | CommonResourceType;

// Hotel-specific resource types
export type HotelResourceType = 
  | 'timeline'
  | 'clients' 
  | 'rooms'
  | 'services'
  | 'staff'
  | CommonResourceType;

// Union of all resource types
export type ResourceType = 
  | DentalResourceType 
  | GymResourceType 
  | HotelResourceType;

// Business type to resource type mapping
export type BusinessResourceMap = {
  dental: DentalResourceType;
  gym: GymResourceType;
  hotel: HotelResourceType;
};

// Helper type to get valid resource types for a business
export type GetResourceTypes<T extends BusinessType> = BusinessResourceMap[T];

// Resource operation types
export type ResourceOperation = 'create' | 'read' | 'update' | 'patch' | 'delete' | 'list';

// Permission types
export type Permission = 'create' | 'read' | 'update' | 'delete' | 'list';

// Resource status types
export type ResourceStatus = 'active' | 'inactive' | 'archived' | 'deleted';