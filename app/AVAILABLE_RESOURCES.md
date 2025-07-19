# Available Resources

## Business Types
- `dental` - Dental clinics
- `gym` - Fitness centers  
- `hotel` - Hotels

## Universal Resources (Available for All Business Types)

### Core Business Resources (Business-Specific Models)
- `timeline` - Scheduling and appointments
  - **Dental**: Appointments with dentists and treatments
  - **Gym**: Classes and personal training sessions  
  - **Hotel**: Reservations and hotel events

- `clients` - Customers/patients/guests
  - **Dental**: Patients with medical history (`DentalPatientData`)
  - **Gym**: Members with fitness goals (`GymMemberData`)
  - **Hotel**: Guests with preferences and loyalty info (`HotelGuestData`)

- `staff` - Employees and professionals
  - **Dental**: Medical professionals - dentist, hygienist, assistant (`DentalStaffData`)
  - **Gym**: Fitness professionals - trainer, instructor (`GymStaffData`)
  - **Hotel**: Hotel professionals - concierge, housekeeping (`HotelStaffData`)

- `services` - Business services and offerings
  - **Dental**: Medical treatments and procedures (`DentalTreatmentData`)
  - **Gym**: Fitness services and training (`GymServiceData`)
  - **Hotel**: Hotel amenities and services (`HotelServiceData`)

### Common Operational Resources (Same Model for All)
- `stocks` - Inventory and stock management
- `invoices` - Billing and financial records
- `activities` - Activity logs and audit trails
- `reports` - Business analytics and reports
- `roles` - User roles and permissions
- `sales` - Sales transactions and records

## Business-Specific Resources

### 🏋️ Gym Business Only
- `packages` - Membership plans and pricing (`GymMembershipData`)
- `classes` - Group fitness classes (`GymClassData`)
- `equipment` - Gym equipment and maintenance (`GymEquipmentData`)

### 🏨 Hotel Business Only
- `rooms` - Room inventory and availability (`HotelRoomData`)

### 🦷 Dental Business
- No exclusive resources (uses universal resources with dental-specific models)

## Resource Mapping

| Resource | Dental | Gym | Hotel | Model Type |
|----------|--------|-----|-------|------------|
| `timeline` | ✅ | ✅ | ✅ | Business-specific |
| `clients` | ✅ | ✅ | ✅ | Business-specific |
| `staff` | ✅ | ✅ | ✅ | Business-specific |
| `services` | ✅ | ✅ | ✅ | Business-specific |
| `packages` | ❌ | ✅ | ❌ | Gym-specific |
| `classes` | ❌ | ✅ | ❌ | Gym-specific |
| `equipment` | ❌ | ✅ | ❌ | Gym-specific |
| `rooms` | ❌ | ❌ | ✅ | Hotel-specific |
| `stocks` | ✅ | ✅ | ✅ | Common |
| `invoices` | ✅ | ✅ | ✅ | Common |
| `activities` | ✅ | ✅ | ✅ | Common |
| `reports` | ✅ | ✅ | ✅ | Common |
| `roles` | ✅ | ✅ | ✅ | Common |
| `sales` | ✅ | ✅ | ✅ | Common |

## Total Resources Available
- **Dental**: 10 resources (4 universal + 6 common)
- **Gym**: 13 resources (4 universal + 3 specific + 6 common)
- **Hotel**: 11 resources (4 universal + 1 specific + 6 common)

## Key Points
- `clients` and `staff` are available for all business types but use different data models
- `timeline` and `services` are also universal but with business-specific implementations
- Only `stocks`, `invoices`, `activities`, `reports`, `roles`, and `sales` use the same model across all business types
- Gym has the most business-specific resources (packages, classes, equipment)
- Hotel has one unique resource (rooms)
- Dental relies entirely on universal resources with dental-specific models