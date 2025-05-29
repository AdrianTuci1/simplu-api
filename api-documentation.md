# API Documentation

## Authentication
All endpoints (except login and register) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## HTTP Endpoints

### 1. Authentication (`/auth`)
- **POST /auth/login**
  - Body: `{ email: string, password: string }`
  - Returns: JWT token and user information
  - Status: 200 (success) or 401 (unauthorized)

- **POST /auth/register**
  - Body: `{ email: string, password: string, firstName?: string, lastName?: string }`
  - Returns: JWT token and user information
  - Status: 201 (created) or 400 (bad request)

### 2. Clients (`/clients`)
Requires: JWT Auth + Tenant Guard
- **POST /clients**
  - Create new client
  - Body: CreateClientDto
  - Tenant context required

- **GET /clients**
  - List all clients for tenant
  - Tenant context required

- **GET /clients/:id**
  - Get specific client
  - Tenant context required

- **PATCH /clients/:id**
  - Update client
  - Body: UpdateClientDto
  - Tenant context required

- **DELETE /clients/:id**
  - Delete client
  - Tenant context required

### 3. Employees (`/employees`)
Requires: JWT Auth + Tenant Guard
- **POST /employees**
  - Create new employee
  - Body: CreateEmployeeDto
  - Tenant context required

- **GET /employees**
  - List all employees for tenant
  - Tenant context required

- **GET /employees/me**
  - Get current employee profile
  - Tenant context required

- **GET /employees/:id**
  - Get specific employee
  - Tenant context required

- **PATCH /employees/:id**
  - Update employee
  - Body: UpdateEmployeeDto
  - Tenant context required

- **DELETE /employees/:id**
  - Delete employee
  - Tenant context required

### 4. Reservations (`/reservations`)
Requires: JWT Auth + Tenant Guard
- **POST /reservations**
  - Create new reservation
  - Body: CreateReservationDto
  - Tenant context required

- **GET /reservations**
  - List all reservations
  - Tenant context required

- **GET /reservations/:id**
  - Get specific reservation
  - Tenant context required

- **PATCH /reservations/:id**
  - Update reservation
  - Body: UpdateReservationDto
  - Tenant context required

- **DELETE /reservations/:id**
  - Delete reservation
  - Tenant context required

- **GET /reservations/client/:clientId**
  - Get reservations by client
  - Tenant context required

- **GET /reservations/employee/:employeeId**
  - Get reservations by employee
  - Tenant context required

- **PATCH /reservations/:id/status**
  - Update reservation status
  - Body: `{ status: ReservationStatus }`
  - Tenant context required

### 5. Services (`/services`)
Requires: JWT Auth + Roles Guard
- **POST /services**
  - Create new service (Admin only)
  - Body: CreateServiceDto

- **GET /services**
  - List all services

- **GET /services/:id**
  - Get specific service

### 6. Stock (`/stock`)
Requires: JWT Auth + Roles Guard
- **POST /stock**
  - Create new stock item (Admin only)
  - Body: CreateStockItemDto

- **GET /stock**
  - List all stock items

- **GET /stock/:id**
  - Get specific stock item

- **PATCH /stock/:id**
  - Update stock item (Admin only)
  - Body: UpdateStockItemDto

- **DELETE /stock/:id**
  - Delete stock item (Admin only)

- **GET /stock/tenant/:tenantId**
  - Get stock items by tenant

- **GET /stock/category/:category**
  - Get stock items by category
  - Query params: `tenantId`

## Kafka Events

The system uses Kafka for event-driven communication. The Kafka service is configured to publish events with the following structure:

```typescript
{
  topic: string,
  messages: [{
    value: {
      timestamp: string, // ISO date string
      data: any // Event specific data
    }
  }]
}
```

To publish events to Kafka:
```typescript
await kafkaService.publishEvent('topic-name', eventData);
```

## Multi-tenancy
The system implements multi-tenancy through:
1. Tenant Guard - Ensures requests are tenant-scoped
2. Tenant Context - Provides tenant information to endpoints
3. Tenant-specific data isolation

## Role-based Access Control
- Admin role required for certain operations (stock management, service creation)
- Regular user role for basic operations
- Role checks implemented through RolesGuard

## Integration with Elixir Instances
To integrate with Elixir instances:
1. Use the HTTP endpoints for synchronous operations
2. Use Kafka events for asynchronous operations and event-driven communication
3. Ensure proper tenant context is maintained across all communications 