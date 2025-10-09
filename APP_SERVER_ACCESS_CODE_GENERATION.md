# App Server - Access Code Generation Integration

## Overview

Acest document descrie cum să integrezi generarea codului de acces în `app` server înainte de a trimite datele la `ai-agent-server`.

## Changes Required

### 1. În `patient-booking.service.ts` (Metoda `reserve`)

**Locație:** Linia ~400, în metoda `sendAutomatedMessages`

**Înainte:**
```typescript
await this.sendAutomatedMessages(businessId, locationId, {
  patientName: patientName,
  patientPhone: customer.phone,
  patientEmail: customer.email,
  appointmentDate: this.formatDate(date),
  appointmentTime: time,
  businessName: '', // Will be populated from business info
  locationName: '', // Will be populated from location info
  serviceName: service?.data?.name || 'Service',
  doctorName: medicName,
  phoneNumber: '' // Will be populated from business info
});
```

**După:**
```typescript
// Import PatientAccessService în constructor
constructor(
  @InjectRepository(ResourceEntity)
  private readonly resourceRepo: Repository<ResourceEntity>,
  private readonly businessInfoService: BusinessInfoService,
  private readonly kinesisService: KinesisService,
  private readonly messageAutomationService: MessageAutomationService,
  private readonly externalApiConfigService: ExternalApiConfigService,
  private readonly patientAccessService: PatientAccessService, // ADDED
) {}

// În metoda sendAutomatedMessages
const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
const locationInfo = await this.businessInfoService.getLocationInfo(businessId, locationId);

// Generate access code and patient URL
const accessCode = this.patientAccessService.generateAccessCode(patientId, appointmentId);
const patientUrl = businessInfo?.domainLabel && locationInfo?.name
  ? this.patientAccessService.generatePatientUrl(
      businessInfo.domainLabel,
      locationInfo.name,
      patientId
    )
  : '';

await this.sendAutomatedMessages(businessId, locationId, {
  patientName: patientName,
  patientPhone: customer.phone,
  patientEmail: customer.email,
  patientId: patientId, // Include patient ID
  appointmentId: appointmentId, // Include appointment ID
  appointmentDate: this.formatDate(date),
  appointmentTime: time,
  businessName: '', // Will be populated from business info
  locationName: '', // Will be populated from location info
  serviceName: service?.data?.name || 'Service',
  doctorName: medicName,
  phoneNumber: '', // Will be populated from business info
  accessCode: accessCode, // Pre-generated access code
  patientUrl: patientUrl // Pre-generated patient URL
});
```

### 2. În `resources.service.ts` (Similar pentru metoda `sendAutomatedMessages`)

**Locație:** Linia ~136

**Changes:**
```typescript
// Import PatientAccessService în constructor
constructor(
  private readonly kinesisService: KinesisService,
  private readonly permissionService: PermissionService,
  private readonly messageAutomationService: MessageAutomationService,
  private readonly externalApiConfigService: ExternalApiConfigService,
  private readonly businessInfoService: BusinessInfoService,
  private readonly patientAccessService: PatientAccessService, // ADDED
) {}

// În metoda enrichAppointmentData (linia ~180-229)
private async enrichAppointmentData(
  businessId: string,
  locationId: string,
  appointmentData: any
): Promise<AppointmentData> {
  try {
    // Get business info
    const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
    const locationInfo = await this.businessInfoService.getLocationInfo(businessId, locationId);

    // Extract appointment data from the resource data
    const patientName = appointmentData?.patient?.name || appointmentData?.customer?.name || 'Unknown Patient';
    const patientPhone = appointmentData?.patient?.phone || appointmentData?.customer?.phone;
    const patientEmail = appointmentData?.patient?.email || appointmentData?.customer?.email;
    const patientId = appointmentData?.patient?.id || appointmentData?.patientId;
    const appointmentId = appointmentData?.appointmentId || appointmentData?.id;
    const appointmentDate = this.formatDate(appointmentData?.date || appointmentData?.startDate);
    const appointmentTime = appointmentData?.time;
    const serviceName = appointmentData?.service?.name || 'Service';
    const doctorName = appointmentData?.medic?.name || appointmentData?.doctor?.name || 'Unknown Doctor';

    // Generate access code and patient URL if patientId is available
    let accessCode = '';
    let patientUrl = '';
    
    if (patientId && businessInfo?.domainLabel && locationInfo?.name) {
      accessCode = this.patientAccessService.generateAccessCode(patientId, appointmentId);
      patientUrl = this.patientAccessService.generatePatientUrl(
        businessInfo.domainLabel,
        locationInfo.name,
        patientId
      );
    }

    return {
      patientName,
      patientPhone,
      patientEmail,
      patientId,
      appointmentId,
      appointmentDate,
      appointmentTime,
      businessName: businessInfo?.businessName || 'Business',
      locationName: locationInfo?.name || 'Location',
      serviceName,
      doctorName,
      phoneNumber: (businessInfo as any)?.phoneNumber || '',
      accessCode, // Pre-generated access code
      patientUrl  // Pre-generated patient URL
    };
  } catch (error) {
    this.logger.error(`Failed to enrich appointment data: ${error.message}`);
    return {
      patientName: 'Unknown Patient',
      patientPhone: '',
      patientEmail: '',
      appointmentDate: '',
      appointmentTime: '',
      businessName: 'Business',
      locationName: 'Location',
      serviceName: 'Service',
      doctorName: 'Unknown Doctor',
      phoneNumber: ''
    };
  }
}
```

### 3. Actualizare `ResourcesModule`

**File:** `app/src/modules/resources/resources.module.ts`

```typescript
import { PatientAccessService } from '../patient-booking/patient-access.service';

// ...

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    ResourcesService,
    // ... other providers
    PatientAccessService, // ADDED
  ],
  controllers: [ResourcesController],
})
export class ResourcesModule {}
```

## Testing The Integration

### 1. Test Appointment Creation with Access Code

```bash
# Create an appointment via patient-booking
curl -X POST http://localhost:3000/patient-booking/reserve/bus-123-loc-001 \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-02-15",
    "time": "14:30",
    "serviceId": "srv-001",
    "duration": 30,
    "customer": {
      "name": "Ion Popescu",
      "email": "ion@example.com",
      "phone": "+40721234567"
    }
  }'
```

**Expected Result:**
- Appointment is created
- SMS/Email is sent with:
  - Access code (6 digits)
  - Patient URL with patientId

### 2. Check AI Agent Server Logs

```bash
# Should see logs like:
📝 Template variables:
   businessName: "Clinica Alfa"
   locationName: "Sediu Central"
   address: "Str. Principală 10"
   accessCode: "847293"  ← SHOULD BE PRESENT
   patientUrl: "https://clinica-alfa.simplu.io/sediu-central/details?pt-123456"  ← SHOULD BE PRESENT
```

### 3. Test Access Code Validation

```bash
# Use the access code from the email/SMS
curl -X POST http://localhost:3000/patient-booking/validate-access/bus-123-loc-001 \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "pt-123456",
    "accessCode": "847293"
  }'

# Expected response:
{
  "success": true,
  "message": "Access code validated successfully",
  "patientId": "pt-123456"
}
```

### 4. Test Get Patient Appointments

```bash
curl "http://localhost:3000/patient-booking/patient-appointments/bus-123-loc-001?patientId=pt-123456&accessCode=847293"

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "apt-789",
      "date": "2024-02-15",
      "time": "14:30",
      // ... appointment details
    }
  ]
}
```

## Verification Checklist

- [ ] `PatientAccessService` is imported in modules
- [ ] Access code is generated before sending to ai-agent-server
- [ ] Patient URL is generated with correct format
- [ ] `patientId` is included in AppointmentData
- [ ] `appointmentId` is included in AppointmentData
- [ ] `accessCode` is included in AppointmentData
- [ ] `patientUrl` is included in AppointmentData
- [ ] SMS template includes `{{accessCode}}` and `{{patientUrl}}`
- [ ] Email template includes `{{accessCode}}` and `{{patientUrl}}`
- [ ] Validation endpoint works correctly
- [ ] Get appointments endpoint works correctly
- [ ] Cancel appointment endpoint works correctly

## Common Issues

### Access Code Not Generated

**Problem:** Access code is empty in messages

**Solution:**
- Check that `patientId` is provided in appointment data
- Verify `businessInfo.domainLabel` exists
- Verify `locationInfo.name` exists
- Check logs for generation errors

### Patient URL Malformed

**Problem:** URL is incorrect or missing

**Solution:**
- Verify `formatLocationForUrl` removes diacritics correctly
- Check `BASE_DOMAIN` environment variable
- Ensure `domainLabel` is set in business info

### Validation Fails

**Problem:** Valid code returns "Invalid access code"

**Solution:**
- Verify same algorithm is used in generation and validation
- Check that `patientId` matches exactly
- Ensure no whitespace in access code
- Verify access code is 6 digits

## Summary

1. ✅ `PatientAccessService` generează codul în `app`
2. ✅ Codul și URL-ul sunt trimise la `ai-agent-server`
3. ✅ `ai-agent-server` include valorile în template-uri
4. ✅ Pacientul primește codul prin SMS/Email
5. ✅ `app` validează codul când pacientul accesează
6. ✅ Frontend folosește doar endpoint-uri din `app`

Acest design asigură că:
- Logica de autentificare este centralizată în `app`
- `ai-agent-server` se ocupă doar de trimiterea mesajelor
- Frontend interacționează cu un singur API
- Codul de acces este consistent și securizat

