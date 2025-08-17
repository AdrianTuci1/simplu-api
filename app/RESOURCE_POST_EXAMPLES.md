# Exemple POST Request-uri pentru Resurse

Acest document conține exemple de POST request-uri pentru crearea diferitelor tipuri de resurse folosind HTTPie, bazate pe structura reală din resources-server.

## Structura URL-ului
```
POST /api/resources/{businessId}-{locationId}
Headers: 
  X-Resource-Type: {resourceType}
```

## Structura Request Body
```json
{
  "resourceType": "string",
  "data": {
    // Datele specifice resursei
  }
}
```

## Exemple pentru Resurse Comune

### 1. Creare Client (Dental)
```bash
http POST localhost:3000/api/resources/business123-location456 \
  X-Resource-Type:clients \
  resourceType="clients" \
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

### 2. Creare Staff/Angajat (Dental)
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:staff \
  resourceType="staff" \
  data:='{
    "name": "Maria Ionescu",
    "email": "maria.ionescu@business.com",
    "phone": "+40987654321",
    "birthYear": 1980,
    "gender": "female",
    "specialization": "ortodontie",
    "experience": "10 ani",
    "licenseNumber": "DENT-12345",
    "schedule": {
      "monday": {"start": "09:00", "end": "17:00"},
      "tuesday": {"start": "09:00", "end": "17:00"},
      "wednesday": {"start": "09:00", "end": "17:00"},
      "thursday": {"start": "09:00", "end": "17:00"},
      "friday": {"start": "09:00", "end": "17:00"}
    },
    "status": "active",
    "category": "dentist",
    "tags": ["senior", "specialist"],
    "notes": "Angajat nou - specialist în ortodontie"
  }'
```

### 3. Creare Invoice/Factură
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:invoices \
  resourceType="invoices" \
  data:='{
    "invoiceNumber": "2024-001",
    "clientId": "client-123",
    "staffId": "staff-456",
    "items": [
      {
        "description": "Consultație ortodontie",
        "quantity": 1,
        "unitPrice": 250.00,
        "total": 250.00
      }
    ],
    "subtotal": 250.00,
    "taxRate": 19,
    "taxAmount": 47.50,
    "total": 297.50,
    "currency": "RON",
    "paymentStatus": "pending",
    "paymentTerms": "30 zile",
    "dueDate": "2024-02-15T00:00:00Z",
    "status": "pending",
    "category": "consultation",
    "tags": ["urgent", "payment-due"],
    "notes": "Factură pentru consultație ortodontie"
  }'
```

### 4. Creare Stock Item/Produs
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:stocks \
  resourceType="stocks" \
  data:='{
    "name": "Periuță electrică Oral-B",
    "sku": "ORALB-PRO1000",
    "category": "igienă orală",
    "brand": "Oral-B",
    "model": "Pro 1000",
    "description": "Periuță electrică de înaltă calitate",
    "quantity": 50,
    "minStock": 10,
    "maxStock": 100,
    "unitPrice": 299.99,
    "currency": "RON",
    "supplier": "Dental Supplies Ltd",
    "supplierCode": "DS-ORALB-001",
    "status": "active",
    "tags": ["popular", "in-stock"],
    "notes": "Periuță electrică de înaltă calitate"
  }'
```

## Exemple pentru Resurse Specifice Dental

### 5. Creare Patient/Pacient
```bash
http POST localhost:3001/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:patients \
  resourceType="patients" \
  data:='{
    "name": "Ana Dumitrescu",
    "email": "ana.dumitrescu@email.com",
    "phone": "+40712345678",
    "birthYear": 1990,
    "gender": "female",
    "address": {
      "street": "Bulevardul Unirii",
      "city": "București",
      "state": "București",
      "postalCode": "030000",
      "country": "România"
    },
    "medicalHistory": "Fără probleme majore",
    "allergies": ["penicilină"],
    "emergencyContact": {
      "name": "Mihai Dumitrescu",
      "phone": "+40787654321",
      "relationship": "soț"
    },
    "insurance": {
      "provider": "MedLife",
      "policyNumber": "ML-123456",
      "coveragePercentage": 80
    },
    "status": "active",
    "category": "regular",
    "tags": ["adult", "orthodontics"],
    "notes": "Pacient nou - interesată de ortodontie"
  }'
```

### 6. Creare Appointment/Programare
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:appointments \
  resourceType="appointments" \
  data:='{
    "patientId": "patient-789",
    "staffId": "staff-456",
    "appointmentDate": "2024-01-20T14:00:00Z",
    "duration": 60,
    "appointmentType": "consultation",
    "treatment": "orthodontics",
    "status": "confirmed",
    "category": "consultation",
    "tags": ["orthodontics", "first-visit"],
    "notes": "Prima consultație pentru evaluare ortodontie",
    "reminderSent": false,
    "confirmed": true
  }'
```

## Exemple pentru Resurse Specifice Gym

### 7. Creare Member/Membru
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:members \
  resourceType="members" \
  data:='{
    "name": "Alexandru Vasilescu",
    "email": "alex.vasilescu@email.com",
    "phone": "+40512345678",
    "birthYear": 1985,
    "gender": "male",
    "address": {
      "street": "Strada Sportului",
      "city": "București",
      "state": "București",
      "postalCode": "020000",
      "country": "România"
    },
    "membershipType": "premium",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "monthlyFee": 150.00,
    "currency": "RON",
    "emergencyContact": {
      "name": "Elena Vasilescu",
      "phone": "+40587654321",
      "relationship": "soție"
    },
    "healthInfo": {
      "medicalConditions": [],
      "allergies": [],
      "medications": []
    },
    "status": "active",
    "category": "premium",
    "tags": ["fitness", "cardio"],
    "notes": "Membru nou - abonament premium"
  }'
```

### 8. Creare Class/Curs
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:classes \
  resourceType="classes" \
  data:='{
    "name": "Yoga pentru începători",
    "instructorId": "staff-789",
    "classDate": "2024-01-22T18:00:00Z",
    "duration": 60,
    "maxParticipants": 15,
    "currentParticipants": 8,
    "difficulty": "beginner",
    "room": "Sala 2",
    "description": "Curs de yoga pentru începători",
    "price": 25.00,
    "currency": "RON",
    "recurring": "weekly",
    "status": "active",
    "category": "yoga",
    "tags": ["beginner", "relaxation"],
    "notes": "Curs de yoga pentru începători"
  }'
```

## Exemple pentru Resurse Specifice Hotel

### 9. Creare Guest/Oaspete
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:guests \
  resourceType="guests" \
  data:='{
    "name": "Maria Popescu",
    "email": "maria.popescu@email.com",
    "phone": "+40612345678",
    "birthYear": 1988,
    "gender": "female",
    "address": {
      "street": "Strada Victoriei",
      "city": "Cluj-Napoca",
      "state": "Cluj",
      "postalCode": "400000",
      "country": "România"
    },
    "nationality": "română",
    "passportNumber": "123456789",
    "idCardNumber": "1234567890123",
    "preferences": {
      "roomType": "single",
      "floor": "high",
      "specialRequests": "fără alergie"
    },
    "status": "active",
    "category": "individual",
    "tags": ["business", "vip"],
    "notes": "Oaspete business - preferințe speciale"
  }'
```

### 10. Creare Room/Cameră
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:rooms \
  resourceType="rooms" \
  data:='{
    "roomNumber": "201",
    "floor": 2,
    "type": "deluxe",
    "capacity": 2,
    "amenities": ["tv", "wifi", "ac", "balcony", "sea-view"],
    "size": 35,
    "bedType": "king",
    "pricePerNight": 450.00,
    "currency": "RON",
    "status": "available",
    "category": "deluxe",
    "tags": ["sea-view", "balcony"],
    "notes": "Cameră deluxe cu vedere la mare"
  }'
```

## Exemple pentru Resurse de Sistem

### 11. Creare Activity/Activitate
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:activities \
  resourceType="activities" \
  operation="create" \
  data:='{
    "userId": "user-123",
    "type": "login",
    "action": "user_login",
    "resourceType": "users",
    "resourceId": "user-123",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "details": {
      "loginMethod": "email",
      "success": true
    },
    "status": "success",
    "category": "authentication",
    "tags": ["login", "user"],
    "notes": "Login reușit pentru utilizator"
  }'
```

### 12. Creare Report/Raport
```bash
http POST localhost:3000/resources/business123-location456 \
  X-Business-ID:business123 \
  X-Location-ID:location456 \
  X-Resource-Type:reports \
  resourceType="reports" \
  operation="create" \
  data:='{
    "reportType": "monthly",
    "period": "2024-01",
    "generatedBy": "system",
    "format": "pdf",
    "sections": ["financial", "activity", "performance"],
    "data": {
      "totalRevenue": 15000.00,
      "totalAppointments": 120,
      "newClients": 25
    },
    "status": "completed",
    "category": "monthly",
    "tags": ["monthly", "financial"],
    "notes": "Raport automat generat pentru luna ianuarie"
  }'
```

## Headers Obligatorii

Pentru toate request-urile, asigură-te că incluzi toate header-urile obligatorii:

```bash
X-Business-ID: {businessId}
X-Location-ID: {locationId}
X-Resource-Type: {resourceType}
```

## Structura Response

Toate request-urile returnează un răspuns în formatul:

```json
{
  "success": true,
  "message": "Resource created successfully",
  "data": {
    "id": "business123-location456-resourceId",
    "businessType": "dental",
    "resourceName": "clients",
    "resourceId": "generated-resource-id",
    "data": { /* datele resursei */ },
    "date": "2024-01-15T10:30:00Z",
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Validări și Constrainte

- `resourceType`: obligatoriu, trebuie să fie valid pentru business type
- `operation`: opțional, default "create"
- `data`: obligatoriu, obiect JSON cu datele specifice resursei
- Headers: toate obligatorii și trebuie să se potrivească cu parametrii din URL

## Testare cu HTTPie

```bash
# Instalare HTTPie
pip install httpie

# Testare simplă
http POST localhost:3000/resources/test-business-test-location \
  X-Business-ID:test-business \
  X-Location-ID:test-location \
  X-Resource-Type:clients \
  resourceType="clients" \
  operation="create" \
  data:='{
    "name": "Test Client",
    "email": "test@example.com",
    "phone": "+40123456789"
  }'
```
