# Business Creation Flow - 3 Steps

Această documentație descrie fluxul de creare a unui business în 3 pași, implementat în management-server.

## Overview

Crearea unui business se face în 3 pași distincti pentru a asigura:
1. **Configurarea corectă** - datele business-ului sunt configurate
2. **Plata securizată** - doar owner-ul poate configura plata
3. **Lansarea controlată** - infrastructura se lansează doar după plată

## Endpoint-uri

### 1. Configurare Business - `POST /businesses/configure`

**Descriere**: Creează business-ul cu status `suspended` și configurează owner-ul.

**Body**:
```json
{
  "companyName": "SRL Exemplu",
  "registrationNumber": "J12/123/2024",
  "taxCode": "RO12345678",
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
  "configureForEmail": "owner@firma.ro", // Optional - pentru configurarea altcuiva
  "domainType": "subdomain",
  "domainLabel": "numele-firmei",
  "customTld": "ro",
  "clientPageType": "website",
  "subscriptionType": "solo",
  "billingEmail": "facturi@firma.ro"
}
```

**Logica specială pentru `configureForEmail`**:
- Dacă `configureForEmail` este diferit de email-ul utilizatorului curent:
  - Se caută user-ul după email în baza de date
  - Dacă nu există, se creează un profil placeholder
  - Acel user devine `ownerUserId` și `ownerEmail`
  - Utilizatorul curent rămâne `createdByUserId`
  - **Se trimite email cu invitație** către `configureForEmail` cu link pentru crearea contului
- Dacă `configureForEmail` nu este specificat sau este același cu email-ul utilizatorului curent:
  - Utilizatorul curent devine atât `ownerUserId` cât și `createdByUserId`
  - El va fi responsabil pentru plata abonamentului

**Răspuns**: BusinessEntity cu `status: "suspended"`, `paymentStatus: "unpaid"`

**Notă**: Dacă `configureForEmail` este specificat și user-ul nu există, se trimite automat un email cu invitație.

### 2. Setup Payment - `POST /businesses/:id/payment`

**Descriere**: Creează subscription-ul Stripe pentru business-ul configurat.

**Body**:
```json
{
  "subscriptionType": "solo",
  "planKey": "basic",
  "billingInterval": "month",
  "currency": "ron"
}
```

**Restricții**:
- Doar owner-ul business-ului poate configura plata
- Subscription-ul se creează cu credențialele owner-ului:
  - Dacă business-ul a fost configurat pentru altcineva → owner-ul plătește
  - Dacă business-ul a fost configurat pentru creator → creator-ul plătește

**Răspuns**:
```json
{
  "subscriptionId": "sub_123",
  "status": "incomplete",
  "clientSecret": "pi_secret_..."
}
```

### 3. Launch Business - `POST /businesses/:id/launch`

**Descriere**: Activează business-ul și lansează infrastructura după confirmarea plății.

**Body**: Nu necesită body

**Logica**:
1. Verifică că subscription-ul este activ (`active` sau `trialing`)
2. Marchează business-ul ca activ (`status: "active"`, `active: true`)
3. Trimite mesaje SQS pentru crearea shard-urilor pentru fiecare locație activă
4. Creează infrastructura CloudFormation pentru React app

**Răspuns**: BusinessEntity cu `status: "active"`, `active: true`

### 4. Invitation Info - `GET /businesses/:id/invitation`

**Descriere**: Endpoint pentru obținerea informațiilor despre invitație (pentru utilizatori noi).

**Query Parameters**:
- `email`: Email-ul pentru care se verifică invitația

**Răspuns**:
```json
{
  "businessId": "b-uuid",
  "businessName": "SRL Exemplu",
  "ownerEmail": "owner@firma.ro",
  "invitationUrl": "https://app.simplu.io/businesses/b-uuid/setup?email=owner@firma.ro"
}
```

## Ștergerea Business-ului

### `DELETE /businesses/:id`

**Logica de ștergere**:
1. Marchează business-ul ca șters (`status: "deleted"`)
2. Trimite mesaje SQS pentru ștergerea shard-urilor pentru fiecare locație (cheie compusă `businessId-locationId`)
3. Trimite mesaj CloudFormation pentru ștergerea stack-ului
4. Șterge din baza de date

## Mesaje SQS

### Shard Creation
```json
{
  "businessId": "b-uuid",
  "locationId": "loc-uuid",
  "businessType": "dental",
  "shardId": "",
  "connectionString": "",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### Shard Destruction (per location)
```json
{
  "businessId": "b-uuid",
  "locationId": "loc-uuid",
  "action": "destroy",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### Shard Destruction (all locations)
```json
{
  "businessId": "b-uuid",
  "action": "destroy_all",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

## Fluxul Complet

### Cazul 1: Configurare pentru altcineva
1. **Admin/Manager** creează business-ul pentru client prin `POST /businesses/configure` cu `configureForEmail`
2. **Client (owner)** primește **email cu invitație** cu link pentru crearea contului
3. **Client** creează contul și configurează plata prin `POST /businesses/:id/payment`
4. **Client** confirmă plata în frontend (client-ul plătește)
5. **Client** lansează business-ul prin `POST /businesses/:id/launch`
6. **Sistemul** creează automat shard-urile și infrastructura

### Cazul 2: Configurare pentru sine
1. **Utilizator** creează business-ul pentru sine prin `POST /businesses/configure` (fără `configureForEmail`)
2. **Utilizator** configurează plata prin `POST /businesses/:id/payment`
3. **Utilizator** confirmă plata în frontend (utilizatorul plătește)
4. **Utilizator** lansează business-ul prin `POST /businesses/:id/launch`
5. **Sistemul** creează automat shard-urile și infrastructura

## Securitate

- Doar owner-ul poate configura plata și lansa business-ul
- Creator-ul business-ului poate doar să-l configureze inițial
- Fiecare pas verifică autorizarea corespunzătoare
- Shard-urile au cheie compusă `businessId-locationId` pentru izolare completă

## Compatibilitate

Endpoint-urile legacy (`POST /businesses`, `POST /businesses/:id/activate`) sunt păstrate pentru compatibilitate, dar se recomandă folosirea noilor endpoint-uri pentru control mai bun. 