# Resource Models Documentation

Acest director conține toate modelele de date pentru sistemul de resurse unificate. Sistemul suportă trei tipuri de business-uri: **Dental**, **Gym**, și **Hotel**, fiecare cu resursele sale specifice, plus resurse comune disponibile pentru toate tipurile de business.

## 📁 Structura Fișierelor (Nouă Organizare)

```
models/
├── README.md                    # Această documentație
├── index.ts                     # Export centralizat pentru toate modelele
│
├── common/                      # 📂 Modele comune pentru toate business-urile
│   ├── index.ts                 # Export pentru modele comune
│   ├── shared-interfaces.ts     # Interfețe de bază (AddressData, EmergencyContactData)
│   ├── stock-models.ts          # Modele pentru stocuri și inventar
│   ├── invoice-models.ts        # Modele pentru facturi și plăți
│   ├── activity-models.ts       # Modele pentru activități și istoric
│   ├── report-models.ts         # Modele pentru rapoarte și analize
│   ├── role-models.ts           # Modele pentru roluri și permisiuni
│   ├── sales-models.ts          # Modele pentru tranzacții de vânzare
│   ├── workflow-models.ts       # Modele pentru workflow-uri
│   ├── permission-models.ts     # Modele pentru managementul permisiunilor
│   └── user-models.ts           # Modele pentru conturi utilizatori
│
├── dental/                      # 🦷 Modele specifice business-ului dental
│   ├── index.ts                 # Export pentru modele dentale
│   ├── dental-patient-models.ts # Date pacienți și informații medicale
│   ├── dental-appointment-models.ts # Programări și management
│   ├── dental-treatment-models.ts   # Definiții tratamente și servicii
│   ├── dental-staff-models.ts   # Informații personal și practicieni
│   └── dental-timeline-models.ts    # Vizualizări calendar și timeline
│
├── gym/                         # 💪 Modele specifice business-ului gym
│   ├── index.ts                 # Export pentru modele gym
│   ├── gym-member-models.ts     # Profile membri și informații
│   ├── gym-membership-models.ts # Pachete și planuri de abonament
│   ├── gym-class-models.ts      # Programare și management clase
│   ├── gym-equipment-models.ts  # Tracking echipamente și mentenanță
│   └── gym-timeline-models.ts   # Programe clase și sesiuni antrenament
│
├── hotel/                       # 🏨 Modele specifice business-ului hotel
│   ├── index.ts                 # Export pentru modele hotel
│   ├── hotel-guest-models.ts    # Profile oaspeți și preferințe
│   ├── hotel-reservation-models.ts # Management rezervări și booking
│   ├── hotel-room-models.ts     # Inventar camere și status
│   ├── hotel-service-models.ts  # Servicii hoteliere și amenități
│   └── hotel-timeline-models.ts # Calendar rezervări și evenimente
│
├── resource-types.ts            # Definițiile tipurilor de resurse și business
├── business-types.ts            # BaseResource interface (legacy compatibility)
├── unified-data-types.ts        # Tipuri unificate și helper functions
├── common-models.ts            # Modele comune (DEPRECATED - folosește /common/)
├── dental-models.ts            # Modele dentale (DEPRECATED - folosește /dental/)
├── gym-models.ts               # Modele gym (DEPRECATED - folosește /gym/)
└── hotel-models.ts             # Modele hotel (DEPRECATED - folosește /hotel/)
```

## 🏢 Tipuri de Business

### Dental (`dental`)
- **Timeline**: Programări și consultații dentale
- **Clients**: Pacienți cu istoric medical
- **Services**: Tratamente și proceduri dentale
- **Staff**: Personal medical (dentist, igienist, asistent, etc.)

### Gym (`gym`)
- **Timeline**: Clase și antrenamente personale
- **Members**: Membri cu abonamente și obiective fitness
- **Packages**: Tipuri de abonamente și pachete
- **Classes**: Clase de grup (cardio, yoga, pilates, etc.)
- **Equipment**: Echipamente și mentenanță

### Hotel (`hotel`)
- **Timeline**: Rezervări și evenimente
- **Clients**: Oaspeți cu preferințe și istoric
- **Rooms**: Camere cu amenități și status
- **Services**: Servicii hoteliere (room service, spa, etc.)

## 📋 Resurse Comune

Aceste resurse sunt disponibile pentru toate tipurile de business:

- **`stocks`** - Inventar și stocuri
- **`invoices`** - Facturi și plăți
- **`activities`** - Jurnal de activități și audit
- **`reports`** - Rapoarte și analize
- **`roles`** - Roluri și permisiuni
- **`sales`** - Tranzacții de vânzare

## 🚀 Utilizare Rapidă

### Import Basic (Nouă Organizare)
```typescript
// Import modele specifice business-ului
import { DentalPatientData, DentalAppointmentData } from './models/dental';
import { GymMemberData, GymClassData } from './models/gym';
import { HotelGuestData, HotelReservationData } from './models/hotel';

// Import modele comune
import { StockItemData, InvoiceData, ActivityData } from './models/common';

// Import interfețe partajate
import { AddressData, EmergencyContactData } from './models/common/shared-interfaces';

// Import tipuri și helper functions
import { 
  BusinessType, 
  ResourceType,
  isValidResourceForBusiness 
} from './models';
```

### Import Legacy (Încă Suportat)
```typescript
import { 
  BusinessType, 
  ResourceType,
  DentalPatientData,
  GymMemberData,
  HotelGuestData,
  StockItemData,
  isValidResourceForBusiness 
} from './models';
```

### Validare Resurse
```typescript
// Verifică dacă un tip de resursă este valid pentru un business
const isValid = isValidResourceForBusiness('dental', 'clients'); // true
const isInvalid = isValidResourceForBusiness('dental', 'members'); // false
```

### Creare Date Tipizate
```typescript
// Pacient dental
const patient: DentalPatientData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  status: 'active'
};

// Membru gym
const member: GymMemberData = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '+1234567891',
  membershipType: 'premium',
  membershipStart: '2024-01-01',
  membershipEnd: '2024-12-31',
  status: 'active'
};
```

## 🔧 Helper Functions

### Validare Request
```typescript
import { validateResourceRequest } from './models';

const validation = validateResourceRequest('dental', 'clients');
if (!validation.isValid) {
  throw new Error(validation.error);
}
```

### Controller Helper
```typescript
import { ResourceControllerHelper } from './models';

// Validare consistență headers
const headerValidation = ResourceControllerHelper.validateRequest(
  businessId,
  locationId,
  resourceType,
  headers
);

// Generare ID resurse
const resourceId = ResourceControllerHelper.createResourceId('clients');
```

## 📊 Exemple de Modele

### Dental Patient
```typescript
interface DentalPatientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: AddressData;
  medicalHistory?: string;
  allergies?: string[];
  insuranceInfo?: InsuranceInfoData;
  emergencyContact?: EmergencyContactData;
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
}
```

### Gym Member
```typescript
interface GymMemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: AddressData;
  membershipType: 'basic' | 'premium' | 'vip' | 'student' | 'senior';
  membershipStart: string;
  membershipEnd: string;
  status: 'active' | 'suspended' | 'expired' | 'cancelled';
  healthConditions?: string[];
  fitnessGoals?: string[];
  emergencyContact?: EmergencyContactData;
  notes?: string;
  preferredTrainerId?: string;
}
```

### Hotel Guest
```typescript
interface HotelGuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  address: AddressData;
  idDocument: IdDocumentData;
  loyaltyProgram?: LoyaltyProgramData;
  preferences?: GuestPreferencesData;
  notes?: string;
  status: 'active' | 'vip' | 'blacklisted';
}
```

### Stock Item (Common)
```typescript
interface StockItemData {
  name: string;
  description?: string;
  category: string;
  sku?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unit: string;
  cost: number;
  price: number;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  location?: string;
  active: boolean;
}
```

## 🔒 Type Safety

Sistemul oferă type safety complet prin:

### Type Guards
```typescript
import { isDentalPatientData, isGymMemberData } from './models';

if (isDentalPatientData(data)) {
  // TypeScript știe că data este DentalPatientData
  console.log(data.medicalHistory);
}
```

### Typed Resource Creation
```typescript
import { createTypedResource } from './models';

const resource = createTypedResource(
  'dental',
  'clients',
  patientData,
  'business-123',
  'location-456'
);
```

### Business-Resource Mapping
```typescript
import { BusinessResourceDataMap, GetResourceDataType } from './models';

// Obține tipul corect de date pentru o combinație business-resursă
type DentalClientData = GetResourceDataType<'dental', 'clients'>; // DentalPatientData
type GymMemberData = GetResourceDataType<'gym', 'members'>; // GymMemberData
```

## 🛡️ Validare și Securitate

### Request Validation
```typescript
import { validateResourceRequestDetailed } from './models';

const validation = validateResourceRequestDetailed('dental', 'clients', requestData);

if (!validation.isValid) {
  return {
    success: false,
    errors: validation.errors,
    warnings: validation.warnings
  };
}
```

### Permission Checking
```typescript
// Verifică dacă resursa este validă pentru business
const isValidResource = isValidResourceForBusiness(businessType, resourceType);

// Obține tipul de date așteptat
const expectedDataType = getResourceDataType(businessType, resourceType);
```

## 📈 Extensibilitate

### Adăugare Business Nou
1. Adaugă noul tip în `BusinessType` din `resource-types.ts`
2. Creează fișierul de modele (ex: `restaurant-models.ts`)
3. Adaugă tipurile de resurse în `ResourceType` unions
4. Actualizează `BusinessResourceDataMap` în `unified-data-types.ts`

### Adăugare Resursă Nouă
1. Adaugă resursa în tipul corespunzător din `resource-types.ts`
2. Creează modelul de date în fișierul corespunzător
3. Actualizează `BusinessResourceDataMap` dacă este necesar
4. Adaugă validări și exemple în `usage-examples.ts`

## 🧪 Testing

### Unit Tests
```typescript
import { validateResourceRequest, createDentalPatient } from './models';

describe('Resource Models', () => {
  it('should validate dental client resource', () => {
    const result = validateResourceRequest('dental', 'clients');
    expect(result.isValid).toBe(true);
  });

  it('should create valid dental patient', () => {
    const patient = createDentalPatient();
    expect(patient.status).toBe('active');
    expect(patient.firstName).toBeDefined();
  });
});
```

## 📝 Best Practices

1. **Folosește Type Guards**: Întotdeauna validează tipurile la runtime
2. **Validare Completă**: Folosește helper functions pentru validare
3. **Consistență Headers**: Verifică că URL params match headers
4. **Error Handling**: Oferă mesaje de eroare detaliate
5. **Documentation**: Documentează toate modelele cu JSDoc

## 🔄 Migration Guide

Dacă migrezi de la sistemul vechi:

1. **BaseResource** rămâne compatibil
2. **Business Types** - elimină 'sales' ca business type
3. **Resource Types** - folosește noile tipuri unificate
4. **Data Models** - înlocuiește interfețele vechi cu clasele noi

## 📞 Support

Pentru întrebări sau probleme:
1. Verifică exemplele din `usage-examples.ts`
2. Consultă documentația TypeScript pentru type safety
3. Testează cu helper functions înainte de implementare

---

**Versiune**: 1.0.0  
**Ultima actualizare**: Ianuarie 2024  
**Compatibilitate**: TypeScript 4.5+, NestJS 9+