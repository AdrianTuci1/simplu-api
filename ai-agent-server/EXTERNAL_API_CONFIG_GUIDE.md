# External API Configuration Guide

Acest ghid explică cum să configurezi și să folosești sistemul de configurații per client pentru API-urile externe (SMS și Email).

## Funcționalități

### 1. Configurări per Client
- Configurări personalizate pentru fiecare business/location
- Template-uri customizabile pentru SMS și email
- Control granular asupra când se trimit mesaje (la programare, cu o zi înainte, în ziua respectivă)
- Suport pentru multiple servicii (AWS SNS, Twilio, Meta, Gmail)

### 2. Template System
- Template-uri cu variabile dinamice
- Variabile predefinite pentru date despre programări
- Procesare automată a template-urilor cu datele reale

## API Endpoints

### Configurații

#### Creează configurație nouă
```http
POST /external-api-config
Content-Type: application/json

{
  "businessId": "business-123",
  "locationId": "location-456", // optional
  "sms": {
    "enabled": true,
    "sendOnBooking": true,
    "sendReminder": true,
    "reminderTiming": "day_before",
    "serviceType": "aws_sns"
  },
  "email": {
    "enabled": true,
    "sendOnBooking": true,
    "sendReminder": true,
    "reminderTiming": "both",
    "serviceType": "gmail"
  }
}
```

#### Obține configurație
```http
GET /external-api-config/{businessId}?locationId=location-456
```

#### Actualizează configurație
```http
PUT /external-api-config/{businessId}?locationId=location-456
Content-Type: application/json

{
  "sms": {
    "enabled": false
  }
}
```

#### Șterge configurație
```http
DELETE /external-api-config/{businessId}?locationId=location-456
```

### Template Management

#### Adaugă template SMS
```http
POST /external-api-config/{businessId}/sms/templates?locationId=location-456
Content-Type: application/json

{
  "id": "welcome_template",
  "name": "Mesaj de bun venit",
  "content": "Salut {{patientName}}! Programarea ta la {{businessName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}.",
  "variables": ["patientName", "businessName", "appointmentDate", "appointmentTime"]
}
```

#### Adaugă template Email
```http
POST /external-api-config/{businessId}/email/templates?locationId=location-456
Content-Type: application/json

{
  "id": "confirmation_email",
  "name": "Email de confirmare",
  "subject": "Confirmare programare - {{businessName}}",
  "content": "Salut {{patientName}},\n\nProgramarea ta la {{businessName}} a fost confirmată cu succes!\n\nDetalii:\n- Data: {{appointmentDate}}\n- Ora: {{appointmentTime}}\n- Serviciu: {{serviceName}}\n\nCu stimă,\nEchipa {{businessName}}",
  "variables": ["patientName", "businessName", "appointmentDate", "appointmentTime", "serviceName"]
}
```

### Automatizare Mesaje

#### Trimite confirmare programare
```http
POST /message-automation/{businessId}/send-booking-confirmation?locationId=location-456
Content-Type: application/json

{
  "patientName": "Ion Popescu",
  "patientPhone": "+40721234567",
  "patientEmail": "ion@example.com",
  "appointmentDate": "15 ianuarie 2024",
  "appointmentTime": "14:30",
  "businessName": "Cabinet Medical Dr. Popescu",
  "locationName": "Cabinet Principal",
  "serviceName": "Consult medic general",
  "doctorName": "Dr. Popescu",
  "phoneNumber": "+40721123456"
}
```

#### Trimite reminder
```http
POST /message-automation/{businessId}/send-reminder?locationId=location-456
Content-Type: application/json

{
  "appointmentData": {
    "patientName": "Ion Popescu",
    "patientPhone": "+40721234567",
    "patientEmail": "ion@example.com",
    "appointmentDate": "15 ianuarie 2024",
    "appointmentTime": "14:30",
    "businessName": "Cabinet Medical Dr. Popescu",
    "locationName": "Cabinet Principal",
    "serviceName": "Consult medic general",
    "doctorName": "Dr. Popescu",
    "phoneNumber": "+40721123456"
  },
  "reminderType": "day_before"
}
```

#### Verifică status automatizare
```http
GET /message-automation/{businessId}/automation-status?locationId=location-456
```

## Variabile Template Disponibile

| Variabilă | Descriere | Exemplu |
|-----------|-----------|---------|
| `patientName` | Numele pacientului | "Ion Popescu" |
| `appointmentDate` | Data programării | "15 ianuarie 2024" |
| `appointmentTime` | Ora programării | "14:30" |
| `businessName` | Numele afacerii | "Cabinet Medical Dr. Popescu" |
| `locationName` | Numele locației | "Cabinet Principal" |
| `serviceName` | Numele serviciului | "Consult medic general" |
| `doctorName` | Numele doctorului | "Dr. Popescu" |
| `phoneNumber` | Numărul de telefon | "+40 721 234 567" |

## Configurări Default

### SMS Config
```json
{
  "enabled": false,
  "sendOnBooking": false,
  "sendReminder": false,
  "reminderTiming": "day_before",
  "defaultTemplate": "default",
  "templates": [
    {
      "id": "default",
      "name": "Template Implicit",
      "content": "Salut {{patientName}}! Programarea ta la {{businessName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}. Te așteptăm!",
      "variables": ["patientName", "businessName", "appointmentDate", "appointmentTime"]
    }
  ],
  "serviceType": "aws_sns"
}
```

### Email Config
```json
{
  "enabled": false,
  "sendOnBooking": false,
  "sendReminder": false,
  "reminderTiming": "day_before",
  "defaultTemplate": "default",
  "templates": [
    {
      "id": "default",
      "name": "Template Implicit",
      "subject": "Confirmare programare - {{businessName}}",
      "content": "Salut {{patientName}},\n\nProgramarea ta la {{businessName}} a fost confirmată cu succes!\n\nDetalii programare:\n- Data: {{appointmentDate}}\n- Ora: {{appointmentTime}}\n- Serviciu: {{serviceName}}\n- Doctor: {{doctorName}}\n\nDacă ai întrebări, ne poți contacta la {{phoneNumber}}.\n\nCu stimă,\nEchipa {{businessName}}",
      "variables": ["patientName", "businessName", "appointmentDate", "appointmentTime", "serviceName", "doctorName", "phoneNumber"]
    }
  ],
  "serviceType": "gmail",
  "senderName": ""
}
```

## Integrare cu App Server

Pentru a integra cu app server-ul, următorul pas va fi să creezi un listener care să detecteze când se creează/modifică programări și să trimită automat mesajele folosind aceste configurații.

### Exemplu de integrare:
```typescript
// În app server, când se creează o programare
const appointmentData = {
  patientName: appointment.patientName,
  patientPhone: appointment.patientPhone,
  patientEmail: appointment.patientEmail,
  appointmentDate: formatDate(appointment.date),
  appointmentTime: formatTime(appointment.time),
  businessName: business.name,
  locationName: location.name,
  serviceName: appointment.serviceName,
  doctorName: appointment.doctorName,
  phoneNumber: business.phoneNumber
};

// Trimite către ai-agent-server
await fetch(`${AI_AGENT_SERVER_URL}/message-automation/${businessId}/send-booking-confirmation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(appointmentData)
});
```

## Note Importante

1. **DynamoDB Table**: Configurațiile se stochează în tabelul `business-external-api-config`
2. **Location Support**: Configurațiile pot fi globale pentru business sau specifice pentru o locație
3. **Service Types**: Suportă AWS SNS, Twilio, Meta (WhatsApp), și Gmail
4. **Template Processing**: Template-urile sunt procesate automat cu datele reale ale programării
5. **Error Handling**: Toate operațiunile returnează status de succes/eroare cu mesaje detaliate
