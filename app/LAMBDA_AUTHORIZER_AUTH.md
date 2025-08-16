# Lambda Authorizer Authentication System

## 🎯 Descriere

Sistemul de autentificare cu Lambda authorizer permite validarea utilizatorilor prin răspunsuri de la AWS Lambda authorizer, care conțin informații despre utilizator, business și roluri pentru fiecare locație.

## 📋 Structura Răspunsului Lambda Authorizer

### Formatul Răspunsului
```typescript
interface LambdaAuthorizerResponse {
  userId: string;           // ID-ul unic al utilizatorului
  userName: string;         // Numele utilizatorului (email)
  businessId: string;       // ID-ul business-ului
  roles: LocationRole[];    // Rolurile pentru fiecare locație
}

interface LocationRole {
  locationId: string;       // ID-ul locației
  locationName: string;     // Numele locației
  role: string;             // Rolul utilizatorului (admin, manager, user, etc.)
  permissions?: string[];   // Permisiunile specifice (opțional)
}
```

### Exemplu de Răspuns
```json
{
  "userId": "user123",
  "userName": "john.doe@example.com",
  "businessId": "business456",
  "roles": [
    {
      "locationId": "location789",
      "locationName": "Main Office",
      "role": "admin",
      "permissions": ["read", "write", "delete"]
    },
    {
      "locationId": "location101",
      "locationName": "Branch Office",
      "role": "manager",
      "permissions": ["read", "write"]
    }
  ]
}
```

## 🔧 Implementare

### 1. Interfețe și Tipuri
- `LambdaAuthorizerResponse` - Structura răspunsului
- `LocationRole` - Rolul pentru o locație specifică
- `AuthenticatedUser` - Utilizatorul autentificat cu toate informațiile

### 2. Serviciul de Autentificare (`AuthService`)
```typescript
// Validare răspuns Lambda authorizer
async validateLambdaAuthorizerResponse(authorizerResponse: LambdaAuthorizerResponse): Promise<AuthenticatedUser>

// Validare JWT token cu context Lambda authorizer
async validateLambdaAuthorizerToken(token: string): Promise<AuthenticatedUser>

// Verificare rol pentru o locație
getUserRoleForLocation(user: AuthenticatedUser, locationId: string): LocationRole | null

// Verificare permisiune
hasPermission(user: AuthenticatedUser, locationId: string, permission: string): boolean
```

### 3. Guard de Autentificare (`LambdaAuthorizerGuard`)
Guard-ul verifică:
- Endpoint-uri publice (decorate cu `@Public()`)
- Headers cu răspuns Lambda authorizer
- JWT tokens cu context Lambda authorizer

## 🚀 Utilizare

### 1. Endpoint-uri Publice
```typescript
@Get('health')
@Public()
async healthCheck() {
  return { success: true, message: 'Service is healthy' };
}
```

### 2. Endpoint-uri Protejate cu Headers
```typescript
@Get('profile')
@UseGuards(LambdaAuthorizerGuard)
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return {
    userId: user.userId,
    userName: user.userName,
    businessId: user.businessId,
    roles: user.roles
  };
}
```

### 3. Headers Necesari pentru Lambda Authorizer
```
x-authorizer-user-id: user123
x-authorizer-user-name: john.doe@example.com
x-authorizer-business-id: business456
x-authorizer-roles: [{"locationId":"location789","locationName":"Main Office","role":"admin"}]
```

### 4. JWT Token cu Context Lambda Authorizer
```typescript
// Token-ul conține context-ul Lambda authorizer în payload
{
  "context": {
    "userId": "user123",
    "userName": "john.doe@example.com",
    "businessId": "business456",
    "roles": [...]
  }
}
```

## 📡 API Endpoints

### Autentificare
- `POST /auth/validate-lambda-authorizer` - Validează răspunsul Lambda authorizer
- `GET /auth/profile` - Obține profilul utilizatorului curent
- `GET /auth/roles` - Obține toate rolurile utilizatorului
- `GET /auth/roles/:locationId` - Obține rolul pentru o locație specifică
- `GET /auth/health` - Health check (public)

### Permisiuni
- `GET /auth/permissions/:locationId` - Obține permisiunile utilizatorului pentru o locație specifică
- `GET /auth/permissions` - Obține permisiunile utilizatorului pentru toate locațiile
- `POST /auth/check-permission/:locationId/:resourceType/:action` - Verifică dacă utilizatorul are o permisiune specifică
- `POST /auth/test-permissions/:locationId` - Testează multiple permisiuni pentru o locație

### Exemplu de Request
```bash
# Cu headers Lambda authorizer
curl -X GET http://localhost:3000/auth/profile \
  -H "x-authorizer-user-id: user123" \
  -H "x-authorizer-user-name: john.doe@example.com" \
  -H "x-authorizer-business-id: business456" \
  -H "x-authorizer-roles: [{\"locationId\":\"location789\",\"locationName\":\"Main Office\",\"role\":\"admin\"}]"

# Cu JWT token
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Verificare permisiune
curl -X POST http://localhost:3000/auth/check-permission/location789/clients/create \
  -H "x-authorizer-user-id: user123" \
  -H "x-authorizer-user-name: john.doe@example.com" \
  -H "x-authorizer-business-id: business456" \
  -H "x-authorizer-roles: [{\"locationId\":\"location789\",\"locationName\":\"Main Office\",\"role\":\"admin\"}]"

# Obținere permisiuni pentru o locație
curl -X GET http://localhost:3000/auth/permissions/location789 \
  -H "x-authorizer-user-id: user123" \
  -H "x-authorizer-user-name: john.doe@example.com" \
  -H "x-authorizer-business-id: business456" \
  -H "x-authorizer-roles: [{\"locationId\":\"location789\",\"locationName\":\"Main Office\",\"role\":\"admin\"}]"
```

## 🧪 Testare

### Script de Testare
```bash
# Rulare testare completă
node scripts/test-lambda-authorizer.js

# Testare cu URL specific
API_BASE_URL=http://localhost:3000 node scripts/test-lambda-authorizer.js

# Testare sistem de permisiuni
node scripts/test-permissions.js

# Testare cu URL specific
API_BASE_URL=http://localhost:3000 node scripts/test-permissions.js

# Testare bypass Lambda authorizer
node scripts/test-bypass.js

# Testare bypass cu URL specific
API_BASE_URL=http://localhost:3000 node scripts/test-bypass.js
```

### Teste Incluse
- ✅ Health check endpoint
- ✅ Validare răspuns Lambda authorizer
- ✅ Autentificare cu headers
- ✅ Autentificare cu JWT token
- ✅ Obținere roluri utilizator
- ✅ Obținere rol pentru locație specifică
- ✅ Blocare acces neautorizat
- ✅ Validare răspuns invalid

## 🔒 Securitate

### Validări Implementate
1. **Câmpuri Obligatorii**: `userId`, `userName`, `businessId`, `roles`
2. **Structură Roluri**: Fiecare rol trebuie să aibă `locationId`, `locationName`, `role`
3. **Format JSON**: Rolurile trebuie să fie un array JSON valid
4. **JWT Token**: Verificare format și prezență context

## 🔐 Sistem de Permisiuni

### Arhitectura Permisiunilor
Sistemul de permisiuni integrează Lambda authorizer cu interogarea bazei de date pentru a obține permisiunile specifice asociate fiecărui rol.

### Flux de Validare Permisiuni
1. **Lambda Authorizer** → Returnează rolurile utilizatorului pe locații
2. **Validare Locație** → Verifică dacă utilizatorul are acces la locația respectivă
3. **Interogare Baza de Date** → Caută permisiunile asociate rolului în resursa 'roles'
4. **Validare Permisiune** → Verifică dacă rolul are permisiunea necesară pentru acțiunea respectivă

### Formatul Permisiunilor
```typescript
// Format: resourceType:action
type Permission = 'clients:create' | 'clients:read' | 'clients:update' | 'clients:delete' |
                 'invoices:create' | 'invoices:read' | 'invoices:update' | 'invoices:delete' |
                 'staff:create' | 'staff:read' | 'staff:update' | 'staff:delete' |
                 'roles:create' | 'roles:read' | 'roles:update' | 'roles:delete' |
                 'reports:create' | 'reports:read' | 'reports:update' | 'reports:delete' |
                 'appointments:create' | 'appointments:read' | 'appointments:update' | 'appointments:delete' |
                 'treatments:create' | 'treatments:read' | 'treatments:update' | 'treatments:delete';
```

### Roluri și Permisiuni Predefinite
- **admin**: Toate permisiunile pentru toate resursele
- **manager**: Permisiuni de citire și scriere pentru majoritatea resurselor
- **user**: Permisiuni de citire pentru resursele de bază
- **viewer**: Permisiuni de citire limitate

### Utilizare în Cod
```typescript
// Verificare permisiune pentru o acțiune
await this.permissionService.checkPermission(
  user,           // AuthenticatedUser din Lambda authorizer
  locationId,     // ID-ul locației
  'clients',      // Tipul resursei
  'create'        // Acțiunea
);

// Obținere toate permisiunile pentru o locație
const permissions = await this.permissionService.getUserPermissions(user, locationId);

// Obținere permisiuni pentru toate locațiile
const allPermissions = await this.permissionService.getUserPermissionsAllLocations(user);
```

### Mesaje de Eroare
- `Missing userId in Lambda authorizer response`
- `Missing userName in Lambda authorizer response`
- `Missing businessId in Lambda authorizer response`
- `Missing or invalid roles in Lambda authorizer response`
- `Invalid role structure in Lambda authorizer response`
- `Token does not contain Lambda authorizer context`

## 🔧 Configurare și Bypass pentru Dezvoltare

### Variabile de Mediu pentru Configurare
```bash
# Lambda Authorizer Configuration
LAMBDA_AUTHORIZER_ENABLED=true                    # Enable/disable Lambda authorizer (default: true)
LAMBDA_AUTHORIZER_BYPASS=false                    # Bypass for development (default: false)
LAMBDA_AUTHORIZER_MOCK_USER=false                 # Enable mock user (default: false)
LAMBDA_AUTHORIZER_MOCK_USER_ID=mock-user-123      # Mock user ID
LAMBDA_AUTHORIZER_MOCK_USER_NAME=mock@example.com # Mock user name
LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID=mock-business  # Mock business ID
LAMBDA_AUTHORIZER_MOCK_ROLES=[{"locationId":"loc1","locationName":"Mock","role":"admin"}] # Mock roles
```

### Bypass pentru Dezvoltare

#### 1. **Dezactivare Completă Lambda Authorizer**
```bash
LAMBDA_AUTHORIZER_ENABLED=false
```
- Toate endpoint-urile devin publice
- Nu se face nicio verificare de autentificare
- Util pentru dezvoltare rapidă

#### 2. **Bypass cu Mock User**
```bash
LAMBDA_AUTHORIZER_BYPASS=true
LAMBDA_AUTHORIZER_MOCK_USER=true
LAMBDA_AUTHORIZER_MOCK_USER_ID=dev-user-123
LAMBDA_AUTHORIZER_MOCK_USER_NAME=developer@example.com
LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID=dev-business-456
LAMBDA_AUTHORIZER_MOCK_ROLES=[{"locationId":"dev-loc-789","locationName":"Dev Location","role":"admin"}]
```
- Endpoint-urile sunt accesibile fără autentificare
- Se atașează automat un utilizator mock la request
- Util pentru testarea funcționalităților care necesită un utilizator autentificat

#### 3. **Bypass fără Mock User**
```bash
LAMBDA_AUTHORIZER_BYPASS=true
LAMBDA_AUTHORIZER_MOCK_USER=false
```
- Endpoint-urile sunt accesibile fără autentificare
- Nu se atașează niciun utilizator la request
- Util pentru testarea endpoint-urilor care nu necesită utilizator

### Exemple de Utilizare

#### Dezvoltare Locală
```bash
# .env.local
LAMBDA_AUTHORIZER_BYPASS=true
LAMBDA_AUTHORIZER_MOCK_USER=true
LAMBDA_AUTHORIZER_MOCK_USER_ID=local-dev-123
LAMBDA_AUTHORIZER_MOCK_USER_NAME=local@dev.com
LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID=local-business
LAMBDA_AUTHORIZER_MOCK_ROLES=[{"locationId":"local-loc","locationName":"Local","role":"admin"}]
```

#### Testare
```bash
# .env.test
LAMBDA_AUTHORIZER_BYPASS=true
LAMBDA_AUTHORIZER_MOCK_USER=true
LAMBDA_AUTHORIZER_MOCK_USER_ID=test-user-123
LAMBDA_AUTHORIZER_MOCK_USER_NAME=test@example.com
LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID=test-business
LAMBDA_AUTHORIZER_MOCK_ROLES=[{"locationId":"test-loc","locationName":"Test","role":"manager"}]
```

#### Producție
```bash
# .env.production
LAMBDA_AUTHORIZER_ENABLED=true
LAMBDA_AUTHORIZER_BYPASS=false
LAMBDA_AUTHORIZER_MOCK_USER=false
```

## 🏗️ Integrare cu Lambda Authorizer AWS

### Exemplu Lambda Function
```javascript
exports.handler = async (event) => {
  // Validare token sau alte logici de autentificare
  const token = event.authorizationToken;
  
  // Obținere informații utilizator din baza de date
  const userInfo = await getUserFromDatabase(token);
  
  // Construire răspuns
  const response = {
    principalId: userInfo.userId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: event.methodArn
      }]
    },
    context: {
      userId: userInfo.userId,
      userName: userInfo.userName,
      businessId: userInfo.businessId,
      roles: JSON.stringify(userInfo.roles)
    }
  };
  
  return response;
};
```

## 📝 Decoratori Disponibili

### `@Public()`
Marchează un endpoint ca fiind public (nu necesită autentificare)

### `@CurrentUser()`
Extrage utilizatorul autentificat din request

```typescript
@Get('profile')
@UseGuards(LambdaAuthorizerGuard)
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

## 🔄 Flux de Autentificare

1. **Request Primit** → LambdaAuthorizerGuard
2. **Verificare Public** → Dacă endpoint-ul este public, permite accesul
3. **Extragere Headers** → Caută headers Lambda authorizer
4. **Validare Răspuns** → Validează structura și conținutul
5. **Extragere JWT** → Dacă nu sunt headers, caută JWT token
6. **Validare JWT** → Decodifică și validează token-ul
7. **Atașare User** → Atașează utilizatorul la request
8. **Permitere Acces** → Permite accesul la endpoint

## 🚨 Troubleshooting

### Probleme Comune
1. **Headers Lipsesc**: Verifică prezența tuturor header-elor necesare
2. **Format JSON Invalid**: Verifică formatul JSON pentru `x-authorizer-roles`
3. **JWT Token Invalid**: Verifică validitatea și conținutul token-ului
4. **Endpoint Protejat**: Asigură-te că endpoint-ul nu este marcat ca public

### Debugging
```bash
# Verifică log-urile server-ului
npm run start:dev

# Testează cu curl
curl -v -X GET http://localhost:3000/auth/profile \
  -H "x-authorizer-user-id: user123" \
  -H "x-authorizer-user-name: test@example.com" \
  -H "x-authorizer-business-id: business123" \
  -H "x-authorizer-roles: []"
``` 