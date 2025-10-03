# RAG System Setup Guide

## Overview

Am simplificat complet `agent.service.ts` prin implementarea unui sistem RAG (Retrieval-Augmented Generation) bazat pe tabele DynamoDB. Sistemul vechi complex cu `OperatorAgentService` și `CustomerAgentService` a fost eliminat.

## Ce a fost șters

- ❌ `operator/operator-agent.service.ts` - Serviciul complex pentru operatori
- ❌ `customer/customer-agent.service.ts` - Serviciul complex pentru clienți
- ❌ `operator/operator-agent.module.ts` - Modulul pentru operatori
- ❌ `customer/customer-agent.module.ts` - Modulul pentru clienți
- ❌ Toate directoarele `operator/` și `customer/` cu nodurile și handler-ele complexe

## Ce a fost creat

### 1. Tabele DynamoDB
- **`rag-instructions`**: Instrucțiuni generale (role + businessType)
- **`rag-resources`**: Instrucțiuni pentru resurse specifice
- **`rag-resource-data`**: Date mock pentru resurse

### 2. Servicii RAG Simplificate
- **`SimplifiedRagService`**: RAG bazat pe `businessType` + `role`
- **`ResourceRagService`**: RAG pentru resurse specifice
- **`AgentService`**: Serviciul principal simplificat

### 3. Scripts de Setup
- **`create-rag-tables.js`**: Creează tabelele DynamoDB
- **`populate-rag-tables.js`**: Populează tabelele din JSON
- **`setup-rag-system.js`**: Script master pentru setup complet

### 4. Date RAG
- **`data/rag-data.json`**: JSON cu toate datele RAG pentru populare

## Setup RAG System

### 1. Creează și populează tabelele
```bash
cd ai-agent-server
node scripts/setup-rag-system.js
```

### 2. Verifică tabelele create
```bash
# Verifică că tabelele au fost create
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### 3. Testează sistemul
```bash
# Testează serviciile RAG
npm run test
```

## Structura Tabelelor

### rag-instructions
```json
{
  "ragKey": "operator.dental.general",
  "version": "v1",
  "businessType": "dental",
  "role": "operator",
  "instructions": ["Ești un asistent virtual pentru o clinică dentală", ...],
  "capabilities": ["view_all_data", "modify_reservations", ...],
  "responseStyle": "professional_concise"
}
```

### rag-resources
```json
{
  "resourceKey": "dental.appointment",
  "version": "v1",
  "businessType": "dental",
  "resourceType": "appointment",
  "instructions": ["Gestionează programările pentru clinica dentală", ...],
  "dataFields": ["availableSlots", "doctors", "services"],
  "actions": ["create_appointment", "modify_appointment", ...]
}
```

### rag-resource-data
```json
{
  "resourceKey": "dental.appointment",
  "dataType": "mock",
  "businessType": "dental",
  "data": {
    "availableSlots": [...],
    "services": [...]
  }
}
```

## RAG Keys Mapping

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

## Customizare Date

Pentru a modifica datele RAG, editează fișierul `data/rag-data.json`:

1. **Adaugă noi businessType-uri**:
```json
{
  "ragInstructions": [
    {
      "ragKey": "operator.spa.general",
      "businessType": "spa",
      "role": "operator",
      "instructions": ["Ești un asistent virtual pentru un spa", ...]
    }
  ]
}
```

2. **Adaugă noi resurse**:
```json
{
  "ragResources": [
    {
      "resourceKey": "spa.treatments",
      "businessType": "spa",
      "resourceType": "treatments",
      "instructions": ["Gestionează tratamentele spa-ului", ...]
    }
  ]
}
```

3. **Adaugă date mock**:
```json
{
  "ragResourceData": [
    {
      "resourceKey": "spa.treatments",
      "businessType": "spa",
      "dataType": "mock",
      "data": {
        "treatments": [
          { "name": "Masaj relaxant", "price": 200, "duration": 60 }
        ]
      }
    }
  ]
}
```

## Repopulare Date

După modificarea `rag-data.json`, repopulează tabelele:

```bash
# Șterge datele existente (opțional)
aws dynamodb delete-table --table-name rag-instructions --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name rag-resources --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name rag-resource-data --endpoint-url http://localhost:8000

# Recreează și populează
node scripts/setup-rag-system.js
```

## Avantaje

1. **Simplitate**: Un singur `agent.service.ts` simplificat
2. **Flexibilitate**: Ușor de adăugat noi businessType-uri și roluri
3. **Scalabilitate**: RAG-ul poate fi extins cu ușurință
4. **Mentenanță**: Cod mai puțin complex și mai ușor de întreținut
5. **Performance**: Routing direct bazat pe context
6. **Date externe**: Nu mai ținem datele RAG pe server, ci în DynamoDB

## Următorii Pași

1. **Testează sistemul** cu diferite scenarii
2. **Customizează datele** în `rag-data.json` conform nevoilor
3. **Adaugă noi businessType-uri** dacă este necesar
4. **Integrează date reale** în loc de date mock
5. **Optimizează performance** cu cache și indexuri

## Concluzie

Noul sistem RAG elimină complexitatea serviciilor separate și oferă un sistem unificat, flexibil și scalabil pentru gestionarea agenților AI bazat pe context business și rol, cu date stocate în DynamoDB pentru flexibilitate maximă.
