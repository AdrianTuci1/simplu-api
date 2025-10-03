# Simplified RAG Architecture

## Overview

Am simplificat `agent.service.ts` prin implementarea unui sistem RAG (Retrieval-Augmented Generation) bazat pe `businessType` și `role`. Noua arhitectură elimină complexitatea serviciilor separate și folosește un sistem unificat de routing.

## Arhitectura Nouă

### 1. SimplifiedRagService
- **Scop**: RAG bazat pe `businessType` + `role`
- **Exemple**: `operator.dental.general`, `customer.dental.general`
- **Funcționalitate**: 
  - Instrucțiuni specifice pentru fiecare combinație rol + businessType
  - Resurse generice per businessType
  - Răspunsuri contextuale

### 2. ResourceRagService
- **Scop**: RAG pentru resurse specifice per businessType
- **Exemple**: `dental.listResources`, `dental.appointment`, `dental.patient`, `dental.treatments`
- **Funcționalitate**:
  - Instrucțiuni specifice pentru fiecare tip de resursă
  - Date mock pentru resurse
  - Acțiuni specifice per resursă

### 3. AgentService (Simplificat)
- **Scop**: Routing inteligent bazat pe RAG
- **Funcționalitate**:
  - Detectează automat cererile de resurse
  - Routează către RAG-ul potrivit
  - Generează răspunsuri contextuale

## Exemple de Utilizare

### Operator Dental
```typescript
// Mesaj: "Salut! Cu ce te pot ajuta astăzi?"
// RAG Key: operator.dental.general
// Răspuns: Instrucțiuni pentru operator clinică dentală
```

### Customer Dental
```typescript
// Mesaj: "Bună! Vreau să fac o programare."
// RAG Key: customer.dental.general
// Răspuns: Instrucțiuni pentru client clinică dentală
```

### Resource Request
```typescript
// Mesaj: "Vreau să văd programările disponibile"
// RAG Key: dental.appointment
// Răspuns: Date despre programări + acțiuni specifice
```

## Mapping RAG Keys

### General RAG (SimplifiedRagService)
- `operator.dental.general` - Operator pentru clinică dentală
- `customer.dental.general` - Client pentru clinică dentală
- `operator.gym.general` - Operator pentru sală de sport
- `customer.gym.general` - Membru pentru sală de sport
- `operator.hotel.general` - Operator pentru hotel
- `customer.hotel.general` - Oaspete pentru hotel

### Resource RAG (ResourceRagService)
- `dental.listResources` - Lista resurselor clinicei dentale
- `dental.appointment` - Programări dentale
- `dental.patient` - Date pacienți
- `dental.treatments` - Tratamente disponibile
- `gym.membership` - Abonamente sală de sport
- `gym.classes` - Clase de fitness
- `hotel.booking` - Rezervări hotel
- `hotel.rooms` - Camere hotel

## Avantaje

1. **Simplitate**: Un singur `agent.service.ts` simplificat
2. **Flexibilitate**: Ușor de adăugat noi businessType-uri și roluri
3. **Scalabilitate**: RAG-ul poate fi extins cu ușurință
4. **Mentenanță**: Cod mai puțin complex și mai ușor de întreținut
5. **Performance**: Routing direct bazat pe context

## Implementare

### 1. Detectarea Resource Requests
```typescript
private detectResourceRequest(message: string, businessType: string): string | null {
  const resourceKeywords = {
    'dental': {
      'appointment': ['programare', 'programări', 'program'],
      'patient': ['pacient', 'pacienți', 'client'],
      'treatments': ['tratamente', 'tratament', 'servicii medicale']
    }
  };
  // Detectează automat cererile de resurse
}
```

### 2. Routing Inteligent
```typescript
// Verifică dacă mesajul cere resurse specifice
const resourceRequest = this.detectResourceRequest(data.message, businessType);
if (resourceRequest) {
  // Folosește ResourceRagService
  return await this.resourceRagService.getResourceRag(...);
} else {
  // Folosește SimplifiedRagService
  return await this.simplifiedRagService.getRagForRoleAndBusiness(...);
}
```

## Testare

Am creat `RagTestService` pentru testarea tuturor scenariilor:
- Test operator dental RAG
- Test customer dental RAG  
- Test resource RAG pentru programări

## Următorii Pași

1. **Extindere Business Types**: Adăugare suport pentru noi tipuri de business
2. **Integrare Real Data**: Înlocuirea datelor mock cu apeluri API reale
3. **Optimizare Performance**: Cache pentru RAG results
4. **Monitoring**: Logging și metrics pentru RAG performance

## Concluzie

Noua arhitectură RAG simplificată elimină complexitatea serviciilor separate și oferă un sistem unificat, flexibil și scalabil pentru gestionarea agenților AI bazat pe context business și rol.
