# Patient Access Code System

## Prezentare Generală

Sistemul de coduri de acces pentru pacienți permite trimiterea unui cod unic de 6 cifre prin SMS și email, care poate fi folosit pentru accesarea paginii personale a pacientului.

## Funcționalități

Pacientul poate folosi codul de acces pentru:
- ✅ Vizualizarea programărilor
- ✅ Anularea programărilor
- ✅ Accesarea planului de tratament
- ✅ Vizualizarea istoricului de programări
- ✅ Accesarea facturilor

## Structura URL

### Format General
```
https://{domainLabel}.simplu.io/{location-formatted}/details?patient{patientId}
```

### Exemplu Concret
```
https://clinica-alfa.simplu.io/sediu-central/details?patient00123
```

### Componente

1. **domainLabel**: Domain-ul afacerii (ex: `clinica-alfa`)
2. **location-formatted**: Numele locației formatat pentru URL:
   - Lowercase
   - Spații înlocuite cu `-`
   - Diacritice eliminate
   - Caractere speciale eliminate
   - Ex: "Sediu Central" → "sediu-central"
3. **patientId**: ID-ul unic al pacientului

## Generarea Codului de Acces

### Algoritm
Codul este generat folosind un hash simplu bazat pe:
- `patientId`
- `appointmentId` (opțional)

```typescript
// Cod de 6 cifre numeric
generateAccessCode(patientId: string, appointmentId?: string): string
```

### Exemplu
```
Input: patientId = "00123", appointmentId = "apt-456"
Output: "847293"
```

## Structura Mesajelor

### SMS Template

```
Salut {{patientName}}! Programarea ta la {{locationName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}.

Codul tău de acces: {{accessCode}}
Link: {{patientUrl}}

Te așteptăm!
```

### Email Template

```
Salut {{patientName}},

Programarea ta la {{locationName}} a fost confirmată cu succes!

Detalii programare:
- Data: {{appointmentDate}}
- Ora: {{appointmentTime}}
- Serviciu: {{serviceName}}
- Doctor: {{doctorName}}
- Adresă: {{address}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 CODUL TĂU DE ACCES: {{accessCode}}

Folosește acest cod pentru a accesa pagina ta de pacient unde poți:
• Vedea programările tale
• Anula programări
• Vezi planul de tratament
• Accesa istoric și facturi

🔗 Link rapid: {{patientUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dacă ai întrebări, ne poți contacta la {{phoneNumber}}.

Cu stimă,
Echipa {{locationName}}
```

## Template Variables Disponibile

| Variabilă | Descriere | Exemplu | Obligatorie |
|-----------|-----------|---------|-------------|
| `patientName` | Numele pacientului | Ion Popescu | ✅ Da |
| `appointmentDate` | Data programării | 15 ianuarie 2024 | ✅ Da |
| `appointmentTime` | Ora programării | 14:30 | ✅ Da |
| `locationName` | Numele locației | Sediu Central | ❌ Nu |
| `businessName` | Numele afacerii | Clinica Alfa | ❌ Nu |
| `serviceName` | Numele serviciului | Consult stomatologic | ❌ Nu |
| `doctorName` | Numele doctorului | Dr. Popescu | ❌ Nu |
| `phoneNumber` | Telefon contact | +40 721 234 567 | ❌ Nu |
| `address` | Adresa locației | Str. Principală nr. 10 | ❌ Nu |
| `accessCode` | Cod de acces pacient | 847293 | ❌ Nu |
| `patientUrl` | URL pagina pacient | https://... | ❌ Nu |

## Utilizare API

### Request pentru Confirmare Programare

```javascript
POST /message-automation/:businessId/send-booking-confirmation?locationId={locationId}

{
  "patientName": "Ion Popescu",
  "patientEmail": "ion@example.com",
  "patientPhone": "+40721234567",
  "patientId": "00123",              // NECESAR pentru cod acces
  "appointmentId": "apt-456",         // OPTIONAL
  "domainLabel": "clinica-alfa",      // NECESAR pentru URL (sau se ia din business info)
  "appointmentDate": "15 ianuarie 2024",
  "appointmentTime": "14:30",
  "serviceName": "Consult stomatologic",
  "doctorName": "Dr. Popescu"
}
```

### Câmpuri Importante

#### `patientId` (NECESAR pentru cod acces)
- ID unic al pacientului în sistem
- Folosit pentru generarea codului de acces
- Folosit în URL-ul pacientului

#### `appointmentId` (OPTIONAL)
- ID unic al programării
- Folosit pentru generarea unui cod de acces mai specific
- Dacă lipsește, codul se generează doar pe baza `patientId`

#### `domainLabel` (NECESAR pentru URL)
- Se poate trimite în request SAU
- Se ia automat din business info din DynamoDB
- Domain-ul subdomeniului (ex: "clinica-alfa" pentru clinica-alfa.simplu.io)

## Fluxul de Date

```
1. Request API cu patientId, appointmentId, domainLabel
   ↓
2. Enrich cu business info din DynamoDB (obține domainLabel dacă lipsește)
   ↓
3. Generare accessCode (hash de patientId + appointmentId)
   ↓
4. Generare patientUrl (format: https://domain/location/details?patientId)
   ↓
5. Build template variables (include accessCode și patientUrl)
   ↓
6. Process templates pentru SMS și Email
   ↓
7. Trimitere mesaje prin Gmail API / AWS SNS
```

## Business Info Structure

Pentru ca sistemul să funcționeze corect, business info din DynamoDB trebuie să conțină:

```typescript
{
  businessId: "bus-123",
  businessName: "Clinica Alfa",
  domainLabel: "clinica-alfa",  // IMPORTANT!
  locations: [
    {
      locationId: "loc-001",
      name: "Sediu Central",      // Folosit pentru URL și template
      address: "Str. Principală nr. 10",
      phone: "+40721234567"
    }
  ]
}
```

## Configurare Environment Variables

```bash
# În .env sau variabile de mediu
BASE_DOMAIN=simplu.io
```

## Securitate

### Codul de Acces
- **6 cifre numerice** generate prin hash
- **Deterministic**: Același patientId + appointmentId vor genera același cod
- **Nu expiră** (configurat pentru persistență)
- Pentru securitate mai mare, backend-ul trebuie să valideze codul cu userId-ul

### Recommendations
Pentru production, consideră:
- Adăugarea unui TTL (time-to-live) pentru coduri
- Folosirea JWT în loc de hash simplu
- Rate limiting pentru validarea codurilor
- Logging pentru tentativele de acces

## Testing

### Test SMS/Email cu Cod de Acces

```bash
curl -X POST http://localhost:3003/message-automation/bus-123/send-booking-confirmation?locationId=loc-001 \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Ion Popescu",
    "patientEmail": "ion@example.com",
    "patientPhone": "+40721234567",
    "patientId": "00123",
    "appointmentId": "apt-456",
    "domainLabel": "clinica-test",
    "appointmentDate": "15 ianuarie 2024",
    "appointmentTime": "14:30",
    "serviceName": "Consult medical",
    "doctorName": "Dr. Popescu"
  }'
```

### Verificare Cod Generat

Codul va fi vizibil în:
- SMS primit de pacient
- Email primit de pacient
- Loguri server: `accessCode: "XXXXXX"`

## Troubleshooting

### Codul de acces nu apare în mesaje

**Verifică:**
1. `patientId` este prezent în request
2. `domainLabel` este setat (în request sau business info)
3. `locationName` este disponibil
4. Verifică logurile: `accessCode: ""`

### URL-ul nu se generează corect

**Verifică:**
1. `domainLabel` în business info
2. `locationName` nu este gol
3. `BASE_DOMAIN` environment variable
4. Format location: diacritice și spații sunt corect eliminate

### Mesajele nu se trimit

**Verifică:**
1. Gmail OAuth este configurat pentru location
2. SMS credentials (AWS SNS/Twilio) sunt configurate
3. Config enable: `sms.enabled` și `email.enabled`
4. `sendOnBooking` este true

## Exemple de Output

### Exemplu URL Generat
```
Input:
  domainLabel: "clinica-alfa"
  locationName: "Sediu Central"
  patientId: "00123"

Output:
  https://clinica-alfa.simplu.io/sediu-central/details?patient00123
```

### Exemplu Location Formatting
```
"Sediu Central"      → "sediu-central"
"Cabinet Principal"  → "cabinet-principal"
"Clinică Mamaia"     → "clinica-mamaia"
"Locație #1 - Nord"  → "locatie-1-nord"
```

## Integration Frontend

Frontend-ul trebuie să implementeze:

1. **Pagina `/[location]/details`**
   - Primește `?patient{patientId}` din query string
   - Solicită cod de acces de 6 cifre de la utilizator
   - Validează codul împotriva patientId

2. **API Validation Endpoint**
   ```typescript
   POST /api/validate-access
   {
     patientId: "00123",
     accessCode: "847293"
   }
   ```

3. **Features După Autentificare**
   - Vizualizare programări
   - Anulare programări
   - Plan tratament
   - Istoric
   - Facturi

## Notes

- Codul de acces este **deterministic** - același pentru același pacient
- Pentru securitate sporită, consideră JWT sau token-uri cu expirare
- Frontend-ul trebuie să implementeze validarea codului
- Păstrează patientId securizat și nu-l expune în frontend fără validare

