# Cron Jobs Service

## Descriere
Modulul Cron Jobs Service implementează sistemul de job-uri programate pentru automatizarea acțiunilor repetitive și mentenanța sistemului.

## Job-uri Programate

### Job-uri Principale (CronService)

#### 1. Cleanup Sesiuni Rezolvate
- **Programare**: Zilnic la 02:00
- **Endpoint**: `POST /cron/trigger/cleanup-sessions`
- **Descriere**: Curăță sesiunile rezolvate mai vechi de 30 de zile

#### 2. Verificare Sesiuni Inactive
- **Programare**: La fiecare 6 ore
- **Endpoint**: `POST /cron/trigger/check-inactive-sessions`
- **Descriere**: Verifică și închide sesiunile inactive (fără activitate în ultimele 24 ore)

#### 3. Reminder-uri Rezervări
- **Programare**: La fiecare 2 ore
- **Endpoint**: `POST /cron/trigger/reservation-reminders`
- **Descriere**: Trimite reminder-uri automate pentru rezervările care au loc în următoarele 2 ore

#### 4. Backup Date
- **Programare**: Zilnic la 03:00
- **Endpoint**: `POST /cron/trigger/backup-data`
- **Descriere**: Realizează backup automat al datelor

#### 5. Validare Credențiale API
- **Programare**: Zilnic la 04:00
- **Endpoint**: `POST /cron/trigger/validate-credentials`
- **Descriere**: Validează credențialele API externe (Meta, Twilio)

#### 6. Raport Activitate Zilnic
- **Programare**: Zilnic la 08:00
- **Endpoint**: `POST /cron/trigger/daily-report`
- **Descriere**: Generează și trimite raportul de activitate zilnic

#### 7. Verificare Performanță Sistem
- **Programare**: La fiecare 30 minute
- **Endpoint**: `POST /cron/trigger/check-system-performance`
- **Descriere**: Monitorizează performanța sistemului și trimite alerte

### Job-uri Specifice (ScheduledTasksJob)

#### 1. Verificare Sesiuni Abandonate
- **Programare**: La fiecare 4 ore
- **Endpoint**: `POST /cron/trigger/check-abandoned-sessions`
- **Descriere**: Verifică sesiunile abandonate (fără activitate în ultimele 48 ore)

#### 2. Sincronizare Credențiale
- **Programare**: La fiecare 12 ore
- **Endpoint**: `POST /cron/trigger/sync-credentials`
- **Descriere**: Sincronizează credențialele API externe

#### 3. Verificare Mesaje Neprocesate
- **Programare**: La fiecare 30 minute
- **Endpoint**: `POST /cron/trigger/check-unprocessed-messages`
- **Descriere**: Verifică și reprocesează mesajele neprocesate

#### 4. Verificare Sesiuni cu Erori
- **Programare**: La fiecare 2 ore
- **Endpoint**: `POST /cron/trigger/check-error-sessions`
- **Descriere**: Verifică și gestionează sesiunile cu erori

### Job-uri Cleanup (CleanupJob)

#### 1. Cleanup Mesaje Vechi
- **Programare**: Săptămânal
- **Endpoint**: `POST /cron/trigger/cleanup-old-messages`
- **Descriere**: Șterge mesajele mai vechi de 90 de zile

#### 2. Cleanup Log-uri Vechi
- **Programare**: Lunar
- **Endpoint**: `POST /cron/trigger/cleanup-old-logs`
- **Descriere**: Șterge log-urile mai vechi de 30 de zile

#### 3. Optimizare Baza de Date
- **Programare**: Săptămânal
- **Endpoint**: `POST /cron/trigger/optimize-database`
- **Descriere**: Optimizează baza de date

#### 4. Cleanup Sesiuni Vechi
- **Programare**: Lunar
- **Endpoint**: `POST /cron/trigger/cleanup-old-sessions`
- **Descriere**: Șterge sesiunile mai vechi de 180 de zile

#### 5. Cleanup Credențiale Expirate
- **Programare**: Zilnic la 01:00
- **Endpoint**: `POST /cron/trigger/cleanup-expired-credentials`
- **Descriere**: Șterge credențialele expirate

## Endpoint-uri API

### Status și Monitoring

#### GET /cron/status
Returnează statusul general al sistemului de cron jobs.

**Răspuns:**
```json
{
  "status": "active",
  "lastRun": "2024-01-15T10:30:00.000Z",
  "nextRun": "2024-01-15T11:00:00.000Z",
  "jobs": [
    {
      "name": "cleanup-resolved-sessions",
      "schedule": "0 2 * * *",
      "description": "Cleanup resolved sessions daily at 2 AM"
    }
  ]
}
```

#### GET /cron/health
Returnează informații despre sănătatea sistemului de cron jobs.

**Răspuns:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memoryUsage": {
    "heapUsed": 52428800,
    "heapTotal": 104857600
  },
  "activeJobs": 16,
  "lastError": null
}
```

#### GET /cron/metrics
Returnează metrici despre execuția job-urilor.

**Răspuns:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalJobsExecuted": 150,
  "successfulJobs": 145,
  "failedJobs": 5,
  "averageExecutionTime": 2500,
  "memoryUsage": {
    "heapUsed": 52428800,
    "heapTotal": 104857600
  },
  "cpuUsage": {
    "user": 1000000,
    "system": 500000
  }
}
```

## Testare

### Rulare Teste Unitare
```bash
npm run test src/modules/cron
```

### Rulare Teste Integrare
```bash
npm run test:cron
```

### Testare Job Specific
```bash
npm run test:cron:job cleanup-sessions
```

## Configurare

### Variabile de Mediu
```env
# Configurare cron jobs
CRON_ENABLED=true
CRON_TIMEZONE=Europe/Bucharest

# Threshold-uri pentru alerte
CRON_MEMORY_THRESHOLD_MB=500
CRON_CPU_THRESHOLD_PERCENT=80

# Configurare backup
CRON_BACKUP_ENABLED=true
CRON_BACKUP_RETENTION_DAYS=30
```

### Configurare în Cod
```typescript
// src/config/cron.config.ts
export const cronConfig = {
  enabled: process.env.CRON_ENABLED === 'true',
  timezone: process.env.CRON_TIMEZONE || 'Europe/Bucharest',
  memoryThreshold: parseInt(process.env.CRON_MEMORY_THRESHOLD_MB || '500'),
  cpuThreshold: parseInt(process.env.CRON_CPU_THRESHOLD_PERCENT || '80'),
  backup: {
    enabled: process.env.CRON_BACKUP_ENABLED === 'true',
    retentionDays: parseInt(process.env.CRON_BACKUP_RETENTION_DAYS || '30')
  }
};
```

## Monitorizare și Logging

### Logging
Toate job-urile folosesc NestJS Logger pentru logging consistent:

```typescript
private readonly logger = new Logger(CronService.name);
```

### Metrici
Sistemul colectează automat metrici despre:
- Numărul de job-uri executate
- Timpul de execuție
- Rate-ul de succes
- Utilizarea resurselor

### Alerte
Sistemul trimite alerte automat când:
- Utilizarea memoriei depășește threshold-ul
- Job-urile eșuează repetat
- Performanța sistemului se degradează

## Integrare cu Alte Module

### SessionService
- Cleanup sesiuni rezolvate
- Verificare sesiuni inactive
- Actualizare status sesiuni

### ExternalApisService
- Validare credențiale
- Trimitere reminder-uri
- Sincronizare credențiale

### WebSocketGateway
- Notificări în timp real
- Broadcast rapoarte
- Alerte performanță

## Troubleshooting

### Job-uri care nu rulează
1. Verifică dacă `CRON_ENABLED=true`
2. Verifică log-urile pentru erori
3. Testează manual endpoint-ul de trigger

### Performanță degradată
1. Verifică metricile la `/cron/metrics`
2. Analizează utilizarea memoriei
3. Verifică job-urile care rulează prea des

### Credențiale invalide
1. Verifică log-urile de validare
2. Testează credențialele manual
3. Regenerează credențialele dacă este necesar

## Dezvoltare

### Adăugare Job Nou
1. Creează metoda în serviciul corespunzător
2. Adaugă decoratorul `@Cron()`
3. Implementează logging și error handling
4. Adaugă endpoint pentru trigger manual
5. Scrie teste

### Modificare Programare
1. Actualizează expresia cron în decorator
2. Actualizează documentația
3. Testează noua programare

### Debugging
1. Folosește `npm run start:debug`
2. Verifică log-urile în timp real
3. Testează job-urile manual prin API 