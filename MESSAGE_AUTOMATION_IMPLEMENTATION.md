# Message Automation Implementation

Acest document descrie implementarea completă a sistemului de automatizare a mesajelor în app server.

## 🏗️ Arhitectura Implementată

```
App Server → ExternalApiConfigService → DynamoDB (config check)
     ↓
PatientBookingService → MessageAutomationService → AI Agent Server
     ↓
AI Agent Server → External APIs (SMS/Email)
```

## 📁 Fișiere Create/Modificate

### 1. Servicii Noi

#### `src/services/message-automation.service.ts`
- **Scop**: Gestionează comunicarea cu AI Agent Server
- **Funcționalități**:
  - `sendBookingConfirmation()` - Trimite confirmare la programare
  - `sendReminderMessage()` - Trimite reminder-uri
  - `checkAutomationStatus()` - Verifică statusul serviciilor

#### `src/services/external-api-config.service.ts`
- **Scop**: Verifică configurațiile din DynamoDB înainte de a trimite request-uri
- **Funcționalități**:
  - `isSmsEnabled()` - Verifică dacă SMS este activat
  - `isEmailEnabled()` - Verifică dacă email este activat
  - `shouldSendOnBooking()` - Verifică dacă trebuie să trimită la programare
  - `shouldSendReminders()` - Verifică dacă trebuie să trimită reminder-uri

### 2. Integrare în PatientBookingService

#### Modificări în `patient-booking.service.ts`:
- Adăugat import-uri pentru serviciile noi
- Adăugat dependențe în constructor
- Integrat `sendAutomatedMessages()` în metoda `reserve()`
- Adăugat metode private:
  - `sendAutomatedMessages()` - Logica principală de trimitere
  - `enrichAppointmentData()` - Îmbogățește datele cu informații business
  - `formatDate()` - Formatează data în română

### 3. Configurare Module

#### Modificări în `patient-booking.module.ts`:
- Adăugat `MessageAutomationService` și `ExternalApiConfigService` în providers

### 4. Variabile de Mediu

#### Adăugate în `env.example`:
```env
# AI Agent Server Configuration
AI_AGENT_SERVER_URL=http://localhost:3001
AI_AGENT_API_KEY=your-ai-agent-api-key
EXTERNAL_API_CONFIG_TABLE_NAME=external-api-config
```

## 🔄 Fluxul de Funcționare

### 1. Crearea unei Programări

```typescript
// 1. Utilizatorul creează o programare
POST /patient-booking/reserve/{businessId}-{locationId}

// 2. PatientBookingService.reserve() se execută
// 3. Se verifică configurațiile în DynamoDB
const isAnyServiceEnabled = await this.externalApiConfigService.isAnyServiceEnabled(businessId, locationId);

// 4. Se verifică ce servicii trebuie să trimită la programare
const shouldSend = await this.externalApiConfigService.shouldSendOnBooking(businessId, locationId);

// 5. Se trimite confirmarea (dacă este configurat)
await this.messageAutomationService.sendBookingConfirmation(businessId, appointmentData, locationId);
```

### 2. Verificarea Configurațiilor

```typescript
// ExternalApiConfigService verifică în DynamoDB:
{
  businessId: "business-123",
  locationId: "location-456",
  sms: {
    enabled: true,
    sendOnBooking: true,
    sendReminder: true,
    reminderTiming: "day_before"
  },
  email: {
    enabled: true,
    sendOnBooking: true,
    sendReminder: true,
    reminderTiming: "both"
  }
}
```

### 3. Trimiterea Mesajelor

```typescript
// MessageAutomationService trimite către AI Agent Server:
POST /message-automation/{businessId}/send-booking-confirmation?locationId={locationId}
{
  "patientName": "John Doe",
  "patientPhone": "+40721234567",
  "patientEmail": "john@example.com",
  "appointmentDate": "15 ianuarie 2024",
  "appointmentTime": "14:30",
  "businessName": "Clinică Dentală",
  "locationName": "Sediul Central",
  "serviceName": "Consultație",
  "doctorName": "Dr. Smith",
  "phoneNumber": "+40721111111"
}
```

## 🛡️ Măsuri de Siguranță

### 1. Verificări Prealabile
- **Verificare servicii active**: Se verifică înainte de a trimite request-uri
- **Verificare configurații**: Se verifică ce servicii trebuie să trimită
- **Fallback graceful**: Dacă serviciile nu sunt configurate, nu se trimite nimic

### 2. Gestionarea Erorilor
- **Logging detaliat**: Toate erorile sunt logate
- **Non-blocking**: Erorile de mesaje nu afectează crearea programării
- **Retry logic**: Poate fi implementat în MessageAutomationService

### 3. Performanță
- **Verificări paralele**: Configurațiile se verifică în paralel
- **Caching**: Poate fi implementat pentru configurații
- **Async processing**: Mesajele se trimit asincron

## 🧪 Testare

### 1. Testare Manuală

```bash
# 1. Creează o programare
curl -X POST http://localhost:3000/patient-booking/reserve/business-123-location-456 \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "time": "14:30",
    "serviceId": "service-789",
    "customer": {
      "name": "Test Patient",
      "email": "test@example.com",
      "phone": "+40721234567"
    }
  }'

# 2. Verifică logs pentru mesaje automate
tail -f logs/app.log | grep "Booking confirmation"
```

### 2. Testare Configurații

```typescript
// Testează dacă serviciile sunt active
const isEnabled = await externalApiConfigService.isAnyServiceEnabled('business-123', 'location-456');
console.log('Services enabled:', isEnabled);

// Testează ce servicii trebuie să trimită
const shouldSend = await externalApiConfigService.shouldSendOnBooking('business-123', 'location-456');
console.log('Should send SMS:', shouldSend.sms);
console.log('Should send Email:', shouldSend.email);
```

## 📊 Monitoring

### 1. Logs Importante

```typescript
// Logs de succes
"Booking confirmation sent successfully for business business-123, location location-456"

// Logs de debug
"No automation services enabled for business business-123, location location-456"
"No services configured to send on booking for business business-123, location location-456"

// Logs de eroare
"Failed to send automated messages: Connection timeout"
"Failed to enrich appointment data: Business info not found"
```

### 2. Metrics Recomandate

- Numărul de mesaje trimise cu succes
- Numărul de mesaje eșuate
- Timpul de răspuns al AI Agent Server
- Numărul de business-uri cu servicii activate

## 🔧 Configurare

### 1. Variabile de Mediu Obligatorii

```env
AI_AGENT_SERVER_URL=http://localhost:3001
AI_AGENT_API_KEY=your-secure-api-key
EXTERNAL_API_CONFIG_TABLE_NAME=external-api-config
```

### 2. Configurare DynamoDB

Tabelul `external-api-config` trebuie să existe cu structura:
- **Partition Key**: `businessId` (String)
- **Sort Key**: `locationId` (String)

### 3. Configurare AI Agent Server

AI Agent Server trebuie să fie pornit și să aibă endpoint-urile:
- `POST /message-automation/{businessId}/send-booking-confirmation`
- `POST /message-automation/{businessId}/send-reminder`
- `GET /message-automation/{businessId}/automation-status`

## 🚀 Deployment

### 1. Ordinea de Deployment

1. **AI Agent Server** - Trebuie să fie pornit primul
2. **DynamoDB Tables** - Să fie create și configurate
3. **App Server** - Cu noile servicii

### 2. Health Checks

```typescript
// Adaugă health check pentru AI Agent Server
@Get('health/ai-agent')
async checkAiAgentHealth() {
  try {
    const response = await fetch(`${this.aiAgentUrl}/health`);
    return { status: response.ok ? 'healthy' : 'unhealthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

## 📈 Optimizări Viitoare

### 1. Caching
- Cache pentru configurații DynamoDB
- Cache pentru business info

### 2. Retry Logic
- Retry automat pentru request-uri eșuate
- Exponential backoff

### 3. Batch Processing
- Trimite mai multe mesaje într-un singur request
- Queue pentru mesaje mari

### 4. Monitoring Avansat
- Metrics cu Prometheus
- Alerts pentru erori
- Dashboard cu Grafana

Această implementare oferă o bază solidă pentru automatizarea mesajelor, cu verificări de siguranță și gestionarea erorilor integrate.
