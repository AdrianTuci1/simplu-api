### API Business (management-server)

Documentație pentru integrarea frontend cu modulele `@business/`.

- **Base path**: `/businesses`
- **Autentificare**: Bearer JWT (Cognito)
  - Header: `Authorization: Bearer <JWT>`

### Modele (DTO-uri și răspunsuri)

- **CreateBusinessDto** (body pentru `POST /businesses`):
  ```json
  {
    "companyName": "SRL Exemplu",
    "registrationNumber": "J12/123/2024",
    "businessType": "dental", // "dental" | "gym" | "hotel"
    "companyAddress": {
      "street": "Str. Exemplu 1",
      "city": "Cluj-Napoca",
      "district": "Cluj",
      "country": "RO",
      "postalCode": "400000"
    },
    "locations": [
      {
        "name": "Clinica Centrală",
        "address": "Str. Clinicii 10",
        "phone": "+40 7xx xxx xxx",
        "email": "central@exemplu.ro",
        "timezone": "Europe/Bucharest",
        "active": true
      }
    ],
    "settings": {
      "currency": "RON",
      "language": "ro",
      "dateFormat": "yyyy-mm-dd",
      "timeFormat": "hh:mm",
      "workingHours": {
        "monday": { "open": "09:00", "close": "18:00", "isOpen": true }
      }
    },
    "deactivatedModules": [],
    "appLabel": "Aplicatia Mea",
    "authorizedEmails": ["coleg@exemplu.ro"],
    "billingEmail": "facturi@exemplu.ro",
    "configureForEmail": "owner@firma.ro", // dacă e diferit de emailul autentificat, se trimite link de activare
    "domainType": "subdomain", // "subdomain" | "custom" | (opțional dacă nu folosești domeniu)
    "domainLabel": "numele-firmei", // folosit pt subdomeniu sau împreună cu customTld
    "customTld": "ro",           // opțional; pt domeniu custom dacă nu dai direct customDomain
    "customDomain": "numele-firmei.ro", // alternativ direct domeniu custom
    "clientPageType": "website",       // "website" | "form" (poate fi ales și când nu folosești domeniu)
    "subscriptionPlanPriceId": "price_basic_monthly" // opțional; dacă lipsește se folosește default din env
  }
  ```

- **UpdateBusinessDto** (body pentru `PUT /businesses/:id`): câmpuri opționale ce pot suprascrie nume, CUI, tip, `locations`, `settings`, `deactivatedModules`, `customDomain`.

- **LocationInfoDto** (în `locations`):
  ```json
  {
    "locationId": "opțional",
    "name": "Nume locație",
    "address": "Adresă",
    "phone": "opțional",
    "email": "opțional",
    "timezone": "UTC | Europe/Bucharest",
    "active": true
  }
  ```

- **BusinessEntity** (răspuns tipic):
  ```json
  {
    "businessId": "uuid",
    "businessName": "SRL Exemplu",
    "registrationNumber": "J12/123/2024",
    "businessType": "dental",
    "companyAddress": { "street": "..", "city": "..", "district": "..", "country": "RO", "postalCode": ".." },
    "ownerUserId": "uuid sau null până la activare",
    "ownerEmail": "owner@firma.ro",
    "billingEmail": "facturi@firma.ro",
    "createdByUserId": "uuid utilizator creator",
    "isActivated": true,
    "activationUrl": "(prezent doar dacă configureForEmail ≠ emailul autentificat)",
    "authorizedEmails": ["coleg@firma.ro"],
    "locations": [ { "locationId": "..", "name": "..", "address": "..", "timezone": "..", "isActive": true } ],
    "settings": { "currency": "RON", "language": "ro", "dateFormat": "yyyy-mm-dd", "timeFormat": "hh:mm", "workingHours": { } },
    "deactivatedModules": [],
    "customDomain": "numele-firmei.ro",
    "clientPageType": "website",
    "subdomain": "numele-firmei",
    "appLabel": "Aplicatia Mea",
    "paymentStatus": "unpaid",
    "nextPaymentDate": null,
    "credits": { "totalBalance": 0, "availableBalance": 0, "currency": "RON", "lastUpdated": ".." },
    "status": "suspended", // active | suspended | deleted
    "cloudFormationStackName": "opțional",
    "reactAppUrl": "https://...",
    "createdAt": "iso",
    "updatedAt": "iso",
    "deletedAt": null
  }
  ```

### Endpoints esențiale (creare și vizualizare)

- **Create business**
  - Method: `POST`
  - Path: `/businesses`
  - Auth: Bearer
  - Body: `CreateBusinessDto`
  - Răspuns: `BusinessEntity`
  - cURL:
    ```bash
    curl -X POST "$API_URL/businesses" \
      -H "Authorization: Bearer $JWT" \
      -H "Content-Type: application/json" \
      -d '{
        "companyName": "SRL Exemplu",
        "registrationNumber": "J12/123/2024",
        "businessType": "dental",
        "locations": [{"name":"Clinica Centrală","address":"Str. Clinicii 10","timezone":"Europe/Bucharest","active":true}],
        "settings": {"currency":"RON","language":"ro"}
      }'
    ```

- **List businesses (ale utilizatorului curent sau unde emailul său e autorizat)**
  - Method: `GET`
  - Path: `/businesses`
  - Auth: Bearer
  - Răspuns: `BusinessEntity[]`
  - cURL:
    ```bash
    curl -H "Authorization: Bearer $JWT" "$API_URL/businesses"
    ```

- **Get business by id**
  - Method: `GET`
  - Path: `/businesses/:id`
  - Auth: Bearer (vizibil doar dacă ești owner sau email autorizat)
  - Răspuns: `BusinessEntity`

### Endpoints utile (opțional)

- `GET /businesses/status/:status` — filtrează după `status` (active | suspended | deleted)
- `GET /businesses/payment-status/:paymentStatus` — filtrează după `paymentStatus` (active | past_due | canceled | unpaid)
- `PUT /businesses/:id` — actualizează (body: `UpdateBusinessDto`)
- `DELETE /businesses/:id` — marchează ca șters și oprește infrastructura; anulează orice subscripție Stripe mapată pentru acest business
- `POST /businesses/:id/register-shards` — declanșează crearea shardurilor pentru locații
- `POST /businesses/activate/:token` — activează ownership când `configureForEmail` ≠ emailul autentificat
- Subscription & status:
  - `GET /businesses/:id/subscription` — întoarce informații de subscripție folosind mapping-ul din tabelul `business-subscriptions` (clientul Stripe aparține utilizatorului plătitor)
  - `GET /businesses/:id/status`
- Credits:
  - `GET /businesses/:id/credits`
  - `POST /businesses/:id/credits/purchase` (body: `{ amount: number, paymentMethodId?: string }`)
  - `POST /businesses/:id/credits/allocate` (body: `{ locationId: string, amount: number }`)
  - `POST /businesses/:id/credits/reallocate` (body: `{ fromLocationId: string, toLocationId: string, amount: number }`)
  - `POST /businesses/:id/credits/deallocate` (body: `{ locationId: string, amount: number }`)
  
- Subscription management pe business (legate de utilizatorul plătitor):
  - `POST /businesses/:id/subscription` (body: `{ priceId: string, cancelPrevious?: boolean }`)
    - Creează sau înlocuiește subscripția Stripe pentru acest business folosind clientul Stripe asociat utilizatorului autentificat (Cognito). Mapping-ul subscripției este salvat în tabelul `business-subscriptions` (cheie: `id=sub_...`, cu GSI `businessId-index`).

### Note de integrare

- **Autorizare vizibilitate**: listarea/consultarea întoarce doar business-uri unde utilizatorul e owner (`ownerUserId` sau `ownerEmail`) sau emailul lui e în `authorizedEmails`.
- **Flux activare**: dacă setezi `configureForEmail` diferit de emailul autentificat, business-ul nu este atribuit imediat utilizatorului curent; se generează `activationUrl` trimis pe emailul respectiv.
- **Utilizare vs. plată**: un business este creat cu `status=suspended` și `paymentStatus=unpaid`. Devine utilizabil (`active`) după ce un utilizator autentificat creează și plătește o subscripție pentru acel business.
- **Domeniu**:
  - `domainType=subdomain` + `domainLabel` → subdomeniu sub domeniul de bază al platformei.
  - `domainType=custom` + `domainLabel` + `customTld` sau direct `customDomain` → domeniu propriu (se configurează DNS automat după creare aplicație).
- **Stripe**: dacă nu trimiți `subscriptionPlanPriceId`, se folosește planul implicit din env (`STRIPE_BASIC_PLAN_PRICE_ID`).

### Profil utilizator (mapare Cognito)

- Stripe Customer și cardurile salvate aparțin utilizatorului (Cognito), nu business-ului.
- Endpoint-uri relevante (în modulul `users`):
  - `GET /users/me` — returnează profilul utilizatorului (email, name, address, `stripeCustomerId` dacă există)
  - `PUT /users/me` — actualizează profilul (ex. address, `defaultPaymentMethodId`)

