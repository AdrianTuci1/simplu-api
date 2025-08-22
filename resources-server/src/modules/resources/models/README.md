# Resource Models - Simplified Structure

## Overview
This directory contains the simplified resource models for the unified resource system. All resources now use a single `BaseResource` structure with flexible data fields, eliminating business-specific constraints.

## 📁 File Structure

```
models/
├── README.md                     # This documentation
├── index.ts                      # Main exports for all models
├── resource-types.ts             # Simplified resource type definitions
├── base-resource.ts              # Unified BaseResource interface
├── resource.entity.ts            # TypeORM entity for database
├── resource.entity.spec.ts       # Entity tests
└── SIMPLIFICATION_SUMMARY.md     # Detailed simplification documentation
```

## 🏗️ Core Components

### 1. BaseResource Interface (`base-resource.ts`)
The unified interface for all resources:
```typescript
export interface BaseResource {
  id: string;                    // businessId-locationId-resourceId
  businessId: string;
  locationId: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, any>;     // Generic JSON data - no validation constraints
  timestamp: string;
  lastUpdated: string;
  startDate?: string | null;     // Optional date range for timeline resources
  endDate?: string | null;
  shardId?: string;
}
```

### 2. Resource Types (`resource-types.ts`)
Simplified resource type definitions with 13 core types:
```typescript
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
```

### 3. Resource Entity (`resource.entity.ts`)
TypeORM entity for database operations with proper indexing and constraints.

## 🚀 Usage

### Import Models
```typescript
// Import the main BaseResource interface
import { BaseResource } from './models/base-resource';

// Import resource types
import { CoreResourceType, ResourceOperation } from './models/resource-types';

// Import the entity
import { ResourceEntity } from './models/resource.entity';
```

### Create a Resource
```typescript
const resource: BaseResource = {
  id: 'business-123-location-456-resource-789',
  businessId: 'business-123',
  locationId: 'location-456',
  resourceType: 'timeline',
  resourceId: 'resource-789',
  data: {
    title: 'Appointment',
    date: '2024-01-15',
    duration: 60,
    notes: 'Regular checkup'
  },
  timestamp: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  startDate: '2024-01-15',
  endDate: '2024-01-15'
};
```

## ✅ Key Benefits

1. **Simplified Structure**: Single interface for all resources
2. **Flexible Data**: Generic JSON data field with no constraints
3. **No Business Constraints**: All business types use the same structure
4. **Client-Side Validation**: Data validation handled by client applications
5. **Maintainable**: Fewer files and simpler type definitions

## 🔄 Migration from Legacy

The old business-specific models (dental, gym, hotel, common) have been removed. All resources now use the unified `BaseResource` structure with flexible data fields.

### Before (Legacy):
```typescript
// Business-specific types
import { DentalPatientData } from './models/dental';
import { GymMemberData } from './models/gym';
import { HotelGuestData } from './models/hotel';
```

### After (Simplified):
```typescript
// Unified structure
import { BaseResource } from './models/base-resource';

// All resources use the same structure
const patient: BaseResource = { /* ... */ };
const member: BaseResource = { /* ... */ };
const guest: BaseResource = { /* ... */ };
```

## 📋 Validation

- **Server-Side**: No data validation constraints
- **Client-Side**: Applications handle data validation
- **Type Safety**: TypeScript provides compile-time type checking
- **Database**: TypeORM handles database constraints

## 🔗 Related Files

- `SIMPLIFICATION_SUMMARY.md` - Detailed documentation of the simplification process
- `resource.entity.spec.ts` - Tests for the resource entity
- `index.ts` - Main exports for the models module
