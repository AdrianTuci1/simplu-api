# Appointment Reminders System

## Prezentare Generală

Sistemul de reminder-uri automate pentru programări verifică periodic programările viitoare și trimite notificări automate prin SMS și Email către pacienți.

## Funcționalități

✅ **Reminder-uri Automate**
- Trimite SMS/Email cu o zi înainte de programare
- Trimite SMS/Email în ziua programării
- Configurabil per business/location
- Scanare automată a tuturor business-urilor cu automation activată

✅ **Cod de Acces Pacient**
- Include cod de 6 cifre pentru acces
- Include link către pagina pacientului
- Permite anulare și gestionare programare

✅ **Integrare Completă**
- Verifică setările de automatizare din DynamoDB
- Obține programările din RDS (prin app server)
- Folosește template-uri personalizabile
- Suportă Gmail OAuth2 și AWS SNS

## Arhitectură

```
┌─────────────────────┐
│  Cron Job           │
│  (Runs every hour)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  1. Scan DynamoDB ExternalApiConfig     │
│     → Find all businesses with          │
│       sendReminder enabled              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  2. For each business/location:         │
│     → Check reminder timing config      │
│     → Determine dates to check          │
│       (today/tomorrow)                  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  3. Query App Server (RDS) for          │
│     appointments on target dates        │
│     → Filter active appointments        │
│     → Exclude cancelled/completed       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  4. For each appointment:               │
│     → Generate access code              │
│     → Generate patient URL              │
│     → Build template variables          │
│     → Send SMS/Email via automation     │
└─────────────────────────────────────────┘
```

## Configurare

### 1. Environment Variables

```bash
# În .env sau environment variables
APP_SERVER_URL=http://localhost:3001  # URL-ul app server-ului cu RDS
BASE_DOMAIN=simplu.io                # Domain-ul de bază
```

### 2. DynamoDB Configuration

Reminder-urile se configurează per business/location în tabelul `ExternalApiConfig`:

```json
{
  "businessId": "bus-123",
  "locationId": "loc-001",
  "sms": {
    "enabled": true,
    "sendReminder": true,
    "reminderTiming": "day_before"  // sau "same_day" sau "both"
  },
  "email": {
    "enabled": true,
    "sendReminder": true,
    "reminderTiming": "both"  // trimite atât cu o zi înainte cât și în ziua programării
  }
}
```

### 3. Timing Options

| Timing | Descriere | Când Trimite |
|--------|-----------|--------------|
| `day_before` | Cu o zi înainte | Pentru programările de mâine |
| `same_day` | În ziua programării | Pentru programările de astăzi |
| `both` | Ambele | Două reminder-uri: unul cu o zi înainte + unul în ziua programării |

## Cron Schedule

Cron job-ul rulează automat **la fiecare oră** (la :00 minute):
```
0 * * * *  → La fiecare oră: 00:00, 01:00, 02:00, ..., 23:00
```

### De ce la fiecare oră?

- Permite flexibilitate în configurarea reminder-urilor
- Businessurile pot avea ore de deschidere diferite
- Permite trimiterea reminder-urilor "same_day" la ore diferite
- Nu suprasolicită sistemul (doar 24 rulări pe zi)

## Fluxul de Date

### 1. Descoperire Businesses

```typescript
// Scanează DynamoDB pentru toate configurațiile
const allConfigs = await configService.getAllConfigs();

// Filtrează doar cele cu reminder-uri activate
const businessesWithReminders = allConfigs.filter(config => {
  const smsEnabled = config.sms?.enabled && config.sms?.sendReminder;
  const emailEnabled = config.email?.enabled && config.email?.sendReminder;
  return smsEnabled || emailEnabled;
});
```

### 2. Determinare Date de Verificat

```typescript
// Bazat pe reminder timing configuration
if (reminderTiming === 'day_before' || reminderTiming === 'both') {
  dates.add(tomorrow); // YYYY-MM-DD
}
if (reminderTiming === 'same_day' || reminderTiming === 'both') {
  dates.add(today);    // YYYY-MM-DD
}
```

### 3. Query Programări din RDS

```typescript
// GET request către app server
GET /api/resources/{businessLocationId}/appointments
  ?startDate=2024-01-15
  &endDate=2024-01-15
  &limit=100

// Response
{
  "resources": [
    {
      "id": "apt-123",
      "resourceType": "appointment",
      "startDate": "2024-01-15",
      "data": {
        "patientName": "Ion Popescu",
        "patientPhone": "+40721234567",
        "patientEmail": "ion@example.com",
        "patientId": "patient00123",
        "time": "14:30",
        "serviceName": "Consult stomatologic",
        "doctorName": "Dr. Popescu",
        "status": "confirmed"
      }
    }
  ]
}
```

### 4. Filtrare Programări

Exclude programările cu status:
- `cancelled` / `canceled`
- `completed`
- `absent`

### 5. Trimitere Reminder-uri

Pentru fiecare programare activă:
```typescript
const appointmentData: AppointmentData = {
  patientName,
  patientPhone,
  patientEmail,
  patientId,
  appointmentId,
  appointmentDate: "15 ianuarie 2024",
  appointmentTime: "14:30",
  businessName,
  locationName,
  serviceName,
  doctorName,
  phoneNumber,
  address,
  domainLabel
};

// Trimite reminder
await messageAutomationService.sendReminderMessage(
  businessId,
  appointmentData,
  'day_before', // sau 'same_day'
  locationId
);
```

## Template-uri Reminder

Template-urile pentru reminder-uri sunt similare cu cele pentru confirmare, dar pot fi personalizate separat în viitor.

### SMS Reminder

```
Salut {{patientName}}! Reamintim: programarea ta la {{locationName}} este mâine la ora {{appointmentTime}}.

Codul tău de acces: {{accessCode}}
Link: {{patientUrl}}

Ne vedem cu drag!
```

### Email Reminder

```
Salut {{patientName}},

Reamintire: Ai o programare la {{locationName}}!

Detalii:
- Data: {{appointmentDate}}
- Ora: {{appointmentTime}}
- Serviciu: {{serviceName}}
- Doctor: {{doctorName}}

📱 Cod acces: {{accessCode}}
🔗 {{patientUrl}}

Te așteptăm!
Echipa {{locationName}}
```

## Testing

### 1. Test Manual via API

```bash
# Test pentru un business specific
curl -X POST http://localhost:3003/cron/trigger/appointment-reminders \
  -H "Content-Type: application/json" \
  ?businessId=bus-123&locationId=loc-001
```

```bash
# Test pentru toate business-urile cu automation
curl -X POST http://localhost:3003/cron/trigger/appointment-reminders
```

### 2. Verificare Logs

```bash
# Monitor cron job
tail -f logs/cron-appointment-reminders.log

# Expected output:
🔔 Starting appointment reminders check...
Found 3 businesses with automation enabled
Processing reminders for business bus-123, location loc-001
Reminder config - SMS: true (timing: both), Email: true (timing: day_before)
Checking appointments for dates: 2024-01-15, 2024-01-16
Found 5 appointments for 2024-01-15
Sending reminder for appointment apt-123 to Ion Popescu (+40721234567)
✅ Reminder sent via sms for appointment apt-123 - MessageId: xxx
✅ Reminder sent via email for appointment apt-123 - MessageId: yyy
✅ Appointment reminders check completed
```

### 3. Test cu Programări de Test

```bash
# 1. Creează o programare de test în RDS pentru mâine
curl -X POST http://localhost:3001/api/resources/bus-123-loc-001/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-16",
    "data": {
      "patientName": "Test Patient",
      "patientPhone": "+40721999999",
      "patientEmail": "test@example.com",
      "patientId": "patient99999",
      "time": "10:00",
      "serviceName": "Test Service",
      "doctorName": "Dr. Test",
      "status": "confirmed"
    }
  }'

# 2. Configurează automation în DynamoDB
# (folosește admin panel sau API)

# 3. Trigger manual cron job
curl -X POST http://localhost:3003/cron/trigger/appointment-reminders

# 4. Verifică dacă reminder-ul a fost trimis
```

## Monitoring & Troubleshooting

### Check Cron Status

```bash
GET /cron/status

# Response includes:
{
  "jobs": [
    {
      "name": "appointment-reminders",
      "schedule": "0 * * * *",
      "description": "Send appointment reminders every hour"
    }
  ]
}
```

### Common Issues

#### 1. Nu se trimit reminder-uri

**Verificări:**
- [ ] DynamoDB: Există config cu `sendReminder: true`?
- [ ] App Server: Răspunde la query-uri de appointments?
- [ ] Gmail OAuth: Este configurat pentru location?
- [ ] SMS: AWS SNS credentials sunt valide?

**Debug:**
```bash
# Verifică configurația
curl http://localhost:3003/external-api-config/bus-123/loc-001

# Verifică programările
curl http://localhost:3001/api/resources/bus-123-loc-001/appointments?startDate=2024-01-15&endDate=2024-01-15

# Test manual trigger
curl -X POST http://localhost:3003/cron/trigger/appointment-reminders?businessId=bus-123&locationId=loc-001
```

#### 2. Reminder-uri duplicate

**Cauze posibile:**
- Cron job rulează de mai multe ori (verifică că nu ai multiple instanțe)
- Programări duplicate în RDS

**Soluție:**
- Asigură-te că doar o instanță a serviciului rulează cron-ul
- Adaugă deduplicare bazată pe appointmentId + patientId + date

#### 3. Programări nu sunt găsite

**Verificări:**
- [ ] APP_SERVER_URL este corect configurat
- [ ] businessLocationId format: `{businessId}-{locationId}`
- [ ] startDate format: `YYYY-MM-DD`
- [ ] App server are access la RDS

#### 4. Timing incorrect

**Verificări:**
- [ ] Timezone-ul serverului
- [ ] Programările au timezone correct în RDS
- [ ] reminderTiming configuration

## Performance & Scaling

### Current Load

- Runs 24 times per day (every hour)
- Scans all ExternalApiConfig records
- Query appointments per business/location
- Sends reminders per appointment

### Optimization Tips

1. **Paginare pentru multe programări:**
   ```typescript
   // În loc de limit=100, implementează paginare
   const allAppointments = await this.getAllAppointmentsPaginated(
     businessId, locationId, date
   );
   ```

2. **Caching pentru business info:**
   ```typescript
   // Cache business info pentru a reduce DynamoDB reads
   private businessInfoCache = new Map();
   ```

3. **Batch sending:**
   ```typescript
   // Trimite reminder-uri în batch-uri de 10
   const batches = chunk(appointments, 10);
   for (const batch of batches) {
     await Promise.all(batch.map(apt => this.sendReminder(apt)));
   }
   ```

4. **Rate Limiting:**
   ```typescript
   // Limitează SMS/Email per oră per business
   private rateLimiter = new Map();
   ```

## Future Enhancements

- [ ] Template-uri separate pentru reminder-uri (nu reutiliza confirmation templates)
- [ ] Configurare oră exactă de trimitere per business
- [ ] Notificări prin WhatsApp (Meta Business API)
- [ ] Push notifications mobile
- [ ] Reminder-uri multiple (ex: 1 săptămână înainte + 1 zi înainte)
- [ ] Deduplicare automată pentru reminder-uri duplicate
- [ ] Analytics dashboard pentru reminder-uri trimise
- [ ] A/B testing pentru template-uri
- [ ] Timezone awareness per location

## Security & Privacy

- ✅ Doar programările active primesc reminder-uri
- ✅ Coduri de acces unice per pacient
- ✅ OAuth2 pentru Gmail
- ✅ Logging securizat (fără date sensibile)
- ✅ Rate limiting implicit prin cron schedule

## API Reference

### Manual Trigger

```
POST /cron/trigger/appointment-reminders
```

**Query Parameters:**
- `businessId` (optional) - Test specific business
- `locationId` (optional) - Test specific location

**Response:**
```json
{
  "success": true,
  "message": "Appointment reminders processed"
}
```

### Get Cron Status

```
GET /cron/status
```

**Response:**
```json
{
  "status": "active",
  "jobs": [
    {
      "name": "appointment-reminders",
      "schedule": "0 * * * *",
      "description": "Send appointment reminders every hour"
    }
  ]
}
```

## Logs Examples

```
[AppointmentRemindersJob] 🔔 Starting appointment reminders check...
[AppointmentRemindersJob] Found 5 businesses/locations with reminders enabled
[AppointmentRemindersJob] Processing reminders for business bus-123, location loc-001
[AppointmentRemindersJob] Reminder config - SMS: true (timing: both), Email: true (timing: day_before)
[AppointmentRemindersJob] Checking appointments for dates: 2024-01-15, 2024-01-16
[AppointmentRemindersJob] Found 12 appointments for 2024-01-15
[AppointmentRemindersJob] Sending reminder for appointment apt-456 to Maria Ionescu (+40721111111)
[AppointmentRemindersJob] ✅ Reminder sent via sms for appointment apt-456 - MessageId: msg-789
[AppointmentRemindersJob] ✅ Reminder sent via email for appointment apt-456 - MessageId: gmail-xyz
[AppointmentRemindersJob] ✅ Appointment reminders check completed
```

## Integration with Other Systems

### With App Server (RDS)
- Queries appointments via REST API
- Filters by date range
- Respects resource type "appointment"

### With DynamoDB
- Scans ExternalApiConfig for automation settings
- Queries BusinessInfo for location details
- Stores no state (stateless job)

### With Message Automation Service
- Uses MessageAutomationService.sendReminderMessage()
- Reuses templates and configurations
- Includes patient access codes

## Conclusion

Sistemul de reminder-uri automate oferă o soluție completă pentru notificarea pacienților despre programările viitoare, integrându-se perfect cu sistemul existent de confirmare și automatizare.

