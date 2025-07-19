# Postman API Collection - Resources API

Această colecție Postman conține toate operațiile disponibile pentru API-ul de resurse unificate. API-ul suportă 3 tipuri de business-uri: **Dental**, **Gym**, și **Hotel**, plus resurse comune.

## 📋 Configurare Inițială

### Environment Variables
Creează un environment în Postman cu următoarele variabile:

```json
{
  "base_url": "https://api.example.com",
  "business_id": "dental-clinic-123",
  "location_id": "location-456",
  "auth_token": "your-jwt-token-here"
}
```

### Headers Globale
Setează următoarele headers pentru toate request-urile:

```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
```

---

## 🔐 1. AUTENTIFICARE

### 1.1 Login
```http
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 1.2 Refresh Token
```http
POST {{base_url}}/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refresh_token}}"
}
```

### 1.3 Get Current User
```http
GET {{base_url}}/api/auth/me
Authorization: Bearer {{auth_token}}
X-Tenant-ID: {{business_id}}
X-Location-ID: {{location_id}}
```

### 1.4 Logout
```http
POST {{base_url}}/api/auth/logout
Authorization: Bearer {{auth_token}}
```

---

## 🏢 2. BUSINESS INFO

### 2.1 Get Business Info
```http
GET {{base_url}}/api/businessInfo/{{business_id}}
X-Tenant-ID: {{business_id}}
```

---

## 🦷 3. DENTAL BUSINESS RESOURCES

### 3.1 Timeline (Appointments)

#### Get Timeline
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=timeline&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&dentistId=dentist-123&status=scheduled
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
```

#### Create Appointment
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "patientId": "patient-123",
    "dentistId": "dentist-456",
    "treatmentId": "treatment-789",
    "appointmentDate": "2024-01-15T10:00:00Z",
    "duration": 60,
    "status": "scheduled",
    "notes": "Regular checkup",
    "cost": 150.00,
    "insuranceCovered": true
  }
}
```

#### Update Appointment
```http
PUT {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
Content-Type: application/json

{
  "operation": "update",
  "data": {
    "id": "appointment-123",
    "patientId": "patient-123",
    "dentistId": "dentist-456",
    "treatmentId": "treatment-789",
    "appointmentDate": "2024-01-15T10:30:00Z",
    "duration": 90,
    "status": "confirmed",
    "notes": "Updated appointment time"
  }
}
```

#### Patch Appointment Status
```http
PATCH {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
Content-Type: application/json

{
  "operation": "patch",
  "data": {
    "id": "appointment-123",
    "status": "completed",
    "notes": "Appointment completed successfully"
  }
}
```

#### Delete Appointment
```http
DELETE {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
X-Resource-ID: appointment-123
```

### 3.2 Clients (Patients)

#### Get Patients
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=clients&page=1&limit=20&search=john&status=active&lastVisit=2024-01-01
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: clients
```

#### Create Patient
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: clients
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-05-15",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zipCode": "62701",
      "country": "USA"
    },
    "medicalHistory": "No known allergies",
    "allergies": [],
    "insuranceInfo": {
      "provider": "Blue Cross",
      "policyNumber": "BC123456",
      "groupNumber": "GRP789"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+1234567891",
      "relationship": "spouse"
    },
    "status": "active"
  }
}
```

#### Update Patient
```http
PUT {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: clients
Content-Type: application/json

{
  "operation": "update",
  "data": {
    "id": "patient-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe.updated@email.com",
    "phone": "+1234567890",
    "status": "active",
    "notes": "Updated contact information"
  }
}
```

### 3.3 Services (Treatments)

#### Get Services
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=services&category=cleaning&active=true
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: services
```

#### Create Service
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: services
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Dental Cleaning",
    "description": "Professional dental cleaning and examination",
    "duration": 60,
    "cost": 120.00,
    "category": "cleaning",
    "requiresAnesthesia": false,
    "followUpRequired": false,
    "active": true
  }
}
```

### 3.4 Staff

#### Get Staff
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=staff&role=dentist&status=active
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: staff
```

#### Create Staff Member
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: staff
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "firstName": "Dr. Sarah",
    "lastName": "Smith",
    "email": "dr.smith@clinic.com",
    "phone": "+1234567892",
    "role": "dentist",
    "licenseNumber": "DDS123456",
    "specializations": ["orthodontics", "cosmetic"],
    "workingHours": {
      "monday": { "start": "09:00", "end": "17:00", "available": true },
      "tuesday": { "start": "09:00", "end": "17:00", "available": true },
      "wednesday": { "start": "09:00", "end": "17:00", "available": true },
      "thursday": { "start": "09:00", "end": "17:00", "available": true },
      "friday": { "start": "09:00", "end": "15:00", "available": true },
      "saturday": { "start": "09:00", "end": "12:00", "available": false },
      "sunday": { "start": "00:00", "end": "00:00", "available": false }
    },
    "status": "active"
  }
}
```

---

## 🏋️ 4. GYM BUSINESS RESOURCES

### 4.1 Timeline (Classes & Training)

#### Get Timeline
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=timeline&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&classId=class-123&trainerId=trainer-456
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
```

#### Create Training Session
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "memberId": "member-123",
    "classId": "class-456",
    "trainerId": "trainer-789",
    "startTime": "2024-01-15T10:00:00Z",
    "duration": 60,
    "type": "personal-training",
    "serviceName": "Personal Training Session",
    "status": "scheduled"
  }
}
```

### 4.2 Members

#### Get Members
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=members&page=1&limit=20&search=jane&membershipStatus=active&membershipType=premium
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: members
```

#### Create Member
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: members
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@email.com",
    "phone": "+1234567893",
    "membershipType": "premium",
    "membershipStart": "2024-01-01",
    "membershipEnd": "2024-12-31",
    "status": "active",
    "healthConditions": [],
    "fitnessGoals": ["weight_loss", "muscle_gain"],
    "emergencyContact": {
      "name": "John Smith",
      "phone": "+1234567894",
      "relationship": "spouse"
    }
  }
}
```

### 4.3 Packages (Memberships)

#### Get Packages
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=packages&active=true&category=membership
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: packages
```

#### Create Package
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: packages
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Premium Membership",
    "description": "Full access to all gym facilities and classes",
    "price": 99.99,
    "duration": 30,
    "features": ["All equipment access", "Group classes", "Personal trainer consultation"],
    "accessHours": {
      "start": "05:00",
      "end": "23:00",
      "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    },
    "maxFreezeDays": 14,
    "contractType": "monthly",
    "active": true
  }
}
```

### 4.4 Classes

#### Get Classes
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=classes&category=yoga&difficultyLevel=beginner&status=scheduled
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: classes
```

#### Create Class
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: classes
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Morning Yoga",
    "description": "Relaxing yoga session to start your day",
    "instructorId": "instructor-123",
    "date": "2024-01-15T07:00:00Z",
    "duration": 60,
    "maxCapacity": 20,
    "currentEnrollment": 0,
    "category": "yoga",
    "difficultyLevel": "beginner",
    "equipment": ["yoga mat", "blocks"],
    "status": "scheduled",
    "cost": 25.00
  }
}
```

### 4.5 Equipment

#### Get Equipment
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=equipment&category=cardio&status=active
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: equipment
```

#### Create Equipment
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: equipment
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Treadmill Pro X1",
    "category": "cardio",
    "manufacturer": "FitnessTech",
    "model": "ProX1-2024",
    "serialNumber": "FT123456789",
    "purchaseDate": "2024-01-01",
    "warrantyExpiry": "2026-01-01",
    "maintenanceSchedule": {
      "frequency": "monthly",
      "lastMaintenance": "2024-01-01",
      "nextMaintenance": "2024-02-01"
    },
    "status": "active",
    "purchaseCost": 2500.00,
    "location": "Cardio Area - Row 1"
  }
}
```

---

## 🏨 5. HOTEL BUSINESS RESOURCES

### 5.1 Timeline (Reservations)

#### Get Timeline
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=timeline&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&roomId=room-123&status=confirmed
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
```

#### Create Reservation
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: timeline
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "guestId": "guest-123",
    "roomId": "room-456",
    "checkInDate": "2024-01-15T14:00:00Z",
    "checkOutDate": "2024-01-17T11:00:00Z",
    "numberOfGuests": 2,
    "numberOfNights": 2,
    "roomRate": 150.00,
    "totalAmount": 300.00,
    "status": "confirmed",
    "paymentStatus": "pending",
    "specialRequests": ["Late check-in", "Extra towels"],
    "source": "direct",
    "confirmationNumber": "HTL123456"
  }
}
```

### 5.2 Clients (Guests)

#### Get Guests
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=clients&page=1&limit=20&search=mike&loyaltyStatus=gold&lastStay=2024-01-01
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: clients
```

#### Create Guest
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: clients
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "firstName": "Mike",
    "lastName": "Johnson",
    "email": "mike.johnson@email.com",
    "phone": "+1234567895",
    "nationality": "American",
    "address": {
      "street": "456 Oak Ave",
      "city": "Chicago",
      "state": "IL",
      "zipCode": "60601",
      "country": "USA"
    },
    "idDocument": {
      "type": "passport",
      "number": "AB123456",
      "expiryDate": "2030-12-31"
    },
    "loyaltyProgram": {
      "number": "LP789012",
      "tier": "gold",
      "points": 2500
    },
    "preferences": {
      "roomType": "suite",
      "bedType": "king",
      "floor": "high",
      "smoking": false,
      "diet": ["vegetarian"],
      "specialRequests": ["Ocean view", "Late checkout"]
    },
    "status": "active"
  }
}
```

### 5.3 Rooms

#### Get Rooms
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=rooms&status=available&type=suite&floor=5
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: rooms
```

#### Create Room
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: rooms
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "roomNumber": "501",
    "roomType": "suite",
    "floor": 5,
    "capacity": 4,
    "bedType": "king",
    "amenities": ["wifi", "tv", "ac", "minibar", "balcony", "ocean_view"],
    "baseRate": 250.00,
    "status": "available"
  }
}
```

### 5.4 Services

#### Get Services
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=services&category=spa&active=true
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: services
```

#### Create Service
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: services
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Room Service",
    "description": "24/7 room service for all your dining needs",
    "category": "room-service",
    "price": 5.00,
    "duration": 30,
    "availability": {
      "start": "00:00",
      "end": "23:59",
      "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    },
    "active": true
  }
}
```

---

## 📦 6. RESURSE COMUNE

### 6.1 Stocks/Inventory

#### Get Stocks
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=stocks&page=1&limit=20&search=supplies&category=medical&lowStock=true
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: stocks
```

#### Create Stock Item
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: stocks
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "Dental Gloves",
    "description": "Latex-free disposable gloves",
    "category": "medical_supplies",
    "sku": "DG-001",
    "quantity": 500,
    "minQuantity": 50,
    "maxQuantity": 1000,
    "unit": "pieces",
    "cost": 0.25,
    "price": 0.50,
    "supplier": "MedSupply Co",
    "expiryDate": "2025-12-31",
    "batchNumber": "BATCH2024001",
    "location": "Storage Room A",
    "active": true
  }
}
```

### 6.2 Invoices

#### Get Invoices
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=invoices&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&status=pending&customerId=customer-123
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: invoices
```

#### Create Invoice
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: invoices
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "customerId": "patient-123",
    "customerType": "patient",
    "invoiceNumber": "INV-2024-001",
    "issueDate": "2024-01-15",
    "dueDate": "2024-02-15",
    "items": [
      {
        "description": "Dental Cleaning",
        "quantity": 1,
        "unitPrice": 120.00,
        "total": 120.00,
        "taxRate": 0.08
      },
      {
        "description": "X-Ray",
        "quantity": 2,
        "unitPrice": 50.00,
        "total": 100.00,
        "taxRate": 0.08
      }
    ],
    "subtotal": 220.00,
    "tax": 17.60,
    "discount": 0.00,
    "total": 237.60,
    "status": "sent",
    "notes": "Payment due within 30 days"
  }
}
```

### 6.3 Activities/History

#### Get Activities
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=activities&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&type=create&userId=user-123
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: activities
```

#### Create Activity Log
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: activities
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "userId": "user-123",
    "type": "create",
    "action": "create_patient",
    "resourceType": "clients",
    "resourceId": "patient-456",
    "details": {
      "patientName": "John Doe",
      "createdFields": ["firstName", "lastName", "email", "phone"]
    },
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "timestamp": "2024-01-15T10:00:00Z",
    "status": "success"
  }
}
```

### 6.4 Reports

#### Get Reports
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=reports&page=1&limit=20&type=monthly&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: reports
```

#### Generate Report
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: reports
Content-Type: application/json

{
  "operation": "generate",
  "data": {
    "name": "Monthly Revenue Report",
    "type": "monthly",
    "description": "Monthly revenue analysis for January 2024",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "metrics": ["revenue", "appointments", "new_patients", "treatments"],
    "filters": {
      "includeInsurance": true,
      "includeCancelled": false
    },
    "format": "pdf",
    "generatedBy": "user-123"
  }
}
```

### 6.5 Roles

#### Get Roles
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=roles&active=true&businessTypeSpecific=true
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: roles
```

#### Create Role
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: roles
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "name": "dental_assistant",
    "displayName": "Dental Assistant",
    "description": "Assists dentists with patient care and administrative tasks",
    "hierarchy": 60,
    "permissions": [
      {
        "resourceName": "clients",
        "operations": ["read", "update", "list"]
      },
      {
        "resourceName": "timeline",
        "operations": ["read", "create", "update", "list"]
      },
      {
        "resourceName": "stocks",
        "operations": ["read", "list"]
      }
    ],
    "active": true,
    "businessTypeSpecific": true,
    "isSystemRole": false,
    "createdBy": "admin-123"
  }
}
```

### 6.6 Sales Transactions

#### Get Sales
```http
GET {{base_url}}/api/resources/{{business_id}}-{{location_id}}?resourceType=sales&page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&status=completed&paymentMethod=card
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: sales
```

#### Create Sale
```http
POST {{base_url}}/api/resources/{{business_id}}-{{location_id}}
Authorization: Bearer {{auth_token}}
X-Business-ID: {{business_id}}
X-Location-ID: {{location_id}}
X-Resource-Type: sales
Content-Type: application/json

{
  "operation": "create",
  "data": {
    "customerId": "patient-123",
    "customerName": "John Doe",
    "items": [
      {
        "description": "Dental Cleaning",
        "quantity": 1,
        "unitPrice": 120.00,
        "total": 120.00
      },
      {
        "description": "Fluoride Treatment",
        "quantity": 1,
        "unitPrice": 50.00,
        "total": 50.00
      }
    ],
    "subtotal": 170.00,
    "tax": 13.60,
    "discount": 10.00,
    "total": 173.60,
    "paymentMethod": "card",
    "status": "completed",
    "transactionDate": "2024-01-15T14:30:00Z",
    "receiptNumber": "RCP-2024-001",
    "notes": "Insurance covered 80%",
    "processedBy": "staff-456"
  }
}
```

---

## 🔧 7. UTILITY ENDPOINTS

### 7.1 Health Check
```http
GET {{base_url}}/api/health
```

### 7.2 Test Endpoints

#### Test Health
```http
GET {{base_url}}/api/test/health
```

#### Test Business
```http
GET {{base_url}}/api/test/business/{{business_id}}
```

#### Test Resource
```http
POST {{base_url}}/api/test/resource
Content-Type: application/json

{
  "businessType": "dental",
  "resourceType": "clients",
  "operation": "validate"
}
```

---

## 📊 8. MONITORING ENDPOINTS

### 8.1 Request Metrics
```http
GET {{base_url}}/api/metrics/requests
Authorization: Bearer {{auth_token}}
```

### 8.2 Error Metrics
```http
GET {{base_url}}/api/metrics/errors
Authorization: Bearer {{auth_token}}
```

### 8.3 Performance Metrics
```http
GET {{base_url}}/api/metrics/performance
Authorization: Bearer {{auth_token}}
```

---

## 🔔 9. WEBHOOKS (Optional)

### 9.1 Resource Created Webhook
```http
POST {{base_url}}/api/webhooks/resource-created
Content-Type: application/json

{
  "event": "resource.created",
  "data": {
    "resourceType": "clients",
    "resourceId": "patient-123",
    "businessId": "{{business_id}}",
    "locationId": "{{location_id}}",
    "changes": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@email.com"
    }
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "signature": "sha256=abc123def456"
}
```

---

## 📝 10. RESPONSE EXAMPLES

### Success Response (GET)
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
        "status": "active",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
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
      "status": "active"
    }
  },
  "meta": {
    "businessId": "dental-clinic-123",
    "locationId": "location-456",
    "resourceType": "clients",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Success Response (POST/PUT/PATCH)
```json
{
  "success": true,
  "data": {
    "id": "patient-124",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@email.com",
    "phone": "+1234567891",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "businessId": "dental-clinic-123",
    "locationId": "location-456",
    "resourceType": "clients",
    "operation": "create",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response
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
    "businessId": "dental-clinic-123",
    "locationId": "location-456",
    "resourceType": "clients",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🚀 11. QUICK START GUIDE

### Step 1: Setup Environment
1. Import această colecție în Postman
2. Creează un environment cu variabilele necesare
3. Setează headers-urile globale

### Step 2: Authenticate
1. Rulează request-ul de login
2. Copiază token-ul din răspuns
3. Actualizează variabila `auth_token`

### Step 3: Test Basic Operations
1. Testează GET pentru a obține resurse
2. Testează POST pentru a crea resurse noi
3. Testează PUT/PATCH pentru actualizări
4. Testează DELETE pentru ștergere

### Step 4: Explore Business-Specific Resources
1. Testează resursele specifice pentru dental
2. Testează resursele specifice pentru gym
3. Testează resursele specifice pentru hotel
4. Testează resursele comune

---

## 📚 12. NOTES & TIPS

### Headers Important
- Toate request-urile necesită `Authorization: Bearer {token}`
- Headers-urile `X-Business-ID`, `X-Location-ID`, și `X-Resource-Type` sunt obligatorii
- Verifică că valorile din URL match cu cele din headers

### Error Handling
- Verifică întotdeauna răspunsul pentru `success: false`
- Citește `error.details` pentru informații specifice
- Rate limiting: respectă limitele de 1000 GET/min, 100 POST/min

### Best Practices
- Folosește paginarea pentru liste mari (`page` și `limit`)
- Filtrează rezultatele cu parametrii de query
- Salvează token-urile și refolosește-le
- Testează cu date mock înainte de producție

---

**Versiune**: 1.0.0  
**Ultima actualizare**: Ianuarie 2024  
**Compatibilitate**: Postman 10+, API v1