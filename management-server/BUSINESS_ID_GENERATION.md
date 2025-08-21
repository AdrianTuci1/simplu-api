# Business ID Generation System

## Overview

Sistemul de generare ID-uri pentru business și locații a fost actualizat pentru a folosi un format mai prietenos și mai ușor de citit, în loc de UUID-uri.

## Format ID-uri

### Business IDs
- **Format:** `B{ultimele 2 cifre ale anului}{5 cifre unice}`
- **Exemple:** `B2500001`, `B2500002`, `B2600001`

### Location IDs
- **Format:** `L{ultimele 2 cifre ale anului}{5 cifre unice}`
- **Exemple:** `L2500001`, `L2500002`, `L2600001`

## Implementare

### BusinessIdService

Serviciul `BusinessIdService` gestionează generarea ID-urilor unice:

```typescript
@Injectable()
export class BusinessIdService {
  async generateBusinessId(): Promise<string>
  async generateLocationId(): Promise<string>
}
```

### Caracteristici

1. **Secvențial:** ID-urile sunt generate secvențial în cadrul anului curent
2. **Unice:** Fiecare ID este garantat unic prin verificarea bazei de date
3. **Global:** Atât business ID-urile cât și location ID-urile sunt unice global
4. **Fallback:** În caz de eroare, folosește un timestamp ca fallback

### Logica de Generare

1. **Extrage anul curent:** Ultimele 2 cifre ale anului (ex: 2025 → "25")
2. **Creează pattern-ul de bază:** `B25` sau `L25`
3. **Caută secvența următoare:** Verifică baza de date pentru ID-urile existente
4. **Generează ID-ul:** Combină pattern-ul cu secvența formatată cu 5 cifre

**Business ID:** Secvențial global pentru toate business-urile din anul respectiv
**Location ID:** Secvențial global pentru toate locațiile din anul respectiv

## Integrare

### BusinessService

`BusinessService` folosește acum `BusinessIdService` pentru generarea ID-urilor:

```typescript
// În loc de uuidv4()
businessId: await this.businessIdService.generateBusinessId()

// Pentru locații
id: await this.businessIdService.generateLocationId()
```

### Module Configuration

`BusinessIdService` este înregistrat în `BusinessModule`:

```typescript
@Module({
  providers: [BusinessService, BusinessScheduler, BusinessIdService],
  // ...
})
```

## Testare

Scriptul de test `scripts/test-business-ids.js` verifică:

1. **Format corect:** ID-urile respectă pattern-ul așteptat
2. **Secvențialitate:** ID-urile sunt generate în ordine corectă
3. **Unicitate:** Fiecare ID este unic
4. **Gestionarea anilor:** Funcționează corect cu schimbarea anului

## Exemple de Utilizare

### Generare Business ID
```typescript
const businessId = await businessIdService.generateBusinessId();
// Rezultat: "B2500001"
```

### Generare Location ID
```typescript
const locationId = await businessIdService.generateLocationId(businessId);
// Rezultat: "L2500001"
```

### Creare Business cu Locații
```typescript
const business = {
  businessId: await this.businessIdService.generateBusinessId(),
  locations: [
    {
      id: await this.businessIdService.generateLocationId(),
      name: "Locația Principală",
      address: "Strada Exemplu, Nr. 1"
    }
  ]
};
```

## Avantaje

1. **Lizibilitate:** ID-urile sunt mai ușor de citit și înțeles
2. **Organizare:** ID-urile sunt organizate pe ani
3. **Debugging:** Mai ușor de urmărit în loguri și debugging
4. **Compatibilitate:** Funcționează cu sistemul existent
5. **Scalabilitate:** Suportă până la 99,999 ID-uri per an

## Migrare

Sistemul este compatibil cu ID-urile UUID existente. Noile business-uri vor folosi noul format, iar cele existente vor rămâne neschimbate.

## Monitorizare

Logurile includ generarea ID-urilor pentru monitorizare:

```
[BusinessIdService] Generated business ID: B25-00001
[BusinessIdService] Generated location ID: L25-00001
```
