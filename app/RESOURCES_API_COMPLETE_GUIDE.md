# Complete Resources API Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Headers](#authentication--headers)
3. [Endpoint Structure](#endpoint-structure)
4. [HTTP Methods & Operations](#http-methods--operations)
5. [Resource Types by Business](#resource-types-by-business)
6. [Detailed Operation Examples](#detailed-operation-examples)
7. [Business-Specific Data Models](#business-specific-data-models)
8. [Permission System](#permission-system)
9. [Response Formats](#response-formats)
10. [Error Handling](#error-handling)
11. [Rate Limiting & Caching](#rate-limiting--caching)

## Overview

The Resources API uses a **unified endpoint pattern** that handles all resource types through a single controller with business-specific data structures. This design allows for:

- Consistent API interface across all business types
- Type-safe resource management
- Dynamic role-based permissions
- Business-specific data validation
- Unified caching and rate limiting

### Supported Business Types
- **Dental** - Patient management, appointments, treatments
- **Gym** - Member management, classes, equipment
- **Hotel** - Guest management, reservations, rooms
- **Common** - Universal resources (stocks, invoices, reports)

## Authentication & Headers

### Required Headers for All Operations

```http
Authorization: Bearer <jwt_token>
X-Business-ID: <businessId>
X-Location-ID: <locationId>
X-Resource-Type: <resourceType>
Content-Type: application/json
```

### JWT Token Requirements
- Must be obtained through the 2-step authentication flow
- Contains user roles and business context
- Permissions validated dynamically against current roles

## Endpoint Structure

### Base URL Pattern
```
/api/resources/{businessId-locationId}
```

### URL Components
- `businessId`: Unique business identifier
- `locationId`: Specific location within the business
- Combined as: `B0100001-L0100001`

### Header Validation
- URL parameters must match header values
- Ensures request integrity and prevents tampering

## HTTP Methods & Operations

| Method | Operation | Description | Permission Required |
|--------|-----------|-------------|-------------------|
| `GET` | Read/List | Retrieve resources with filtering | `read`, `list` |
| `POST` | Create | Create new resource | `create` |
| `PUT` | Update | Full resource replacement | `update` |
| `PATCH` | Partial Update | Partial resource modification | `update` |
| `DELETE` | Delete | Remove resource | `delete` |

## Resource Types by Business

### 🦷 Dental Business Resources

#### Core Resources
- **`patients`** - Patient records and medical history
- **`appointments`** - Dental appointments and scheduling
- **`treatments`** - Treatment records and procedures
- **`staff`** - Dental professionals and support staff
- **`roles`** - Custom roles and permissions

#### Example Resource Types
```typescript
// Dental-specific resource types
type DentalResourceType = 
  | 'patients' 
  | 'appointments' 
  | 'treatments' 
  | 'staff' 
  | 'roles';
```

### 🏋️ Gym Business Resources

#### Core Resources
- **`members`** - Gym member profiles and status
- **`memberships`** - Membership plans and pricing
- **`classes`** - Group classes and schedules
- **`equipment`** - Equipment inventory and maintenance
- **`roles`** - Custom roles and permissions

#### Example Resource Types
```typescript
// Gym-specific resource types
type GymResourceType = 
  | 'members' 
  | 'memberships' 
  | 'classes' 
  | 'equipment' 
  | 'roles';
```

### 🏨 Hotel Business Resources

#### Core Resources
- **`guests`** - Guest profiles and preferences
- **`reservations`** - Room bookings and status
- **`rooms`** - Room inventory and availability
- **`services`** - Hotel services and amenities
- **`roles`** - Custom roles and permissions

#### Example Resource Types
```typescript
// Hotel-specific resource types
type HotelResourceType = 
  | 'guests' 
  | 'reservations' 
  | 'rooms' 
  | 'services' 
  | 'roles';
```

### 🛒 Common Resources (All Business Types)

#### Universal Resources
- **`stocks`** - Inventory management
- **`invoices`** - Financial records and billing
- **`activities`** - Activity logs and audit trails
- **`reports`** - Business analytics and reports

## Detailed Operation Examples

### GET - Retrieve Resources

#### Basic List Request
```http
GET /api/resources/dental-clinic-location1?resourceType=patients&page=1&limit=20

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: location1
X-Resource-Type: patients
```

#### With Filters
```http
GET /api/resources/dental-clinic-location1?resourceType=patients&search=john&status=active&lastVisitFrom=2024-01-01

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: location1
X-Resource-Type: patients
```

#### Response
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "patient-123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@email.com",
        "phone": "+1234567890",
        "dateOfBirth": "1990-05-15",
        "medicalHistory": "No known allergies",
        "lastVisit": "2024-01-15T10:00:00Z",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    },
    "filters": {
      "search": "john",
      "status": "active",
      "lastVisitFrom": "2024-01-01"
    }
  },
  "meta": {
    "businessId": "dental-clinic",
    "locationId": "location1",
    "resourceType": "patients",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### POST - Create Resource

#### Request
```http
POST /api/resources/dental-clinic-location1

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: location1
X-Resource-Type: patients

Body:
{
  "operation": "create",
  "data": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@email.com",
    "phone": "+1234567891",
    "dateOfBirth": "1985-08-22",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701"
    },
    "medicalHistory": "Hypertension",
    "allergies": ["Penicillin"],
    "emergencyContact": {
      "name": "John Smith",
      "phone": "+1234567892",
      "relationship": "spouse"
    }
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "patient-124",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@email.com",
    "phone": "+1234567891",
    "dateOfBirth": "1985-08-22",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701"
    },
    "medicalHistory": "Hypertension",
    "allergies": ["Penicillin"],
    "emergencyContact": {
      "name": "John Smith",
      "phone": "+1234567892",
      "relationship": "spouse"
    },
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "businessId": "dental-clinic",
    "locationId": "location1",
    "resourceType": "patients",
    "operation": "create"
  }
}
```

### PUT - Full Update

#### Request
```http
PUT /api/resources/gym-fitness-location2

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: gym-fitness
X-Location-ID: location2
X-Resource-Type: members

Body:
{
  "operation": "update",
  "data": {
    "id": "member-456",
    "firstName": "Mike",
    "lastName": "Johnson",
    "email": "mike.johnson@email.com",
    "phone": "+1234567893",
    "membershipType": "premium",
    "membershipStatus": "active",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "emergencyContact": {
      "name": "Sarah Johnson",
      "phone": "+1234567894",
      "relationship": "wife"
    },
    "medicalConditions": [],
    "fitnessGoals": ["weight_loss", "muscle_gain"]
  }
}
```

### PATCH - Partial Update

#### Request
```http
PATCH /api/resources/hotel-resort-location3

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: hotel-resort
X-Location-ID: location3
X-Resource-Type: guests

Body:
{
  "operation": "patch",
  "data": {
    "id": "guest-789",
    "email": "updated.email@example.com",
    "preferences": {
      "roomType": "suite",
      "floor": "high",
      "amenities": ["ocean_view", "balcony", "minibar"]
    }
  }
}
```

### DELETE - Remove Resource

#### Request
```http
DELETE /api/resources/dental-clinic-location1

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: location1
X-Resource-Type: patients
X-Resource-ID: patient-123
```

#### Response
```json
{
  "success": true,
  "data": {
    "message": "Patient deleted successfully",
    "deletedId": "patient-123"
  },
  "meta": {
    "businessId": "dental-clinic",
    "locationId": "location1",
    "resourceType": "patients",
    "operation": "delete"
  }
}
```

## Business-Specific Data Models

### Dental Business Models

#### Patient Data Structure
```typescript
interface DentalPatientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  status: 'active' | 'inactive' | 'archived';
}
```

#### Appointment Data Structure
```typescript
interface DentalAppointmentData {
  patientId: string;
  dentistId: string;
  treatmentId?: string;
  appointmentDate: string;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  reminderSent?: boolean;
  cost?: number;
  insuranceCovered?: boolean;
}
```

### Gym Business Models

#### Member Data Structure
```typescript
interface GymMemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  membershipType: 'basic' | 'premium' | 'vip';
  membershipStatus: 'active' | 'expired' | 'suspended' | 'cancelled';
  startDate: string;
  endDate?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalConditions?: string[];
  fitnessGoals?: string[];
  preferredTrainer?: string;
}
```

#### Class Data Structure
```typescript
interface GymClassData {
  name: string;
  description: string;
  instructorId: string;
  schedule: {
    dayOfWeek: number; // 0-6
    startTime: string; // HH:mm format
    duration: number; // minutes
  };
  capacity: number;
  currentEnrollment: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  cost?: number;
  active: boolean;
}
```

### Hotel Business Models

#### Guest Data Structure
```typescript
interface HotelGuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  nationality?: string;
  passportNumber?: string;
  loyaltyNumber?: string;
  loyaltyStatus?: 'bronze' | 'silver' | 'gold' | 'platinum';
  preferences?: {
    roomType?: string;
    floor?: string;
    amenities?: string[];
    specialRequests?: string[];
  };
  blacklisted?: boolean;
}
```

#### Reservation Data Structure
```typescript
interface HotelReservationData {
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  totalCost: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  specialRequests?: string[];
  notes?: string;
}
```

### Common Resource Models

#### Stock Item Data Structure
```typescript
interface StockItemData {
  name: string;
  description?: string;
  category: string;
  sku?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unit: string; // 'pieces', 'kg', 'liters', etc.
  cost: number;
  price: number;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  location?: string; // storage location
  active: boolean;
}
```

#### Invoice Data Structure
```typescript
interface InvoiceData {
  customerId: string;
  customerType: 'patient' | 'member' | 'guest' | 'client';
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'check';
  notes?: string;
}
```

## Permission System

### Role-Based Access Control

The system uses dynamic role-based permissions where roles are stored as resources and can be managed through the API.

#### Standard Role Hierarchy
```typescript
const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 90,
  manager: 80,
  dentist: 75,      // Dental-specific
  trainer: 75,      // Gym-specific
  staff: 70,
  receptionist: 60,
  viewer: 50
};
```

#### Permission Types
- **`create`** - Create new resources
- **`read`** - View individual resources
- **`update`** - Modify existing resources
- **`delete`** - Remove resources
- **`list`** - View resource listings

#### Business-Specific Permissions

##### Dental Permissions
```typescript
const DENTAL_PERMISSIONS = {
  dentist: {
    patients: ['create', 'read', 'update', 'list'],
    appointments: ['create', 'read', 'update', 'delete', 'list'],
    treatments: ['create', 'read', 'update', 'list'],
    staff: ['read', 'list'],
    roles: ['read']
  },
  receptionist: {
    patients: ['create', 'read', 'update', 'list'],
    appointments: ['create', 'read', 'update', 'list'],
    treatments: ['read', 'list'],
    staff: ['read', 'list'],
    roles: ['read']
  }
};
```

##### Gym Permissions
```typescript
const GYM_PERMISSIONS = {
  trainer: {
    members: ['read', 'update', 'list'],
    memberships: ['read', 'list'],
    classes: ['create', 'read', 'update', 'list'],
    equipment: ['read', 'update', 'list'],
    roles: ['read']
  },
  staff: {
    members: ['create', 'read', 'update', 'list'],
    memberships: ['read', 'list'],
    classes: ['read', 'list'],
    equipment: ['read', 'list'],
    roles: ['read']
  }
};
```

### Permission Validation Flow
1. Extract JWT token from Authorization header
2. Get user roles from token
3. Check role hierarchy for sufficient level
4. Validate specific permission for resource type
5. Apply business-specific rules
6. Grant or deny access

## Response Formats

### Success Response Structure
```typescript
interface StandardResponse {
  success: true;
  data: {
    // For GET operations
    items?: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    filters?: Record<string, any>;
    
    // For single resource operations
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
  meta: {
    businessId: string;
    locationId: string;
    resourceType: string;
    operation?: string;
    timestamp: string;
  };
}
```

### Error Response Structure
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      message: string;
    }[];
  };
  meta: {
    businessId?: string;
    locationId?: string;
    resourceType?: string;
    timestamp: string;
  };
}
```

## Error Handling

### Error Codes

#### Authentication Errors
- **`UNAUTHORIZED`** - Missing or invalid JWT token
- **`FORBIDDEN`** - Insufficient permissions
- **`TOKEN_EXPIRED`** - JWT token has expired
- **`INVALID_BUSINESS_CONTEXT`** - Business/location context invalid

#### Validation Errors
- **`VALIDATION_ERROR`** - Request data validation failed
- **`REQUIRED_FIELD`** - Required field missing
- **`INVALID_FORMAT`** - Data format invalid
- **`DUPLICATE_RESOURCE`** - Resource already exists

#### Resource Errors
- **`RESOURCE_NOT_FOUND`** - Requested resource doesn't exist
- **`RESOURCE_IN_USE`** - Cannot delete resource in use
- **`BUSINESS_TYPE_MISMATCH`** - Resource type not valid for business
- **`LOCATION_NOT_FOUND`** - Location doesn't exist

#### Server Errors
- **`INTERNAL_ERROR`** - Internal server error
- **`SERVICE_UNAVAILABLE`** - External service unavailable
- **`DATABASE_ERROR`** - Database operation failed

### Error Response Examples

#### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "phone",
        "message": "Phone number is required"
      }
    ]
  },
  "meta": {
    "businessId": "dental-clinic",
    "locationId": "location1",
    "resourceType": "patients",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

#### Permission Error
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to delete patients",
    "details": [
      {
        "field": "permission",
        "message": "User role 'receptionist' does not have 'delete' permission for 'patients'"
      }
    ]
  },
  "meta": {
    "businessId": "dental-clinic",
    "locationId": "location1",
    "resourceType": "patients",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

## Rate Limiting & Caching

### Rate Limits
- **GET requests**: 1000 per minute per user
- **POST/PUT/PATCH requests**: 100 per minute per user
- **DELETE requests**: 50 per minute per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567
```

### Caching Strategy
- **Resource lists**: 5 minutes TTL
- **Individual resources**: 15 minutes TTL
- **Business info**: 1 hour TTL
- **Role permissions**: 5 minutes TTL with invalidation on updates

### Cache Headers
```http
Cache-Control: public, max-age=300
ETag: "abc123def456"
Last-Modified: Wed, 15 Jan 2024 10:00:00 GMT
```

## Complete Example: Dental Clinic Workflow

### 1. Authenticate and Get Business Context
```http
POST /api/auth/step1
POST /api/auth/step2
```

### 2. List Patients
```http
GET /api/resources/dental-clinic-main?resourceType=patients&page=1&limit=10

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: main
X-Resource-Type: patients
```

### 3. Create New Patient
```http
POST /api/resources/dental-clinic-main

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: main
X-Resource-Type: patients

Body:
{
  "operation": "create",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-05-15",
    "medicalHistory": "No known allergies"
  }
}
```

### 4. Schedule Appointment
```http
POST /api/resources/dental-clinic-main

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: main
X-Resource-Type: appointments

Body:
{
  "operation": "create",
  "data": {
    "patientId": "patient-123",
    "dentistId": "dentist-456",
    "appointmentDate": "2024-01-20T10:00:00Z",
    "duration": 60,
    "status": "scheduled",
    "notes": "Regular checkup"
  }
}
```

### 5. Update Appointment Status
```http
PATCH /api/resources/dental-clinic-main

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Business-ID: dental-clinic
X-Location-ID: main
X-Resource-Type: appointments

Body:
{
  "operation": "patch",
  "data": {
    "id": "appointment-789",
    "status": "completed",
    "notes": "Completed - next visit in 6 months"
  }
}
```

This comprehensive guide provides everything needed to understand and use the Resources API effectively across all business types and operations. 