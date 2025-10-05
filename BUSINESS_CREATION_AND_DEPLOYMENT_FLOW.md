# Business Creation and Deployment Flow - Complete Implementation

## Overview

Acest document descrie implementarea completă a fluxului de creare a unui business nou, incluzând deployment-ul aplicației dental-form cu subdomenii și procesarea corectă a mesajelor SQS pentru crearea rolului de administrator și primului medic.

## Fluxul Complet - 3 Pași

### Pasul 1: Configurare Business - `POST /businesses/configure`

**Ce se întâmplă:**
- Se creează business-ul cu status `suspended` și `active: false`
- **Tipul de abonament se determină automat:**
  - 1 locație → `subscriptionType: 'solo'`
  - 2+ locații → `subscriptionType: 'enterprise'`
- Se configurează owner-ul business-ului

**Structura request-ului:**
```json
{
  "companyName": "SRL Exemplu",
  "registrationNumber": "J12/123/2024",
  "businessType": "dental",
  "locations": [
    {
      "name": "Clinica Centrală",
      "address": "Str. Clinicii 10",
      "timezone": "Europe/Bucharest",
      "active": true
    }
  ],
  "settings": {
    "currency": "RON",
    "language": "ro"
  },
  "configureForEmail": "owner@firma.ro", // Optional
  "domainType": "subdomain",
  "domainLabel": "numele-firmei",
  "customTld": "ro",
  "clientPageType": "website",
  "billingEmail": "facturi@firma.ro"
}
```

**Logica specială pentru `configureForEmail`:**
- Dacă `configureForEmail` este diferit de email-ul utilizatorului curent:
  - Se caută user-ul după email în baza de date
  - Dacă nu există, se creează un profil placeholder
  - Acel user devine `ownerUserId` și `ownerEmail`
  - Utilizatorul curent rămâne `createdByUserId`
  - **Se trimite email cu invitație** către `configureForEmail`
- Dacă `configureForEmail` nu este specificat:
  - Utilizatorul curent devine atât `ownerUserId` cât și `createdByUserId`

### Pasul 2: Setup Payment - `POST /businesses/:id/payment`

**Ce se întâmplă:**
- Se creează subscription-ul Stripe pentru business-ul configurat
- Doar owner-ul business-ului poate configura plata
- Se folosește tipul de abonament determinat automat în pasul 1

**Structura request-ului:**
```json
{
  "planKey": "basic",
  "billingInterval": "month", 
  "currency": "ron"
}
```

### Pasul 3: Launch Business - `POST /businesses/:id/launch`

**Ce se întâmplă:**
1. Se verifică că subscription-ul este activ (`active` sau `trialing`)
2. Se marchează business-ul ca activ (`status: "active"`, `active: true`)
3. Se trimit mesaje SQS pentru crearea shard-urilor pentru fiecare locație activă
4. **Se creează infrastructura CloudFormation pentru React app cu subdomeniu**
5. **Se copiază fișierele din bucket-ul `business-forms-dental`**
6. **Se trimite mesaj SQS pentru crearea contului de administrator**

## Deployment-ul Aplicației Dental-Form

### Infrastructura CloudFormation

Când se lansează business-ul, sistemul creează automat:

1. **S3 Bucket** cu numele `{domainLabel}.simplu.io` (același nume ca domeniul)
2. **CloudFront Distribution** cu alias pentru subdomeniul `{domainLabel}.simplu.io`
3. **Route53 Record** pentru subdomeniu
4. **SSL Certificate** pentru domeniul `simplu.io` și `*.simplu.io`

### Copierea Fișierelor

Sistemul copiază automat fișierele din bucket-ul corespunzător business type-ului către bucket-ul specific business-ului:

```typescript
// În InfrastructureService.copyFormFilesFromBusinessType()
const bucketNameMap = {
  'dental': 'dental-form',
  'gym': 'gym-form', 
  'hotel': 'hotel-form'
};
const sourceBucketName = bucketNameMap[businessType]; // dental-form
const targetBucketName = `${domainLabel}.simplu.io`; // best-dent.simplu.io
```

### Rezultatul Deployment-ului

- **URL-ul aplicației:** `https://{domainLabel}.simplu.io`
- **Exemplu:** `https://best-dent.simplu.io`
- **Bucket S3:** `{domainLabel}.simplu.io` (același nume ca domeniul)
- **CloudFront Distribution:** Configurat cu SSL și cache optimizat

## Procesarea Mesajelor SQS

### Mesajul de Creare a Contului de Administrator

Când se lansează business-ul, se trimite un mesaj SQS către resources-server:

```json
{
  "businessId": "b-uuid",
  "locationId": "loc-uuid", 
  "adminEmail": "owner@firma.ro",
  "adminUserId": "cognito-user-id",
  "businessType": "dental",
  "domainLabel": "best-dent",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### Procesarea în Resources Server

Resources-server procesează mesajul și creează:

#### 1. Rolul de Administrator

```json
{
  "name": "Administrator",
  "status": "active",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "description": "Administrator principal al clinicii",
  "permissions": [
    "appointment:read", "appointment:create", "appointment:update", "appointment:delete",
    "patient:read", "patient:create", "patient:update", "patient:delete",
    "medic:read", "medic:create", "medic:update", "medic:delete",
    "treatment:read", "treatment:create", "treatment:update", "treatment:delete",
    "product:read", "product:create", "product:update", "product:delete",
    "role:read", "role:create", "role:update", "role:delete",
    "report:read", "sale:read", "sale:create",
    "dental-chart:read", "dental-chart:create", "dental-chart:update",
    "plan:read", "plan:create", "plan:update",
    "setting:read", "setting:update",
    "invoice-client:read", "invoice-client:create",
    "statistics:read", "recent-activities:read"
  ]
}
```

**Resource ID:** Se folosește `adminUserId` (ID-ul din Cognito) ca `resource_id`

#### 2. Primul Medic

```json
{
  "role": "Administrator",
  "email": "owner@firma.ro",
  "phone": "",
  "dutyDays": ["Luni", "Marți", "Miercuri", "Joi", "Vineri"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "medicName": "Dr. owner",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Resource ID:** Se folosește `adminUserId` (ID-ul din Cognito) ca `resource_id`

## Fluxul Complet - Diagramă

```
1. POST /businesses/configure
   ├── Creează business cu status "suspended"
   ├── Determină subscription type automat
   └── Configurează owner (cu sau fără configureForEmail)

2. POST /businesses/:id/payment  
   ├── Creează subscription Stripe
   └── Returnează clientSecret pentru plată

3. POST /businesses/:id/launch
   ├── Verifică payment status
   ├── Marchează business ca activ
   ├── Trimite mesaje SQS pentru shard creation
   ├── Deployează infrastructura CloudFormation
   │   ├── Creează S3 bucket
   │   ├── Creează CloudFront distribution
   │   ├── Configurează Route53 record
   │   └── Copiază fișierele din business-forms-dental
   └── Trimite mesaj SQS pentru admin account creation
       ├── Resources-server procesează mesajul
       ├── Creează rolul de administrator
       └── Creează primul medic
```

## Caracteristici Implementate

### ✅ Deployment Automat
- **S3 Bucket** cu numele `business-client-{businessId}-{domainLabel}`
- **CloudFront Distribution** cu SSL și cache optimizat
- **Route53 Record** pentru subdomeniu `{domainLabel}.simplu.io`
- **Copierea automată** a fișierelor din `business-forms-dental`

### ✅ Procesarea Mesajelor SQS
- **Crearea rolului de administrator** cu toate permisiunile
- **Crearea primului medic** cu datele administratorului
- **Folosirea ID-ului din Cognito** ca `resource_id` pentru ambele resurse

### ✅ Securitate și Autorizare
- Doar owner-ul poate configura plata și lansa business-ul
- Creator-ul business-ului poate doar să-l configureze inițial
- Fiecare pas verifică autorizarea corespunzătoare

### ✅ Compatibilitate
- Endpoint-urile legacy sunt păstrate pentru compatibilitate
- Sistemul funcționează atât cu RDS cât și cu Citrus sharding

## Exemple de Utilizare

### Cazul 1: Admin creează business pentru client
1. **Admin** configurează business cu `configureForEmail: "client@firma.ro"`
2. **Client** primește email cu invitație
3. **Client** creează contul și configurează plata
4. **Client** lansează business-ul
5. **Sistemul** creează automat infrastructura și resursele

### Cazul 2: Utilizator creează business pentru sine
1. **Utilizator** configurează business fără `configureForEmail`
2. **Utilizator** configurează plata
3. **Utilizator** lansează business-ul
4. **Sistemul** creează automat infrastructura și resursele

## Rezultatul Final

După completarea fluxului, utilizatorul va avea:

- **Business activ** cu status `active`
- **Aplicație dental-form** disponibilă la `https://{domainLabel}.simplu.io`
- **Rol de administrator** cu toate permisiunile
- **Primul medic** configurat cu datele administratorului
- **Infrastructură completă** (S3, CloudFront, Route53, SSL)

Sistemul este acum complet funcțional pentru crearea și lansarea business-urilor cu aplicația dental-form!
