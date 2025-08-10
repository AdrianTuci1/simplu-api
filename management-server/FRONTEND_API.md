### Frontend API (management-server)

Autentificare: Bearer JWT (Cognito)

Note utile:
- businessType: dental | gym | hotel
- subscriptionType: solo | enterprise
- domainType: subdomain | custom
- clientPageType: website | form
- Business.status: active | suspended | deleted
- Business.paymentStatus: active | past_due | canceled | unpaid

### Home
- Servicii active și listă: `GET /businesses`
  - UI calculează numărul și filtrează `status === "active"`

- Facturi neachitate: `GET /payments/invoices`
  - UI filtrează `status !== "paid"`

Exemplu răspuns `GET /payments/invoices`:
```json
[
  {
    "id": "in_123",
    "number": "FCT-0012",
    "status": "open",
    "total": 12000,
    "currency": "ron",
    "hostedInvoiceUrl": "https://...",
    "invoicePdf": "https://...",
    "created": "2025-01-10T10:00:00.000Z",
    "dueDate": "2025-01-25T10:00:00.000Z"
  }
]
```

### Services
#### Table (list)
- `GET /businesses`

Exemplu răspuns:
```json
[
  {
    "businessId": "b-uuid",
    "companyName": "SRL Exemplu",
    "businessType": "dental",
    "status": "suspended",
    "paymentStatus": "unpaid",
    "nextPaymentDate": null,
    "subscriptionType": "solo",
    "locations": [
      { "id":"loc-1","name":"Clinica Centrală","address":"...","timezone":"Europe/Bucharest","active":true }
    ],
    "settings": { "currency":"RON","language":"ro" },
    "credits": { "total":0,"available":0,"currency":"RON","perLocation":{},"lockedLocations":[] },
    "createdAt": "iso", "updatedAt": "iso"
  }
]
```

#### Add (create)
- `POST /businesses`

Body:
```json
{
  "companyName": "SRL Exemplu",
  "registrationNumber": "J12/123/2024",
  "taxCode": "RO12345678",
  "businessType": "dental",
  "locations": [
    { "name": "Clinica Centrală", "address": "Str. Clinicii 10", "timezone": "Europe/Bucharest", "active": true }
  ],
  "settings": { "currency": "RON", "language": "ro" },
  "configureForEmail": "owner@firma.ro",
  "domainType": "subdomain",
  "domainLabel": "numele-firmei",
  "customTld": "ro",
  "clientPageType": "website",
  "subscriptionType": "solo",
  "ownerEmail": "owner@firma.ro",
  "billingEmail": "facturi@firma.ro",
  "authorizedEmails": ["coleg@firma.ro"]
}
```

Răspuns: obiect Business (inițial `status=suspended`, `paymentStatus=unpaid`).

#### View
- `GET /businesses/:id`

#### Edit
- `PUT /businesses/:id`

Body (subset):
```json
{
  "companyName": "SRL Nou",
  "billingEmail": "facturi@nou.ro",
  "settings": { "currency": "RON", "language": "ro" },
  "locations": [
    { "id": "loc-1", "name": "Clinica Centrală", "address": "Str. X 1", "active": true, "timezone": "Europe/Bucharest" }
  ],
  "domainType": "custom",
  "domainLabel": "nume",
  "customTld": "ro",
  "clientPageType": "form",
  "subscriptionType": "enterprise"
}
```

#### Activare după plată
- Recomandat:
  1) `POST /payments/business/:id/subscription` (creează subscripția)
  2) Confirmi PaymentIntent în UI
  3) `GET /payments/business/:id/subscription/status` (activează dacă status Stripe devine activ)

- Fallback administrativ: `POST /businesses/:id/activate`

Body:
```json
{ "subscriptionType": "solo" }
```

#### Credits
- `POST /businesses/:id/credits/allocate`

Body:
```json
{ "amount": 100, "locationId": "loc-1", "lockLocationUse": true }
```

- `POST /businesses/:id/credits/deallocate`

Body:
```json
{ "amount": 50, "locationId": "loc-1" }
```

- `POST /businesses/:id/credits/reallocate`

Body:
```json
{ "fromLocationId": "loc-1", "toLocationId": "loc-2", "amount": 30 }
```

### Invoices
- `GET /payments/invoices`

Răspuns:
```json
[
  {
    "id": "in_123",
    "number": "FCT-0012",
    "status": "open",
    "total": 12000,
    "currency": "ron",
    "hostedInvoiceUrl": "https://...",
    "invoicePdf": "https://...",
    "created": "iso",
    "dueDate": "iso"
  }
]
```

### User
#### General
- `GET /users/me`

Răspuns:
```json
{
  "userId": "user-1",
  "email": "admin@management.com",
  "firstName": "Ion",
  "lastName": "Pop",
  "phone": "+40...",
  "billingAddress": { "company":"SRL", "street":"...", "city":"...", "district":"...", "postalCode":"...", "country":"RO" },
  "entityType": "srl",
  "registrationNumber": "J12/123/2024",
  "taxCode": "RO12345678",
  "stripeCustomerId": "cus_abc",
  "defaultPaymentMethodId": "pm_123",
  "createdAt": "iso",
  "updatedAt": "iso"
}
```

- `PUT /users/me`

Body (subset):
```json
{
  "firstName": "Ion",
  "lastName": "Pop",
  "phone": "+40...",
  "billingAddress": { "company":"SRL", "street":"...", "city":"...", "district":"...", "postalCode":"...", "country":"RO" },
  "entityType": "srl",
  "registrationNumber": "J12/123/2024",
  "taxCode": "RO12345678"
}
```

#### Payment
- `POST /users/me/payment-methods`

Body:
```json
{ "paymentMethodId": "pm_123" }
```

- `POST /payments/credits/payment-intent`

Body:
```json
{ "amountMinor": 10000 }
```

Răspuns:
```json
{ "clientSecret": "pi_secret_..." }
```

### Payments (subscripții business)
- `POST /payments/business/:id/subscription`

Body (alegi UNA din variante):
```json
{ "priceId": "price_abc", "cancelPrevious": true }
```
```json
{ "planKey": "basic", "billingInterval": "month", "currency": "ron", "cancelPrevious": true }
```
```json
{ "productId": "prod_abc", "billingInterval": "year", "currency": "ron", "cancelPrevious": true }
```

Răspuns:
```json
{ "subscriptionId": "sub_123", "status": "incomplete", "clientSecret": "pi_secret_..." }
```

- `GET /payments/business/:id/subscription/status`

Răspuns:
```json
{ "businessId": "b-uuid", "subscriptionId": "sub_123", "status": "active" }
```

