# Nested Field Search Guide

Acest ghid demonstrează cum să folosești noul sistem de căutare cu câmpuri nested în API-ul de resurse.

## Exemplu de Utilizare

### Structura Datelor
```json
{
  "id": "business123-location456",
  "businessId": "business123",
  "locationId": "location456",
  "resourceType": "appointment",
  "resourceId": "appointment789",
  "data": {
    "treatmentName": "Consultation",
    "status": "active",
    "doctor": {
      "id": "33948842-b061-7036-f02f-79b9c0b4225b",
      "name": "Dr. Ion Popescu",
      "email": "doctor@clinic.com"
    },
    "patient": {
      "id": "patient456",
      "name": "Ion Ionescu",
      "email": "patient@email.com"
    }
  }
}
```

### Căutări Suportate

#### 1. Căutare după ID doctor nested
```bash
GET /resources/business123-location456?data.doctor.id=33948842-b061-7036-f02f-79b9c0b4225b
```

#### 2. Căutare după nume pacient nested
```bash
GET /resources/business123-location456?data.patient.name=Ion
```

#### 3. Căutare după câmp direct în data
```bash
GET /resources/business123-location456?data.treatmentName=consultation
```

#### 4. Căutare cu multiple filtre
```bash
GET /resources/business123-location456?data.doctor.id=33948842-b061-7036-f02f-79b9c0b4225b&data.patient.name=Ion&data.status=active
```

### Răspuns API
```json
{
  "success": true,
  "data": [
    {
      "id": "business123-location456",
      "businessId": "business123",
      "locationId": "location456",
      "resourceType": "appointment",
      "resourceId": "appointment789",
      "data": {
        "treatmentName": "Consultation",
        "status": "active",
        "doctor": {
          "id": "33948842-b061-7036-f02f-79b9c0b4225b",
          "name": "Dr. Ion Popescu",
          "email": "doctor@clinic.com"
        },
        "patient": {
          "id": "patient456",
          "name": "Ion Ionescu",
          "email": "patient@email.com"
        }
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Note Tehnice

- **Suport pentru Nested Fields**: `data.object.field` și `data.object.subObject.field`
- **Automatic Match Type**: Exact match pentru ID-uri, partial match pentru nume
- **Compatibilitate Legacy**: Suport pentru `medicId`, `patientName`, `resource_id`
- **Performance**: Optimizat pentru RDS și Citrus
