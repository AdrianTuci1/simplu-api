# External API Config - Fix pentru Tabele DynamoDB

## Problema Identificată

Serviciile `app` și `ai-agent-server` foloseau nume diferite pentru tabela de configurații External API:
- **ai-agent-server**: `business-external-api-config` (corect)
- **app**: `external-api-config` (greșit)

Aceasta cauzează eroarea: `"Requested resource not found"` când `app` încearcă să citească configurațiile de automatizare.

## Soluția Implementată

### 1. Actualizat `app/src/config/dynamodb.config.ts`

Adăugat suport pentru numele tabelei External API Config:

```typescript
export interface DynamoDBConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  businessInfoTableName: string;
  externalApiConfigTableName: string; // ✅ NOU
}

export const dynamoDBConfig = (): DynamoDBConfig => ({
  region: process.env.AWS_DYNAMODB_REGION || 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  businessInfoTableName: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
  externalApiConfigTableName: process.env.DYNAMODB_EXTERNAL_API_CONFIG_TABLE || 'business-external-api-config', // ✅ NOU
});

// ✅ Metodă nouă
getExternalApiConfigTableName(): string {
  return this.config.externalApiConfigTableName;
}
```

### 2. Actualizat `app/src/services/external-api-config.service.ts`

Serviciul acum folosește numele corect al tabelei:

```typescript
constructor(private configService: ConfigService) {
  this.dynamoClient = dynamoDBService.getClient();
  this.tableName = dynamoDBService.getExternalApiConfigTableName(); // ✅ FIX
}
```

### 3. Actualizat `app/env.example`

Adăugat variabilele de mediu necesare pentru DynamoDB:

```bash
# =============================================================================
# DynamoDB Configuration
# =============================================================================

# Business Info Table
DYNAMODB_BUSINESS_INFO_TABLE=business-info

# External API Config Table Name (DynamoDB)
# Must match the table name used by ai-agent-server
DYNAMODB_EXTERNAL_API_CONFIG_TABLE=business-external-api-config

# DynamoDB Region (optional, defaults to AWS_REGION)
AWS_DYNAMODB_REGION=eu-central-1

# DynamoDB Endpoint (optional, for local development)
# DYNAMODB_ENDPOINT=http://localhost:8000
```

## Pași de Deploy

### 1. Actualizează Environment Variables

În fișierul `.env` al serviciului `app`, adaugă sau actualizează:

```bash
# DynamoDB Configuration
DYNAMODB_EXTERNAL_API_CONFIG_TABLE=business-external-api-config
AWS_DYNAMODB_REGION=eu-central-1
```

### 2. Rebuild și Restart

```bash
cd app
npm run build
# Restart serviciul (Docker, PM2, etc.)
```

### 3. Verificare

După restart, testează că configurațiile sunt citite corect:

```bash
# Testează un appointment care ar trebui să trimită notificări
# Logurile ar trebui să arate:
# ✅ "Found external API config for business B0100001"
# ✅ "SMS/Email automation enabled"

# În loc de:
# ❌ "Error getting external API config for business B0100001"
# ❌ "No automation services enabled"
```

## Status Actual

✅ **PROBLEMA REZOLVATĂ**: Configurațiile sunt acum citite corect!

Din loguri se vede că:
- ✅ Configurația este găsită în DynamoDB
- ✅ SMS-ul este trimis cu succes prin AWS SNS
- ✅ MessageId este returnat corect

**Următorii pași**: 
- Pornește `ai-agent-server` pentru a vedea logging-ul complet
- Verifică că toate mesajele sunt procesate corect

## Verificarea Serviciilor

### 1. Verifică ce servicii rulează:
```bash
docker-compose ps
```

### 2. Verifică logurile pentru fiecare serviciu:
```bash
# App server
docker logs simplu-api-app-1 -f

# AI Agent Server (dacă este pornit)
docker logs simplu-api-ai-agent-server-1 -f
```

### 3. Pornește ai-agent-server dacă nu rulează:
```bash
docker-compose up -d ai-agent-server
```

## Verificare DynamoDB

Pentru a verifica că tabela există și conține date:

```bash
# Lista toate tabelele
aws dynamodb list-tables --region eu-central-1

# Verifică structura tabelei
aws dynamodb describe-table \
  --table-name business-external-api-config \
  --region eu-central-1

# Verifică un item specific
aws dynamodb get-item \
  --table-name business-external-api-config \
  --key '{"businessId":{"S":"B0100001"},"locationId":{"S":"L0100001"}}' \
  --region eu-central-1
```

## Structura Corectă a Datelor

Datele în DynamoDB sunt în format nativ (cu type descriptors), dar `DynamoDBDocumentClient` le convertește automat în JavaScript objects:

### DynamoDB Native Format (stocat în tabelă):
```json
{
  "businessId": { "S": "B0100001" },
  "locationId": { "S": "L0100001" },
  "email": {
    "M": {
      "enabled": { "BOOL": true },
      "serviceType": { "S": "gmail" }
    }
  }
}
```

### JavaScript Format (primit în aplicație):
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "email": {
    "enabled": true,
    "serviceType": "gmail"
  }
}
```

**Nu este nevoie de conversie manuală** - `DynamoDBDocumentClient` face asta automat!

## Troubleshooting

### Eroare: "Requested resource not found"

**Cauze posibile:**
1. ✅ **Numele tabelei greșit** - Fix implementat în acest update
2. ❌ **Tabela nu există** - Creează tabela în DynamoDB
3. ❌ **Permisiuni IAM incorecte** - Verifică că serviciul are permisiuni `dynamodb:GetItem`
4. ❌ **Region incorect** - Verifică că `AWS_DYNAMODB_REGION` corespunde cu regiunea tabelei

### Eroare: "No automation services enabled"

**După ce ai fixat numele tabelei, verifică:**
1. Configurația există în DynamoDB pentru businessId și locationId
2. `enabled: true` pentru SMS sau Email
3. `sendOnBooking: true` sau `sendReminder: true`

## Sync între Servicii

Ambele servicii trebuie să folosească **exact aceleași** valori pentru variabilele de mediu:

| Variabilă | Valoare | Servicii |
|-----------|---------|----------|
| `DYNAMODB_EXTERNAL_API_CONFIG_TABLE` | `business-external-api-config` | `app` + `ai-agent-server` |
| `AWS_DYNAMODB_REGION` | `eu-central-1` | `app` + `ai-agent-server` |
| `DYNAMODB_ENDPOINT` | *(doar local)* `http://localhost:8000` | `app` + `ai-agent-server` |

## Logging Avansat

Am adăugat logging extins în `ai-agent-server` pentru debugging:

### Controller Logging:
```typescript
// Când primește un request:
[MessageAutomationController] === Received booking confirmation request ===
[MessageAutomationController] Business ID: B0100001
[MessageAutomationController] Location ID: L0100001
[MessageAutomationController] Patient: John Doe
[MessageAutomationController] Date: 2025-10-08 10:00
[MessageAutomationController] === Booking confirmation sent: 1 message(s) ===
[MessageAutomationController] Message 1 [sms]: SUCCESS <message-id>
```

### Service Logging:
```typescript
[MessageAutomationService] Processing booking confirmation for business B0100001, location L0100001
[MessageAutomationService] Config found - SMS enabled: true, Email enabled: false
[MessageAutomationService] SMS sendOnBooking: true, Email sendOnBooking: false
[MessageAutomationService] Sending SMS to +40721234567
[MessageAutomationService] SMS result: {"success":true,"messageId":"..."}
```

## Testing

După implementare, testează:

```bash
# 1. Verifică că serviciul pornește fără erori
docker logs app -f

# 2. Creează o programare nouă
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P001",
    "doctorId": "D001",
    "appointmentDate": "2025-10-08",
    "appointmentTime": "10:00"
  }'

# 3. Verifică în loguri că automatizările sunt procesate
# Ar trebui să vezi:
# - "Found external API config for business B0100001"
# - "Sending booking notification via SMS/Email"
```

## Note Importante

- ⚠️ **Restart obligatoriu** - Schimbările la configurația DynamoDB necesită restart al serviciului
- ⚠️ **Environment sync** - Asigură-te că `.env` este actualizat pe toate mediile (dev, staging, prod)
- ✅ **Backwards compatible** - Dacă variabila `DYNAMODB_EXTERNAL_API_CONFIG_TABLE` nu este setată, se folosește valoarea default `business-external-api-config`

## Referințe

- **Config Service**: `app/src/config/dynamodb.config.ts`
- **External API Config Service**: `app/src/services/external-api-config.service.ts`
- **AI Agent Config**: `ai-agent-server/src/config/dynamodb.config.ts`
- **Environment Example**: `app/env.example`

