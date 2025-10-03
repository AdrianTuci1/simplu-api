# Database Setup Scripts

Acest director conține scripturile pentru configurarea bazei de date DynamoDB pentru sistemul de configurare API externă.

## Scripturi Disponibile

### 1. `setup-external-api-config-table.js`
Creează doar tabelul pentru configurarea API-urilor externe.

**Utilizare:**
```bash
cd ai-agent-server
node scripts/setup-external-api-config-table.js
```

### 2. `setup-all-tables.js`
Creează toate tabelele necesare pentru sistem, inclusiv tabelul pentru configurarea API-urilor externe.

**Utilizare:**
```bash
cd ai-agent-server
node scripts/setup-all-tables.js
```

### 3. `setup-dynamodb-tables.js` (actualizat)
Scriptul original actualizat cu tabelul pentru configurarea API-urilor externe.

**Utilizare:**
```bash
cd ai-agent-server
node scripts/setup-dynamodb-tables.js
```

## Configurare

### Variabile de Mediu Necesare

Asigură-te că ai următoarele variabile în fișierul `.env`:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-central-1

# DynamoDB Table Names (opțional - folosesc valorile implicite dacă nu sunt setate)
DYNAMODB_EXTERNAL_API_CONFIG_TABLE=business-external-api-config
```

### Structura Tabelului External API Config

Tabelul `business-external-api-config` are următoarea structură:

- **Partition Key**: `businessId` (String)
- **Sort Key**: `locationId` (String)
- **Billing Mode**: Pay per request

**Atribute**:
- `businessId`: ID-ul afacerii
- `locationId`: ID-ul locației (opțional, default: 'default')
- `sms`: Configurația SMS (enabled, templates, serviceType, etc.)
- `email`: Configurația Email (enabled, templates, serviceType, etc.)
- `createdAt`: Data creării
- `updatedAt`: Data ultimei actualizări
- `version`: Versiunea pentru optimistic locking

## Funcționalități

### Configurare SMS
- Template-uri personalizabile
- Integrare cu AWS SNS, Twilio, Meta
- Configurare pentru trimitere la booking și reminder-uri

### Configurare Email
- Template-uri personalizabile
- Integrare cu Gmail, SMTP
- Configurare pentru trimitere la booking și reminder-uri

### Variabile Template
Sistemul suportă următoarele variabile în template-uri:
- `{{patientName}}` - Numele pacientului
- `{{appointmentDate}}` - Data programării
- `{{appointmentTime}}` - Ora programării
- `{{businessName}}` - Numele afacerii
- `{{locationName}}` - Numele locației
- `{{serviceName}}` - Numele serviciului
- `{{doctorName}}` - Numele doctorului
- `{{phoneNumber}}` - Numărul de telefon

## Endpoint-uri API

După configurarea bazei de date, poți folosi următoarele endpoint-uri:

### Configurare Principală
- `POST /external-api-config` - Creează configurație
- `GET /external-api-config/:businessId` - Obține configurația
- `PUT /external-api-config/:businessId` - Actualizează configurația
- `DELETE /external-api-config/:businessId` - Șterge configurația

### Management Template-uri SMS
- `POST /external-api-config/:businessId/sms/templates` - Adaugă template SMS
- `PUT /external-api-config/:businessId/sms/templates/:templateId` - Actualizează template SMS
- `DELETE /external-api-config/:businessId/sms/templates/:templateId` - Șterge template SMS

### Management Template-uri Email
- `POST /external-api-config/:businessId/email/templates` - Adaugă template Email
- `PUT /external-api-config/:businessId/email/templates/:templateId` - Actualizează template Email
- `DELETE /external-api-config/:businessId/email/templates/:templateId` - Șterge template Email

### Utilitare
- `GET /external-api-config/template-variables` - Obține variabilele disponibile
- `POST /external-api-config/:businessId/process-template` - Procesează un template cu variabile

## Testare

După configurarea bazei de date, poți testa funcționalitatea:

1. **Testează crearea unei configurații:**
```bash
curl -X POST http://localhost:3000/external-api-config \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business-123",
    "sms": {
      "enabled": true,
      "sendOnBooking": true
    },
    "email": {
      "enabled": true,
      "sendOnBooking": true
    }
  }'
```

2. **Testează obținerea configurației:**
```bash
curl http://localhost:3000/external-api-config/test-business-123
```

3. **Testează variabilele template:**
```bash
curl http://localhost:3000/external-api-config/template-variables
```

## Depanare

### Probleme Comune

1. **Eroare de credențiale AWS:**
   - Verifică că `AWS_ACCESS_KEY_ID` și `AWS_SECRET_ACCESS_KEY` sunt setate corect
   - Asigură-te că credențialele au permisiuni pentru DynamoDB

2. **Tabelul deja există:**
   - Scriptul va sări peste tabelele care există deja
   - Nu va crea duplicate

3. **Eroare de regiune:**
   - Verifică că `AWS_REGION` este setat corect
   - Regiunea implicită este `eu-central-1`

### Log-uri

Scriptul va afișa log-uri detaliate pentru fiecare tabel:
- ✅ Tabel creat cu succes
- ⚠️ Tabel deja există
- ❌ Eroare la crearea tabelului

## Următorii Pași

După configurarea bazei de date:

1. Configurează credențialele pentru serviciile externe (SMS, Email)
2. Creează template-uri personalizate pentru afacerea ta
3. Testează integrarea cu serviciile externe
4. Configurează reminder-urile automate
