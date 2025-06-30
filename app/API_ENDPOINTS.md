# API Endpoints Implementation

Această documentație conține toate endpoint-urile API implementate în serverul NestJS conform specificațiilor din `API_REQUEST_EXAMPLES.md`.

## Autentificare (fără JWT)

### POST /api/auth/login
- **Descriere**: Autentificare utilizator
- **Headers**: `X-Tenant-ID`
- **Body**: `{ email: string, password: string }`
- **Response**: `{ access_token: string, refresh_token: string, user: object }`

### POST /api/auth/refresh
- **Descriere**: Reîmprospătare token de acces
- **Headers**: `X-Tenant-ID`
- **Body**: `{ refreshToken: string }`
- **Response**: `{ access_token: string, refresh_token: string, user: object }`

### POST /api/auth/register
- **Descriere**: Înregistrare utilizator nou
- **Headers**: `X-Tenant-ID`
- **Body**: `{ email: string, password: string, firstName?: string, lastName?: string }`
- **Response**: `{ access_token: string, refresh_token: string, user: object }`

### GET /api/auth/me
- **Descriere**: Obține datele utilizatorului curent
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ user: object }`

## Informații Business (fără JWT)

### GET /api/business-info
- **Descriere**: Obține informații despre business
- **Headers**: `X-Tenant-ID`
- **Response**: `{ business: object }`

## Facturi (cu JWT)

### GET /api/invoices
- **Descriere**: Obține toate facturile
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `page`, `limit`, `status`, `dateFrom`, `dateTo`
- **Response**: `{ invoices: array, total: number, page: number, limit: number, totalPages: number }`

### POST /api/invoices
- **Descriere**: Creează factură nouă
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ clientId: string, items: array, totalAmount: number, dueDate: string, notes?: string }`
- **Response**: `{ invoice: object }`

### GET /api/invoices/:id
- **Descriere**: Obține factura după ID
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ invoice: object }`

### PUT /api/invoices/:id
- **Descriere**: Actualizează factura
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ status?: string, totalAmount?: number, dueDate?: string, notes?: string }`
- **Response**: `{ invoice: object }`

### DELETE /api/invoices/:id
- **Descriere**: Șterge factura
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ message: string }`

## Stocuri (cu JWT)

### GET /api/stocks
- **Descriere**: Obține toate stocurile
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `category`, `lowStock`, `search`
- **Response**: `{ stockItems: array }`

### POST /api/stocks
- **Descriere**: Adaugă produs în stoc
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ name: string, category: string, quantity: number, unit: string, price: number, supplier: string, minQuantity: number, expiryDate?: string }`
- **Response**: `{ stockItem: object }`

### GET /api/stocks/:id
- **Descriere**: Obține produsul din stoc după ID
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ stockItem: object }`

### PATCH /api/stocks/:id
- **Descriere**: Actualizează produsul din stoc
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ name?: string, category?: string, quantity?: number, price?: number, ... }`
- **Response**: `{ stockItem: object }`

### DELETE /api/stocks/:id
- **Descriere**: Șterge produsul din stoc
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ message: string }`

### PATCH /api/stocks/:id/quantity
- **Descriere**: Actualizează cantitatea produsului
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ quantity: number }`
- **Response**: `{ stockItem: object }`

## Timeline Business-Specific (cu JWT)

### GET /api/dental/timeline
- **Descriere**: Obține timeline-ul dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `date`, `doctorId`, `status`
- **Response**: `{ appointments: array, total: number, filters: object }`

### POST /api/dental/timeline
- **Descriere**: Creează programare dentală
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ clientId: string, doctorId: string, date: string, time: string, duration: number, service: string, notes?: string, status: string }`
- **Response**: `{ appointment: object }`

### GET /api/gym/timeline
- **Descriere**: Obține timeline-ul pentru sală
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `date`, `classType`, `trainerId`
- **Response**: `{ appointments: array, total: number, filters: object }`

### POST /api/gym/timeline
- **Descriere**: Creează programare pentru sală
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ clientId: string, trainerId: string, date: string, time: string, duration: number, service: string, notes?: string, status: string }`
- **Response**: `{ appointment: object }`

### GET /api/hotel/timeline
- **Descriere**: Obține timeline-ul pentru hotel
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `date`, `roomType`, `status`
- **Response**: `{ reservations: array, total: number, filters: object }`

### POST /api/hotel/timeline
- **Descriere**: Creează rezervare pentru hotel
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ clientId: string, date: string, time: string, duration: number, service: string, notes?: string, status: string }`
- **Response**: `{ reservation: object }`

## Clienți Business-Specific (cu JWT)

### GET /api/dental/clients
- **Descriere**: Obține clienții dentali
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `search`, `status`, `lastVisitFrom`
- **Response**: `{ clients: array, total: number, filters: object }`

### POST /api/dental/clients
- **Descriere**: Creează client dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ firstName: string, lastName: string, email: string, phone: string, birthDate: string, address: string, medicalHistory?: string, emergencyContact?: object }`
- **Response**: `{ client: object }`

### GET /api/dental/clients/:id
- **Descriere**: Obține clientul dental după ID
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ client: object }`

### PUT /api/dental/clients/:id
- **Descriere**: Actualizează clientul dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ firstName?: string, lastName?: string, email?: string, phone?: string, birthDate?: string, address?: string, medicalHistory?: string, emergencyContact?: object }`
- **Response**: `{ client: object }`

### DELETE /api/dental/clients/:id
- **Descriere**: Șterge clientul dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ message: string }`

## Pachete Business-Specific (cu JWT)

### GET /api/dental/packages
- **Descriere**: Obține pachetele dentale
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `category`, `active`
- **Response**: `{ packages: array, total: number, filters: object }`

### POST /api/dental/packages
- **Descriere**: Creează pachet dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ name: string, description: string, category: string, price: number, duration: number, services: array, active: boolean }`
- **Response**: `{ package: object }`

### GET /api/dental/packages/:id
- **Descriere**: Obține pachetul dental după ID
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ package: object }`

### PUT /api/dental/packages/:id
- **Descriere**: Actualizează pachetul dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ name?: string, description?: string, category?: string, price?: number, duration?: number, services?: array, active?: boolean }`
- **Response**: `{ package: object }`

### DELETE /api/dental/packages/:id
- **Descriere**: Șterge pachetul dental
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ message: string }`

## Istoric (cu JWT)

### GET /api/history
- **Descriere**: Obține istoricul
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `dateFrom`, `dateTo`, `type`, `userId`
- **Response**: `{ history: array, total: number, filters: object }`

## Workflow-uri (cu JWT)

### GET /api/workflows
- **Descriere**: Obține workflow-urile
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Query Parameters**: `status`, `type`
- **Response**: `{ workflows: array, total: number, filters: object }`

## Rapoarte (cu JWT)

### POST /api/reports
- **Descriere**: Generează raport
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Body**: `{ type: string, dateFrom: string, dateTo: string, format: string, includeCharts: boolean, filters?: object }`
- **Response**: `{ report: object }`

## Roluri și Permisiuni (cu JWT)

### GET /api/roles
- **Descriere**: Obține rolurile
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ roles: array, tenantId: string, locationId: string }`

## Date Utilizator (cu JWT)

### GET /api/userData
- **Descriere**: Obține datele utilizatorului
- **Headers**: `Authorization: Bearer <token>`, `X-Tenant-ID`, `X-Location-ID`
- **Response**: `{ user: object, tenantId: string, locationId: string }`

## Headers Comuni

### Pentru toate request-urile autentificate:
```
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_id>
X-Location-ID: <location_id>
Content-Type: application/json
Accept: application/json
```

### Pentru request-uri fără autentificare:
```
X-Tenant-ID: <tenant_id>
Content-Type: application/json
Accept: application/json
```

## Note de Implementare

1. **Entități**: Toate endpoint-urile sunt implementate cu servicii temporare care returnează date mock. Entitățile TypeORM trebuie create pentru implementarea completă.

2. **Validare**: Toate endpoint-urile includ validarea header-urilor necesare și parametrilor de query.

3. **Documentație Swagger**: Toate endpoint-urile sunt documentate cu decoratori Swagger pentru generarea automată a documentației API.

4. **Securitate**: Toate endpoint-urile protejate folosesc `JwtAuthGuard` pentru validarea token-urilor JWT.

5. **Multi-tenancy**: Toate endpoint-urile suportă multi-tenancy prin header-ul `X-Tenant-ID`.

6. **Multi-location**: Toate endpoint-urile suportă multi-location prin header-ul `X-Location-ID`.

## Următorii Pași

1. Creați entitățile TypeORM pentru toate modulele
2. Implementați logica de business în servicii
3. Adăugați validare DTO cu class-validator
4. Implementați teste unitare și de integrare
5. Configurați migrații pentru baza de date
6. Adăugați logging și monitoring
7. Implementați rate limiting și caching 