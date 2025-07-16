# Ghid de Mapare a Resurselor API

## Arhitectura Serverelor

### Server Unificat (API)
- **URL:** `VITE_API_URL` (ex: `https://api.example.com`)
- **Responsabilități:** Resurse, autentificare, business info, sincronizare

## Endpoint-uri Principale

### Server Unificat (`VITE_API_URL`)

#### 1. Autentificare
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

#### 2. Business Info (Read-Only)
```
GET /api/businessInfo/{businessId}
```

**Structura Business Info:**
```javascript
{
  "id": "string",
  "name": "string",
  "type": "dental|gym|hotel|sales",
  "locations": [
    {
      "id": "string",
      "name": "string",
      "address": "string",
      "phone": "string",
      "email": "string",
      "active": true
    }
  ],
  "settings": {
    "timezone": "string",
    "currency": "string",
    "language": "string",
    "features": ["feature1", "feature2"]
  },
  "permissions": {
    "roles": ["admin", "manager", "staff"],
    "modules": ["timeline", "clients", "services", "reports"]
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### 3. Resurse Unificate (Single Endpoint Pattern)
```
GET    /api/resources/{businessId-locationId}
POST   /api/resources/{businessId-locationId}
PUT    /api/resources/{businessId-locationId}
DELETE /api/resources/{businessId-locationId}
PATCH  /api/resources/{businessId-locationId}
```

#### 4. Health Check
```
GET /api/health
```

## Maparea Resurselor pe Tipuri de Business

### 1. Dental Business

#### Timeline Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=timeline
{
  "resourceType": "timeline",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "dentistId": "optional",
    "status": "scheduled|completed|cancelled"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "timeline",
  "operation": "create",
  "data": {
    "patientId": "string",
    "dentistId": "string",
    "treatmentId": "string",
    "appointmentDate": "2024-01-15T10:00:00Z",
    "duration": 60,
    "notes": "string"
  }
}
```

#### Clients Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=clients
{
  "resourceType": "clients",
  "filters": {
    "search": "string",
    "status": "active|inactive",
    "lastVisit": "date"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "clients",
  "operation": "create",
  "data": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "dateOfBirth": "date",
    "medicalHistory": "string",
    "allergies": ["string"]
  }
}
```

#### Services Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=services
{
  "resourceType": "services",
  "filters": {
    "category": "treatment|consultation",
    "active": true
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "services",
  "operation": "create",
  "data": {
    "name": "string",
    "description": "string",
    "duration": 60,
    "price": 100.00,
    "category": "treatment",
    "active": true
  }
}
```

### 2. Gym Business

#### Timeline Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=timeline
{
  "resourceType": "timeline",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "classId": "optional",
    "trainerId": "optional"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "timeline",
  "operation": "create",
  "data": {
    "memberId": "string",
    "classId": "string",
    "trainerId": "string",
    "startTime": "2024-01-15T10:00:00Z",
    "duration": 60,
    "type": "class|personal|assessment"
  }
}
```

#### Members Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=members
{
  "resourceType": "members",
  "filters": {
    "search": "string",
    "membershipStatus": "active|expired|pending",
    "membershipType": "monthly|yearly|premium"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "members",
  "operation": "create",
  "data": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "membershipType": "monthly",
    "startDate": "2024-01-01",
    "emergencyContact": {
      "name": "string",
      "phone": "string",
      "relationship": "string"
    }
  }
}
```

#### Packages Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=packages
{
  "resourceType": "packages",
  "filters": {
    "active": true,
    "category": "membership|class|personal"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "packages",
  "operation": "create",
  "data": {
    "name": "string",
    "description": "string",
    "price": 100.00,
    "duration": 30,
    "features": ["feature1", "feature2"],
    "category": "membership",
    "active": true
  }
}
```

### 3. Hotel Business

#### Timeline Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=timeline
{
  "resourceType": "timeline",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "roomId": "optional",
    "status": "booked|checked-in|checked-out"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "timeline",
  "operation": "create",
  "data": {
    "guestId": "string",
    "roomId": "string",
    "checkInDate": "2024-01-15T14:00:00Z",
    "checkOutDate": "2024-01-17T11:00:00Z",
    "guests": 2,
    "specialRequests": "string"
  }
}
```

#### Clients Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=clients
{
  "resourceType": "clients",
  "filters": {
    "search": "string",
    "loyaltyStatus": "bronze|silver|gold|platinum",
    "lastStay": "date"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "clients",
  "operation": "create",
  "data": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string",
      "country": "string",
      "postalCode": "string"
    },
    "loyaltyNumber": "string",
    "preferences": {
      "roomType": "string",
      "floor": "string",
      "amenities": ["string"]
    }
  }
}
```

#### Rooms Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=rooms
{
  "resourceType": "rooms",
  "filters": {
    "status": "available|occupied|maintenance",
    "type": "single|double|suite",
    "floor": "number"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "rooms",
  "operation": "create",
  "data": {
    "number": "string",
    "type": "single",
    "floor": 1,
    "price": 100.00,
    "amenities": ["wifi", "tv", "ac"],
    "status": "available",
    "capacity": 2
  }
}
```

### 4. Sales Business

#### Products Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=products
{
  "resourceType": "products",
  "filters": {
    "search": "string",
    "category": "string",
    "inStock": true,
    "active": true
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "products",
  "operation": "create",
  "data": {
    "name": "string",
    "description": "string",
    "price": 100.00,
    "category": "string",
    "sku": "string",
    "stock": 50,
    "active": true
  }
}
```

#### Sales Resources
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=sales
{
  "resourceType": "sales",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": "completed|pending|cancelled"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "sales",
  "operation": "create",
  "data": {
    "customerId": "string",
    "items": [
      {
        "productId": "string",
        "quantity": 2,
        "price": 100.00
      }
    ],
    "total": 200.00,
    "paymentMethod": "cash|card|transfer",
    "status": "completed"
  }
}
```

## Resurse Comune

### 1. Stocks/Inventory
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=stocks
{
  "resourceType": "stocks",
  "filters": {
    "search": "string",
    "category": "string",
    "lowStock": true
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "stocks",
  "operation": "create",
  "data": {
    "name": "string",
    "description": "string",
    "category": "string",
    "quantity": 100,
    "minQuantity": 10,
    "unit": "pieces",
    "price": 5.00
  }
}
```

### 2. Invoices
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=invoices
{
  "resourceType": "invoices",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": "paid|pending|overdue",
    "customerId": "string"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "invoices",
  "operation": "create",
  "data": {
    "customerId": "string",
    "items": [
      {
        "description": "string",
        "quantity": 1,
        "price": 100.00
      }
    ],
    "total": 100.00,
    "dueDate": "2024-02-15",
    "status": "pending"
  }
}
```

### 3. Activities/History
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=activities
{
  "resourceType": "activities",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "type": "login|action|error",
    "userId": "string"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "activities",
  "operation": "create",
  "data": {
    "type": "action",
    "action": "create_client",
    "userId": "string",
    "details": "object",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### 4. Reports
```javascript
// GET /api/resources/{businessId-locationId}?resourceType=reports
{
  "resourceType": "reports",
  "filters": {
    "type": "daily|monthly|custom",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}

// POST /api/resources/{businessId-locationId}
{
  "resourceType": "reports",
  "operation": "generate",
  "data": {
    "type": "daily",
    "date": "2024-01-15",
    "metrics": ["revenue", "clients", "appointments"]
  }
}
```

## Structura Răspunsurilor

### Răspuns Standard pentru GET
```javascript
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    },
    "filters": {...}
  },
  "meta": {
    "businessId": "string",
    "locationId": "string",
    "resourceType": "string",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Răspuns Standard pentru POST/PUT/PATCH
```javascript
{
  "success": true,
  "data": {
    "id": "string",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    ...resourceData
  },
  "meta": {
    "businessId": "string",
    "locationId": "string",
    "resourceType": "string",
    "operation": "create|update|delete"
  }
}
```

### Răspuns pentru Erori
```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "businessId": "string",
    "locationId": "string",
    "resourceType": "string",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

## Coduri de Eroare

### Erori de Validare
- `VALIDATION_ERROR` - Date invalide
- `REQUIRED_FIELD` - Câmp obligatoriu lipsă
- `INVALID_FORMAT` - Format invalid

### Erori de Autentificare
- `UNAUTHORIZED` - Nu este autentificat
- `FORBIDDEN` - Nu are permisiuni
- `TOKEN_EXPIRED` - Token expirat

### Erori de Resurse
- `RESOURCE_NOT_FOUND` - Resursa nu există
- `RESOURCE_EXISTS` - Resursa există deja
- `RESOURCE_IN_USE` - Resursa este în uz

### Erori de Business
- `BUSINESS_NOT_FOUND` - Business-ul nu există
- `LOCATION_NOT_FOUND` - Locația nu există
- `INVALID_BUSINESS_TYPE` - Tip de business invalid

## Headers Necesare

### Pentru Autentificare
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Pentru Business Context
```
X-Business-ID: {businessId}
X-Location-ID: {locationId}
X-Resource-Type: {resourceType}
```

## Rate Limiting

### Limite Standard
- **GET requests:** 1000/minute
- **POST/PUT/PATCH requests:** 100/minute
- **DELETE requests:** 50/minute

### Headers de Rate Limiting
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567
```

## Caching

### Headers de Cache
```
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Wed, 15 Jan 2024 10:00:00 GMT
```

### Condiții de Cache
- **GET requests:** Cache-able pentru 5 minute
- **Business info:** Cache-able pentru 1 oră
- **Reports:** Cache-able pentru 15 minute

## Webhooks (Opțional)

### Endpoint-uri Webhook
```
POST /api/webhooks/resource-created
POST /api/webhooks/resource-updated
POST /api/webhooks/resource-deleted
```

### Structura Webhook
```javascript
{
  "event": "resource.created",
  "data": {
    "resourceType": "clients",
    "resourceId": "string",
    "businessId": "string",
    "locationId": "string",
    "changes": {...}
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "signature": "sha256=..."
}
```

## Testing

### Endpoint-uri de Test
```
GET /api/test/health
GET /api/test/business/{businessId}
POST /api/test/resource
```

### Date de Test
- Business ID: `test-business-123`
- Location ID: `test-location-456`
- Token: `test-token-789`

## Monitorizare și Logging

### Endpoint-uri de Monitorizare
```
GET /api/metrics/requests
GET /api/metrics/errors
GET /api/metrics/performance
```

### Logging
- Toate request-urile sunt logate
- Erorile sunt logate cu stack trace
- Performanța este măsurată
- Business metrics sunt colectate

## Securitate

### Validare
- Toate input-urile sunt validate
- SQL injection protection
- XSS protection
- CSRF protection

### Autorizare
- Role-based access control (RBAC)
- Business-level permissions
- Location-level permissions
- Resource-level permissions

### Audit
- Toate modificările sunt auditate
- User actions sunt logate
- Sensitive data este criptată
- Backup-uri automate

## Environment Variables

### Variables:
```bash
# Main API server (unified)
VITE_API_URL=https://api.example.com
```

## Concluzie

Această mapare oferă o structură completă pentru implementarea serverului API cu:

1. **Arhitectură unificată** cu un singur server pentru toate funcționalitățile
2. **Endpoint-uri unificate** pentru toate resursele
3. **Suport pentru toate tipurile de business** (dental, gym, hotel, sales)
4. **Resurse comune** pentru funcționalități generale
5. **Standarde consistente** pentru request-uri și răspunsuri
6. **Securitate și monitorizare** integrate
7. **Testing și debugging** facilite

Implementarea acestei structuri va asigura o bază solidă pentru aplicația CMS cu suport complet pentru funcționalități offline și sincronizare. 