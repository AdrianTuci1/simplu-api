# Rating System Implementation

## Overview
Sistem complet de rating pentru programări care permite trimiter

ea automată de email-uri către pacienți după finalizarea programărilor pentru a colecta feedback.

## Architecture

### Flow
1. **Operator** marchează programarea ca "completed" în frontend
2. **App Server** (`resources.service.ts`) detectează update-ul cu status "completed"
3. **App Server** verifică configurația de rating din DynamoDB
4. Dacă rating-ul este activat, **App Server** face cerere HTTP la **AI Agent Server**
5. **AI Agent Server** generează un token unic (UUID) 
6. **AI Agent Server** trimite email către pacient cu link-ul de rating
7. Pacientul accesează link-ul și oferă rating-ul (implementare în app server - TODO)

### One-Time Link Security
- Token-ul este un UUID generat random
- Fiecare token este valid pentru o singură utilizare
- Link-ul expiră după 30 de zile
- Validarea și storage-ul rating-urilor se face în app server (nu în ai-agent-server)

## Files Modified/Created

### AI Agent Server

#### 1. `ai-agent-server/src/modules/external-apis/interfaces/external-api-config.interface.ts`
- Adăugat interfața `RatingConfig`
- Adăugat `rating` în `ExternalApiConfig`
- Adăugat variabila de template `ratingUrl`

#### 2. `ai-agent-server/src/modules/external-apis/services/external-api-config.service.ts`
- Adăugat metoda `createDefaultRatingConfig()`
- Template implicit pentru cerere rating
- Rating config este opțional și disabled by default

#### 3. `ai-agent-server/src/modules/rating/interfaces/rating.interface.ts` (NEW)
- `CreateRatingTokenDto` - DTO pentru generare token și trimitere email
- `SubmitRatingDto` - DTO pentru submitere rating (pentru app server)
- `Rating` - Interfața completă pentru rating (pentru app server)
- `RatingStats` - Statistici rating (pentru app server)

#### 4. `ai-agent-server/src/modules/rating/rating.service.ts` (NEW)
- `generateTokenAndSendEmail()` - Generează token UUID și trimite email
- Verifică dacă rating-ul este activat în config
- Trimite email folosind serviciul configurat (Gmail/SMTP)
- Procesează template-ul de email cu variabilele corespunzătoare

#### 5. `ai-agent-server/src/modules/rating/rating.controller.ts` (NEW)
- Endpoint `POST /rating/send-request` 
- Apelat de app server când o programare e marcată ca completed

#### 6. `ai-agent-server/src/modules/rating/rating.module.ts` (NEW)
- Module NestJS pentru rating
- Importă ExternalApisModule pentru acces la serviciile de email

#### 7. `ai-agent-server/src/app.module.ts`
- Adăugat `RatingModule` în imports

### App Server

#### 1. `app/src/services/external-api-config.service.ts`
- Actualizat interfața `ExternalApiConfig` pentru a include `rating?`
- Rating config este opțional pentru backwards compatibility

#### 2. `app/src/modules/resources/resources.service.ts`
- Adăugat hook pentru detectarea când appointment status devine "completed"
- Metoda `sendRatingRequest()` care:
  - Verifică dacă rating-ul este activat
  - Extrage datele programării (patient, date, etc.)
  - Face cerere POST la ai-agent-server `/rating/send-request`
  - Nu blochează update-ul appointment-ului dacă trimiterea eșuează

## Configuration

### Environment Variables

#### AI Agent Server
```env
APP_SERVER_URL=https://api.simplu.io  # URL-ul unde se va genera link-ul de rating
```

#### App Server
```env
AI_AGENT_SERVER_URL=http://localhost:3002  # URL-ul ai-agent-server pentru cereri
```

### DynamoDB Configuration

Configurația se stochează în tabelul `business-external-api-config`:

```json
{
  "businessId": "business-123",
  "locationId": "default",
  "rating": {
    "enabled": true,
    "sendOnCompletion": true,
    "defaultTemplate": "default",
    "templates": [
      {
        "id": "default",
        "name": "Cerere Rating Implicit",
        "subject": "Cum a fost experiența ta la {{locationName}}?",
        "content": "...",
        "variables": ["patientName", "locationName", "appointmentDate", "appointmentTime", "ratingUrl", "phoneNumber"]
      }
    ],
    "allowAnonymous": true
  }
}
```

## API Endpoints

### AI Agent Server

#### POST `/rating/send-request`
Generează token și trimite email de rating.

**Request Body:**
```json
{
  "businessId": "business-123",
  "locationId": "location-456",
  "appointmentId": "apt-789",
  "patientId": "patient-111",
  "patientName": "Ion Popescu",
  "patientEmail": "ion@example.com",
  "appointmentDate": "15 ianuarie 2024",
  "appointmentTime": "14:30"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating request email sent successfully",
  "token": "uuid-generated-token"
}
```

## Template Variables

Template-urile de email pentru rating suportă următoarele variabile:

- `{{patientName}}` - Numele pacientului
- `{{locationName}}` - Numele locației
- `{{appointmentDate}}` - Data programării (format: "15 ianuarie 2024")
- `{{appointmentTime}}` - Ora programării (format: "14:30")
- `{{ratingUrl}}` - Link-ul one-time pentru rating
- `{{phoneNumber}}` - Număr de telefon pentru contact

## Email Template Example

```
Salut {{patientName}},

Mulțumim că ai ales {{locationName}}!

Programarea ta din data de {{appointmentDate}} la ora {{appointmentTime}} a fost marcată ca finalizată.

Ne-ar ajuta enorm dacă ne-ai putea oferi un scurt feedback despre experiența ta:

🔗 Oferă-ne un rating: {{ratingUrl}}

Link-ul este valabil pentru o singură utilizare și este disponibil timp de 30 de zile.

Feedback-ul tău ne ajută să îmbunătățim constant serviciile noastre.

Cu stimă,
Echipa {{locationName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dacă ai întrebări, ne poți contacta la {{phoneNumber}}.
```

## App Server Endpoints (Implemented)

### Public Rating Endpoints

#### GET `/patient-booking/rating/:businessId-:locationId/:token`
Verifică validitatea token-ului și returnează detalii despre programare.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "apt-123",
    "patientName": "Ion Popescu",
    "appointmentDate": "15 ianuarie 2024",
    "appointmentTime": "14:30",
    "locationName": "Sediul Central"
  }
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid rating token"
- `400 Bad Request` - "This rating link has already been used"
- `400 Bad Request` - "This rating link has expired"

#### POST `/patient-booking/rating/:businessId-:locationId/:token/submit`
Submitere rating pentru programare.

**Request Body:**
```json
{
  "score": 5,
  "comment": "Experiență excelentă!",
  "categories": {
    "service": 5,
    "cleanliness": 5,
    "staff": 5,
    "waitTime": 4
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "requestId": "1234567890"
}
```

**Validation:**
- `score`: required, 1-5
- `comment`: optional, string
- `categories.*`: optional, 1-5 each

### Resource Storage

Rating-urile sunt stocate ca resursă de tip `rating` în PostgreSQL prin Kinesis:

**Rating Resource Structure:**
```json
{
  "resourceType": "rating",
  "data": {
    "token": "uuid-token",
    "tokenUsed": false,
    "tokenExpiresAt": "2024-02-15T10:00:00Z",
    "appointmentId": "apt-123",
    "patientId": "patient-456",
    "patientName": "Ion Popescu",
    "patientEmail": "ion@example.com",
    "appointmentDate": "15 ianuarie 2024",
    "appointmentTime": "14:30",
    "locationName": "Sediul Central",
    "businessName": "Clinica Dentară",
    "score": 5,
    "comment": "Experiență excelentă!",
    "categories": {
      "service": 5,
      "cleanliness": 5,
      "staff": 5,
      "waitTime": 4
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "submittedAt": "2024-01-15T14:30:00Z"
  }
}
```

## Next Steps (TODO)

1. **Endpoint pentru statistici rating** (authorizat)
   - `GET /api/resources/:businessId-:locationId?resourceType=rating`
   - Folosește endpoint-ul existent de resurse
   - Statistici calculate pe frontend sau endpoint separat:
     - Media rating-urilor
     - Distribuție (câte rating-uri 1-5 stele)
     - Total rating-uri

2. **Frontend pentru submitere rating**
   - Pagină publică accesibilă via link din email
   - Form simplu cu stele (1-5)
   - Câmp opțional pentru comentarii
   - Categorii opționale (service, cleanliness, staff, wait time)
   - Preview detalii programare (nume pacient, dată, oră)

3. **Dashboard pentru viewing ratings** (authorizat)
   - Vizualizare rating-uri în dashboard-ul de administrare
   - Filtrare după dată, score, etc.
   - Grafice și statistici

## Testing

### Manual Testing Flow

1. Pornește ambele servere (app + ai-agent-server)
2. Activează rating în config pentru un business
3. Creează o programare cu email valid
4. Marchează programarea ca "completed"
5. Verifică că emailul a fost trimis
6. Accesează link-ul din email (ar trebui să afișeze eroare deocamdată - TODO)

### Example PATCH Request
```bash
PATCH /api/resources/:businessId-:locationId
Content-Type: application/json
Authorization: Bearer <token>
X-Business-ID: <businessId>
X-Location-ID: <locationId>
X-Resource-Type: appointment

{
  "operation": "patch",
  "data": {
    "id": "appointment-123",
    "status": "completed"
  }
}
```

## Security Considerations

1. **Token Security**
   - Token-uri UUID v4 random (imposibil de ghicit)
   - One-time use (o dată folosit nu mai e valid)
   - Expirare după 30 zile

2. **Rate Limiting** (TODO)
   - Limitare requests per IP pentru submitere rating
   - Prevenție spam/abuse

3. **Data Validation**
   - Validare email format
   - Validare rating score (1-5)
   - Sanitizare comentarii

## Notes

- Rating-ul este complet opțional și nu afectează funcționalitatea existentă
- Dacă trimiterea email-ului eșuează, appointment-ul tot se marchează ca completed
- Config-ul de rating folosește același sistem de template-uri ca SMS/Email
- Token-urile nu se stochează în ai-agent-server, doar în app server (după submitere)

