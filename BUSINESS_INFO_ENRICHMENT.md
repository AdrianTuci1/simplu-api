# Business Info Enrichment - Message Automation

## Problema Rezolvată

Mesajele automate trimise la programări conțineau valori hardcodate sau incomplete:
- ❌ `businessName: "Business"` - în loc de numele real
- ❌ `locationName: "Location"` - în loc de numele locației
- ❌ `address` - lipsea complet din template

## Soluția Implementată

### 1. Enrichment în `ai-agent-server`

Am mutat logica de enrichment în **`ai-agent-server`** în loc de `app`, pentru că:
- ✅ Are acces direct la `BusinessInfoService`
- ✅ Structura datelor din DynamoDB este mai clară
- ✅ Logging detaliat pentru debugging
- ✅ Un singur loc unde se face enrichment-ul

### 2. Structura Datelor din DynamoDB

```typescript
// LocationInfo structure in ai-agent-server
interface LocationInfo {
  locationId: string;  // NOT "id" - this is the key!
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}
```

**Important**: În `ai-agent-server`, câmpul este `locationId`, nu `id`!

### 3. Metoda `enrichAppointmentData`

Am adăugat în `MessageAutomationService` (ai-agent-server):

```typescript
private async enrichAppointmentData(
  businessId: string,
  locationId: string,
  appointmentData: AppointmentData
): Promise<AppointmentData> {
  // 1. Get business info from DynamoDB
  const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
  
  // 2. Find location by locationId
  const location = businessInfo.locations.find(loc => loc.locationId === locationId);
  
  // 3. Return enriched data
  return {
    ...appointmentData,
    businessName: businessInfo.businessName,      // "Cabinet Stomatologic Dr. Popescu"
    locationName: location.name,                   // "Clinica Centru"
    phoneNumber: location.phone,                   // "+40 721 123 456"
    address: location.address                      // "Str. Victoriei 123, București"
  };
}
```

### 4. Flow-ul Complet

```
1. App Server (create appointment)
   ↓
2. Enriches basic data (patient, date, time, service, doctor)
   ↓
3. Sends to ai-agent-server via HTTP
   ↓
4. ai-agent-server.MessageAutomationService
   ↓
5. enrichAppointmentData() - fetches from DynamoDB
   ↓
6. businessInfo.businessName → "Cabinet Stomatologic"
   businessInfo.locations[0].name → "Clinica Centru"
   businessInfo.locations[0].address → "Str. Victoriei 123"
   ↓
7. Process template with enriched data
   ↓
8. Send SMS/Email with correct information
```

## Fișiere Modificate

### ai-agent-server

1. **`src/modules/external-apis/services/message-automation.service.ts`**
   - Adăugat `BusinessInfoService` în constructor
   - Adăugat metoda `enrichAppointmentData()`
   - Modificat `sendBookingConfirmation()` să folosească enriched data
   - Adăugat `address` în `buildTemplateVariables()`
   - Adăugat logging detaliat

2. **`src/modules/external-apis/external-apis.module.ts`**
   - Importat `BusinessInfoModule`

3. **`src/modules/external-apis/controllers/message-automation.controller.ts`**
   - Adăugat logging pentru requests

### app

4. **`src/services/message-automation.service.ts`**
   - Adăugat `address?: string` în `AppointmentData` interface

## Variabile Disponibile în Template

Acum template-urile au acces la:

```typescript
{
  patientName: "Ion Popescu",
  appointmentDate: "9 octombrie",
  appointmentTime: "08:00",
  businessName: "Cabinet Stomatologic Dr. Popescu",  // ✅ Din DynamoDB
  locationName: "Clinica Centru",                     // ✅ Din DynamoDB
  serviceName: "Consult general",
  doctorName: "Dr. Maria Ionescu",
  phoneNumber: "+40 721 123 456",                     // ✅ Din DynamoDB
  address: "Str. Victoriei 123, București"            // ✅ NOU din DynamoDB
}
```

## Exemple de Template-uri

### SMS Template Original
```
Salut {{patientName}}! Programarea ta la {{businessName}} este confirmată 
pentru {{appointmentDate}} la ora {{appointmentTime}}. Te așteptăm!
```

**Rezultat ÎNAINTE:**
```
Salut Ion Popescu! Programarea ta la "Business" este confirmată 
pentru 9 octombrie la ora 08:00. Te așteptăm!
```

**Rezultat ACUM:**
```
Salut Ion Popescu! Programarea ta la Cabinet Stomatologic Dr. Popescu 
este confirmată pentru 9 octombrie la ora 08:00. Te așteptăm!
```

### SMS Template cu Adresa (NOU)
```
Salut {{patientName}}! Programarea ta la {{businessName}} ({{locationName}}) 
este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}.
Adresa: {{address}}
Te așteptăm!
```

**Rezultat:**
```
Salut Ion Popescu! Programarea ta la Cabinet Stomatologic Dr. Popescu 
(Clinica Centru) este confirmată pentru 9 octombrie la ora 08:00.
Adresa: Str. Victoriei 123, București
Te așteptăm!
```

## Logging pentru Debugging

### În ai-agent-server vei vedea:

```bash
[MessageAutomationController] === Received booking confirmation request ===
[MessageAutomationController] Business ID: B0100001
[MessageAutomationController] Location ID: L0100001
[MessageAutomationController] Patient: Ion Popescu
[MessageAutomationController] Date: 9 octombrie 08:00

[MessageAutomationService] Processing booking confirmation for business B0100001, location L0100001
[MessageAutomationService] Config found - SMS enabled: true, Email enabled: false
[MessageAutomationService] SMS sendOnBooking: true, Email sendOnBooking: false

[MessageAutomationService] Enriching appointment data for business B0100001, location L0100001
[MessageAutomationService] Found business: Cabinet Stomatologic Dr. Popescu
[MessageAutomationService] Available locations: L0100001:Clinica Centru, L0100002:Clinica Sud
[MessageAutomationService] Found location: Clinica Centru at Str. Victoriei 123, București

[MessageAutomationService] Enriched data - Business: Cabinet Stomatologic Dr. Popescu, Location: Clinica Centru, Address: Str. Victoriei 123, București

[MessageAutomationService] Sending SMS to +40721123456
[MessageAutomationService] SMS result: {"success":true,"messageId":"..."}

[MessageAutomationController] === Booking confirmation sent: 1 message(s) ===
[MessageAutomationController] Message 1 [sms]: SUCCESS <message-id>
```

## Testing

### 1. Creează o programare

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P001",
    "doctorId": "D001",
    "appointmentDate": "2025-10-08",
    "appointmentTime": "10:00"
  }'
```

### 2. Verifică logurile în ai-agent-server

```bash
docker logs simplu-api-ai-agent-server-1 -f
```

Ar trebui să vezi:
- ✅ Business name corect din DynamoDB
- ✅ Location name corect
- ✅ Address completă
- ✅ Phone number corect

### 3. Verifică SMS-ul primit

SMS-ul ar trebui să conțină:
- ✅ Numele real al business-ului
- ✅ Numele real al locației (dacă e în template)
- ✅ Adresa (dacă e în template)

## Actualizare Template-uri

Pentru a folosi noile variabile, poți actualiza template-urile prin API:

```bash
# Update SMS template
curl -X PUT http://localhost:3003/external-api-config/B0100001/sms-template/default \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Salut {{patientName}}! Programarea ta la {{businessName}} ({{locationName}}) este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}. Adresa: {{address}}. Te așteptăm!"
  }'
```

## Fallback Behavior

Dacă enrichment-ul eșuează (de exemplu, DynamoDB nu răspunde):

```typescript
// ServiceMessageAutomationService returnează datele originale
return appointmentData; // Cu valorile din app

// În logging vei vedea:
[MessageAutomationService] Failed to enrich appointment data: <error>
[MessageAutomationService] Using original appointment data
```

## Diferențe între app și ai-agent-server

### În `app/src/modules/business-info/business-info.service.ts`:
```typescript
interface LocationInfo {
  id: string;  // ⚠️ Mapează de la locationId
  name: string;
  ...
}
```

### În `ai-agent-server/src/modules/business-info/business-info.service.ts`:
```typescript
interface LocationInfo {
  locationId: string;  // ✅ Exact ca în DynamoDB
  name: string;
  ...
}
```

**De aceea enrichment-ul este mai corect în ai-agent-server!**

## Note Importante

1. **locationId vs id**: 
   - DynamoDB folosește `locationId`
   - ai-agent-server folosește `locationId` (corect)
   - app folosește `id` (necesită mapping)

2. **Caching**: 
   - Nu există caching momentan
   - Fiecare request face GetCommand la DynamoDB
   - Consider adăugarea unui cache pentru performanță

3. **Error Handling**:
   - Dacă DynamoDB eșuează, se folosesc datele originale
   - Nu se blochează trimiterea mesajului
   - Logging detaliat pentru debugging

4. **Template Variables**:
   - Toate variabilele sunt opționale
   - Dacă o variabilă lipsește, se înlocuiește cu string gol
   - Template-ul nu se strică dacă o variabilă nu există

## Troubleshooting

### Problema: Încă văd "Business" în loc de numele real

**Verificări:**
1. Pornește ai-agent-server: `docker-compose up -d ai-agent-server`
2. Verifică logurile: `docker logs simplu-api-ai-agent-server-1 -f`
3. Caută "Found business:" în logs
4. Dacă nu există, verifică conexiunea la DynamoDB

### Problema: Location name este "Location"

**Verificări:**
1. Vezi în logs: "Available locations:"
2. Verifică că `locationId` din request match-ează cu unul din listă
3. Dacă nu match-ează, verifică că location-ul există în DynamoDB

### Problema: Nu am logging în ai-agent-server

**Soluție:**
```bash
# Pornește serviciul
docker-compose up -d ai-agent-server

# Verifică că rulează
docker-compose ps

# Vezi logurile
docker logs simplu-api-ai-agent-server-1 -f
```

## Performance Considerations

Fiecare booking confirmation face:
1. Un GetCommand la DynamoDB pentru business info
2. Procesare in-memory pentru a găsi location-ul
3. Processing template
4. Send SMS/Email

**Recomandări pentru viitor:**
- Adaugă Redis cache pentru business info (TTL: 1h)
- Batch processing pentru multiple bookings
- Async processing cu queue (SQS)

## Referințe

- **Service Principal**: `ai-agent-server/src/modules/external-apis/services/message-automation.service.ts`
- **Controller**: `ai-agent-server/src/modules/external-apis/controllers/message-automation.controller.ts`
- **Business Info Service**: `ai-agent-server/src/modules/business-info/business-info.service.ts`
- **Interface (app)**: `app/src/services/message-automation.service.ts`
- **Config Guide**: `EXTERNAL_API_CONFIG_FIX.md`

