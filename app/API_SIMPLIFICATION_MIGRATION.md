# API Simplification Migration

## Overview

Această migrare simplifică structura API-ului pentru resurse prin eliminarea duplicărilor și complicațiilor în trimiterea datelor.

## Probleme Identificate

### 1. Duplicarea Datelor
- `businessId-locationId` era trimis atât în URL cât și în headers
- `resourceType` era trimis în headers în loc de URL
- `startDate` și `endDate` erau trimise în body în loc să fie extrase automat din `data`

### 2. Structura Complicată a Body-ului
- Body-ul conținea `{ "data": {} }` în loc de `{ data }` direct
- Câmpurile `startDate` și `endDate` trebuiau trimise manual în body

## Modificări Implementate

### 1. URL Structure Păstrată cu Body Simplificat

#### Înainte
```
POST /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
Body: {
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "resourceId": "ap24-00001",
  "data": {
    "name": "John Doe",
    "appointmentDate": "2024-01-15T10:00:00Z"
  }
}
```

#### După
```
POST /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
Body: {
  "data": {
    "name": "John Doe",
    "appointmentDate": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Endpoints Păstrate cu Body Simplificat

#### Create Resource
```
POST /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
```

#### Update Resource
```
PUT /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
```

#### Patch Resource
```
PATCH /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
```

#### Delete Resource
```
DELETE /api/resources/{businessId}-{locationId}
Headers: X-Resource-Type: {resourceType}
```

#### Get Specific Resource
```
GET /api/resources/{businessId}-{locationId}/{resourceType}/{resourceId}
```

#### Query Resources
```
GET /api/resources/{businessId}-{locationId}/{resourceType}?page=1&limit=20
```

#### Get Resource Stats
```
GET /api/resources/{businessId}-{locationId}/stats?resourceType=clients
```

#### Get Resources by Date Range
```
GET /api/resources/{businessId}-{locationId}/{resourceType}/date-range?startDate=2024-01-01&endDate=2024-01-31
```

### 3. Extragerea Automată a Datelor

#### Înainte
- `startDate` și `endDate` trebuiau trimise manual în body
- Validarea datelor se făcea în API

#### După
- `startDate` și `endDate` sunt extrase automat din `data` în `resources-server`
- Logica de extragere caută câmpuri comune: `startDate`, `appointmentDate`, `reservationDate`, etc.
- Fallback la data curentă dacă nu sunt găsite date
- **Salvare în DB**: Câmpul `data` cu JSON-ul complet + câmpurile `start_date` și `end_date` (extrase)
- **Pentru query-uri**: Folosim câmpurile `startDate` și `endDate` din baza de date (nu din `data`)

### 4. Structura Body-ului Simplificată

#### Înainte
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "resourceId": "ap24-00001",
  "data": {
    "name": "John Doe",
    "appointmentDate": "2024-01-15T10:00:00Z"
  }
}
```

#### După
```json
{
  "data": {
    "name": "John Doe",
    "appointmentDate": "2024-01-15T10:00:00Z"
  }
}
```

## Fluxul de Date

### 1. Creare/Actualizare Resurse (POST/PUT/PATCH)
```
Frontend → API → Kinesis → Resources-Server → Database
Body: { "data": {...} } → Extract startDate/endDate → Store data + startDate/endDate in DB
```

### 2. Query Resurse (GET)
```
Frontend → API → Query Service → Database
Query params: startDate/endDate → Filter by DB fields → Return results
```

**Important**: Pentru query-uri, folosim câmpurile `startDate` și `endDate` din baza de date (care au fost extrase automat din `data` când s-a creat resursa), nu ne uităm în câmpul `data`.

## Beneficii

### 1. API Mai Curat
- Eliminarea duplicărilor în URL și headers
- Structura body-ului mai simplă și intuitivă
- URL-uri mai descriptive și RESTful

### 2. Logică Centralizată
- Extragerea datelor se face automat în `resources-server`
- Validarea datelor se face în backend, nu în frontend
- Mai puțină logică duplicată

### 3. Performanță Îmbunătățită
- Mai puține date trimise în request
- Validare mai eficientă
- Procesare mai rapidă

## Exemple de Utilizare

### Creare Client Dental
```bash
http POST localhost:3000/api/resources/dental-clinic-location1 \
  X-Resource-Type:clients \
  data:='{
    "name": "Ion Popescu",
    "email": "ion.popescu@email.com",
    "phone": "+40123456789",
    "birthYear": 1985,
    "gender": "male",
    "address": {
      "street": "Strada Libertății",
      "city": "București",
      "state": "București",
      "postalCode": "010000",
      "country": "România"
    },
    "medicalHistory": "Fără probleme majore",
    "allergies": ["penicilină"],
    "emergencyContact": {
      "name": "Maria Popescu",
      "phone": "+40187654321",
      "relationship": "soție"
    },
    "status": "active",
    "category": "regular",
    "tags": ["vip", "fidel"],
    "notes": "Client nou înregistrat prin website"
  }'
```

### Creare Programare Dentală
```bash
http POST localhost:3000/api/resources/dental-clinic-location1 \
  X-Resource-Type:appointments \
  data:='{
    "patientId": "cl24-00001",
    "dentistId": "st24-00001",
    "appointmentDate": "2024-01-15T10:00:00Z",
    "duration": 60,
    "treatmentType": "consultation",
    "notes": "Prima consultație",
    "status": "scheduled"
  }'
```

### Actualizare Client
```bash
http PUT localhost:3000/api/resources/dental-clinic-location1 \
  X-Resource-Type:clients \
  data:='{
    "name": "Ion Popescu",
    "email": "ion.popescu.nou@email.com",
    "phone": "+40123456789",
    "status": "active",
    "lastVisit": "2024-01-15T10:00:00Z"
  }'
```

### Ștergere Programare
```bash
http DELETE localhost:3000/api/resources/dental-clinic-location1 \
  X-Resource-Type:appointments
```

### Query Clienți
```bash
http GET "localhost:3000/api/resources/dental-clinic-location1/clients?page=1&limit=20&status=active"
```

## Migrare Frontend

### 1. Actualizare URL-uri
```javascript
// Înainte
const url = `/api/resources/${businessId}-${locationId}`;
const headers = { 'X-Resource-Type': resourceType };

// După (URL rămâne la fel, doar body-ul se simplifică)
const url = `/api/resources/${businessId}-${locationId}`;
const headers = { 'X-Resource-Type': resourceType };
```

### 2. Actualizare Body
```javascript
// Înainte
const body = {
  startDate: "2024-01-15",
  endDate: "2024-01-15",
  resourceId: "ap24-00001",
  data: resourceData
};

// După
const body = {
  data: resourceData
};
```

### 3. Headers Rămân la Fel
```javascript
// Înainte și după
const headers = {
  'X-Resource-Type': resourceType,
  'Content-Type': 'application/json'
};
```

## Compatibilitate

### Breaking Changes
- Structura body-ului a fost simplificată (eliminarea `startDate`, `endDate`, `resourceId` din body)
- `startDate` și `endDate` sunt extrase automat din `data` în backend
- URL-urile și headers-urile rămân la fel

### Recomandări
1. Actualizează toate clientele frontend
2. Testează toate endpoint-urile
3. Actualizează documentația API
4. Notifică dezvoltatorii despre modificări

## Testing

### Teste de Compatibilitate
```bash
# Test creare client
curl -X POST "http://localhost:3000/api/resources/dental-clinic-location1" \
  -H "Content-Type: application/json" \
  -H "X-Resource-Type: clients" \
  -d '{
    "data": {
      "name": "Test Client",
      "email": "test@example.com"
    }
  }'

# Test query clienți
curl "http://localhost:3000/api/resources/dental-clinic-location1/clients?page=1&limit=10"

# Test get specific client
curl "http://localhost:3000/api/resources/dental-clinic-location1/clients/cl24-00001"
```

## Concluzie

Această migrare simplifică API-ul prin:
- Simplificarea structurii body-ului (eliminarea `startDate`, `endDate`, `resourceId` din body)
- Centralizarea logicii de extragere a datelor în backend
- Păstrarea structurii URL și headers pentru compatibilitate
- Îmbunătățirea experienței dezvoltatorilor prin reducerea datelor necesare în request

API-ul devine mai intuitiv și mai ușor de utilizat, păstrând în același timp compatibilitatea cu structura existentă.
