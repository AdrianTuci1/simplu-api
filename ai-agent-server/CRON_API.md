# Cron Jobs API Documentation

## Overview
API-ul pentru Cron Jobs permite gestionarea și monitorizarea job-urilor programate din sistemul AI Agent.

## Base URL
```
http://localhost:3001/cron
```

## Endpoint-uri

### 1. Status General

#### GET /cron/status
Returnează statusul general al sistemului de cron jobs.

**Response:**
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
    },
    {
      "name": "check-inactive-sessions",
      "schedule": "0 */6 * * *",
      "description": "Check inactive sessions every 6 hours"
    }
  ]
}
```

### 2. Health Check

#### GET /cron/health
Returnează informații despre sănătatea sistemului de cron jobs.

**Response:**
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

### 3. Metrics

#### GET /cron/metrics
Returnează metrici despre execuția job-urilor.

**Response:**
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

## Job Triggers

### Cleanup Jobs

#### POST /cron/trigger/cleanup-sessions
Trigger manual pentru cleanup-ul sesiunilor rezolvate.

**Response:**
```json
{
  "message": "Session cleanup triggered successfully"
}
```

#### POST /cron/trigger/cleanup-old-messages
Trigger manual pentru cleanup-ul mesajelor vechi.

**Response:**
```json
{
  "message": "Old messages cleanup triggered successfully"
}
```

#### POST /cron/trigger/cleanup-old-sessions
Trigger manual pentru cleanup-ul sesiunilor vechi.

**Response:**
```json
{
  "message": "Old sessions cleanup triggered successfully"
}
```

#### POST /cron/trigger/cleanup-expired-credentials
Trigger manual pentru cleanup-ul credențialelor expirate.

**Response:**
```json
{
  "message": "Expired credentials cleanup triggered successfully"
}
```

### Session Management Jobs

#### POST /cron/trigger/check-inactive-sessions
Trigger manual pentru verificarea sesiunilor inactive.

**Response:**
```json
{
  "message": "Inactive sessions check triggered successfully"
}
```

#### POST /cron/trigger/check-abandoned-sessions
Trigger manual pentru verificarea sesiunilor abandonate.

**Response:**
```json
{
  "message": "Abandoned sessions check triggered successfully"
}
```

#### POST /cron/trigger/check-error-sessions
Trigger manual pentru verificarea sesiunilor cu erori.

**Response:**
```json
{
  "message": "Error sessions check triggered successfully"
}
```

### Communication Jobs

#### POST /cron/trigger/reservation-reminders
Trigger manual pentru trimiterea reminder-urilor de rezervări.

**Response:**
```json
{
  "message": "Reservation reminders triggered successfully"
}
```

#### POST /cron/trigger/daily-report
Trigger manual pentru generarea raportului zilnic.

**Response:**
```json
{
  "message": "Daily report triggered successfully"
}
```

### System Jobs

#### POST /cron/trigger/validate-credentials
Trigger manual pentru validarea credențialelor API.

**Response:**
```json
{
  "message": "Credentials validation triggered successfully"
}
```

#### POST /cron/trigger/sync-credentials
Trigger manual pentru sincronizarea credențialelor.

**Response:**
```json
{
  "message": "Credentials sync triggered successfully"
}
```

#### POST /cron/trigger/backup-data
Trigger manual pentru backup-ul datelor.

**Response:**
```json
{
  "message": "Data backup triggered successfully"
}
```

#### POST /cron/trigger/check-system-performance
Trigger manual pentru verificarea performanței sistemului.

**Response:**
```json
{
  "message": "System performance check triggered successfully"
}
```

### Processing Jobs

#### POST /cron/trigger/check-unprocessed-messages
Trigger manual pentru verificarea mesajelor neprocesate.

**Response:**
```json
{
  "message": "Unprocessed messages check triggered successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Bad Request"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## Programări Job-uri

| Job | Programare | Descriere |
|-----|------------|-----------|
| cleanup-resolved-sessions | `0 2 * * *` | Zilnic la 02:00 |
| check-inactive-sessions | `0 */6 * * *` | La fiecare 6 ore |
| reservation-reminders | `0 */2 * * *` | La fiecare 2 ore |
| backup-data | `0 3 * * *` | Zilnic la 03:00 |
| validate-credentials | `0 4 * * *` | Zilnic la 04:00 |
| daily-report | `0 8 * * *` | Zilnic la 08:00 |
| check-system-performance | `*/30 * * * *` | La fiecare 30 minute |
| check-abandoned-sessions | `0 */4 * * *` | La fiecare 4 ore |
| sync-credentials | `0 */12 * * *` | La fiecare 12 ore |
| check-unprocessed-messages | `*/30 * * * *` | La fiecare 30 minute |
| check-error-sessions | `0 */2 * * *` | La fiecare 2 ore |
| cleanup-old-messages | `0 0 * * 0` | Săptămânal |
| cleanup-old-logs | `0 0 1 * *` | Lunar |
| optimize-database | `0 0 * * 0` | Săptămânal |
| cleanup-old-sessions | `0 0 1 * *` | Lunar |
| cleanup-expired-credentials | `0 1 * * *` | Zilnic la 01:00 |

## Testare

### Testare Toate Job-urile
```bash
npm run test:cron
```

### Testare Job Specific
```bash
npm run test:cron:job cleanup-sessions
```

### Testare Manuală cu cURL
```bash
# Testare status
curl -X GET http://localhost:3001/cron/status

# Testare trigger job
curl -X POST http://localhost:3001/cron/trigger/cleanup-sessions

# Testare health
curl -X GET http://localhost:3001/cron/health

# Testare metrics
curl -X GET http://localhost:3001/cron/metrics
```

## Monitorizare

### Logs
Toate job-urile loghează activitatea folosind NestJS Logger:
- `INFO`: Job-uri executate cu succes
- `WARN`: Avertismente (ex: credențiale invalide)
- `ERROR`: Erori în execuția job-urilor

### Metrici
Sistemul colectează automat:
- Numărul de job-uri executate
- Timpul de execuție
- Rate-ul de succes
- Utilizarea resurselor

### Alerte
Sistemul trimite alerte când:
- Utilizarea memoriei depășește threshold-ul
- Job-urile eșuează repetat
- Performanța sistemului se degradează

## Configurare

### Variabile de Mediu
```env
# Activare/Dezactivare cron jobs
CRON_ENABLED=true

# Timezone
CRON_TIMEZONE=Europe/Bucharest

# Threshold-uri pentru alerte
CRON_MEMORY_THRESHOLD_MB=500
CRON_CPU_THRESHOLD_PERCENT=80

# Configurare backup
CRON_BACKUP_ENABLED=true
CRON_BACKUP_RETENTION_DAYS=30

# Configurare cleanup
CRON_CLEANUP_RESOLVED_SESSIONS_DAYS=30
CRON_CLEANUP_OLD_SESSIONS_DAYS=180
CRON_CLEANUP_INACTIVE_SESSIONS_HOURS=24
CRON_CLEANUP_ABANDONED_SESSIONS_HOURS=48
CRON_CLEANUP_OLD_MESSAGES_DAYS=90
CRON_CLEANUP_OLD_LOGS_DAYS=30

# Configurare reminder-uri
CRON_REMINDERS_ENABLED=true
CRON_REMINDERS_HOURS_BEFORE=2

# Configurare rapoarte
CRON_REPORTS_ENABLED=true
CRON_REPORTS_RECIPIENTS=admin@example.com,manager@example.com

# Configurare monitorizare
CRON_MONITORING_ENABLED=true
CRON_MONITORING_CHECK_INTERVAL_MINUTES=30
```

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