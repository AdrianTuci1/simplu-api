### Business Creation API

- **Endpoint**: `POST /businesses`
- **Auth**: Bearer token (Cognito). Include header `Authorization: Bearer <access_token>`

### Request Body Schema

- **companyName** (string, required): Numele companiei
- **registrationNumber** (string, required): CUI/număr înregistrare
- **businessType** (enum, required): `dental` | `gym` | `hotel`
- **locations** (array<LocationInfo>, required): Lista locațiilor
  - **name** (string, required)
  - **address** (string, required)
  - **phone** (string, optional)
  - **email** (string, optional)
  - **timezone** (string, optional, default: `Europe/Bucharest`)
  - **active** (boolean, optional, default: `true`)
- **settings** (object, optional) – dacă nu sunt setate, se folosesc valorile implicite de mai jos
  - **currency** (string, default: `RON`)
  - **language** (string, default: `ro`)
  - **dateFormat** (string, default: `yyyy-mm-dd`)
  - **timeFormat** (string, default: `hh:mm` în format 24h)
  - **workingHours** (map, optional, default: zile lucrătoare 09:00–18:00, sâmbătă 09:00–14:00, duminică închis)
- **deactivatedModules** (string[], optional): Module care vor fi dezactivate pentru acest business
- **customDomain** (string, optional)
- **configureForEmail** (string, optional): Dacă este setat, business-ul este creat pentru altă persoană (owner), care va primi email de activare. Proprietarul finalizează onboarding-ul și adaugă cardul.
- **authorizedEmails** (string[], optional): Alte adrese care pot accesa business-ul.

Notă:
- Nu este necesar `stripeCustomerId`; clientul și subscriptia sunt create automat.

### Exemplu – configurare pentru propriul cont

```json
{
  "companyName": "Clinica Dentară Alba",
  "registrationNumber": "RO12345678",
  "businessType": "dental",
  "locations": [
    {
      "name": "Sediu Central",
      "address": "Str. Exemplu 10, București",
      "email": "recepție@clinica.ro"
    }
  ],
  "settings": {
    "currency": "RON",
    "language": "ro",
    "dateFormat": "yyyy-mm-dd",
    "timeFormat": "hh:mm"
  },
  "deactivatedModules": ["invoices"]
}
```

### Exemplu – configurare pentru alt cont (moderatorul creează, firma activează)

```json
{
  "companyName": "Hotel Carpatin",
  "registrationNumber": "RO99887766",
  "businessType": "hotel",
  "locations": [
    {
      "name": "Recepție Centrală",
      "address": "Bd. Libertății 15, Brașov"
    }
  ],
  "configureForEmail": "contact@carpatin.ro",
  "authorizedEmails": ["manager@carpatin.ro", "contabilitate@carpatin.ro"]
}
```

### Răspuns (rezumat)

```json
{
  "businessId": "uuid",
  "businessName": "...",
  "businessType": "dental|gym|hotel",
  "ownerEmail": "contact@exemplu.ro",
  "ownerUserId": null,
  "createdByUserId": "user-creator-id",
  "isActivated": false,
  "activationUrl": "https://app.simplu.ro/activate?token=...",
  "locations": [...],
  "settings": {
    "currency": "RON",
    "language": "ro",
    "dateFormat": "yyyy-mm-dd",
    "timeFormat": "hh:mm",
    "workingHours": { ... }
  },
  "paymentStatus": "active|past_due|canceled|unpaid",
  "status": "active",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Flux de activare (owner)

- **Email automat** către `configureForEmail` (sau utilizatorul curent dacă nu e setat), cu `activationUrl`.
- **Endpoint**: `POST /businesses/activate/:token`
  - **Auth**: Bearer token al persoanei care activează
  - Efect: setează `ownerUserId` = `req.user.userId`, `isActivated` = `true`, invalidează token-ul.

### Acces la business-uri

- `GET /businesses` returnează business-urile unde:
  - `ownerUserId === req.user.userId`, sau
  - `ownerEmail === req.user.email`, sau
  - `authorizedEmails` conține `req.user.email`.

### Observații

- `timezone` implicit: `Europe/Bucharest`.
- Valorile implicite pentru `settings` se aplică dacă câmpul lipsește.
- Dacă `customDomain` este setat, se face configurarea DNS corespunzătoare.
