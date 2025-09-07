# Configurare System Instructions pentru Role-Based Access Control

## Prezentare Generală

Acest ghid te ajută să configurezi și să populezi tabelul `ragSystemInstructions` cu instrucțiuni adaptate la rolurile de operator și client pentru diferite tipuri de business.

## Structura Tabelului

Tabelul `ragSystemInstructions` are următoarea structură:

```typescript
interface RagSystemInstruction {
  key: string;               // e.g., "dental.operator.complete_guidance.v1"
  businessType: string;      // 'dental' | 'gym' | 'hotel' | 'general'
  category: string;          // 'operator_guidelines' | 'client_guidelines'
  instructionsJson: any;     // JSON cu instrucțiuni și capabilități
  version?: string;          // '1.0.0'
  isActive: boolean;         // true/false
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}
```

## Configurare

### 1. Variabile de Mediu

Asigură-te că ai setate următoarele variabile de mediu:

```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB Table Names
export DYNAMODB_RAG_SYSTEM_INSTRUCTIONS_TABLE=rag-system-instructions
```

### 2. Creare Tabel DynamoDB

Creează tabelul `rag-system-instructions` în DynamoDB cu următoarea configurație:

```json
{
  "TableName": "rag-system-instructions",
  "KeySchema": [
    {
      "AttributeName": "businessType",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "key",
      "KeyType": "RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "businessType",
      "AttributeType": "S"
    },
    {
      "AttributeName": "key",
      "AttributeType": "S"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

### 3. Populare Instrucțiuni

Rulează scriptul de populare:

```bash
cd ai-agent-server
node scripts/populate-system-instructions.js
```

## Instrucțiuni Incluse

### Pentru Operatori (WebSocket)

#### Dental Operator
- **Key**: `dental.operator.complete_guidance.v1`
- **Capabilități**: Acces complet la toate datele
- **Răspunsuri**: Scurte și concise (max 50 cuvinte)
- **Acțiuni**: Listează rezervări, caută pacienți, modifică rezervări

#### Gym Operator
- **Key**: `gym.operator.complete_guidance.v1`
- **Capabilități**: Acces complet la toate datele
- **Răspunsuri**: Scurte și concise (max 50 cuvinte)
- **Acțiuni**: Listează membri, caută membri, modifică abonamente

#### Hotel Operator
- **Key**: `hotel.operator.complete_guidance.v1`
- **Capabilități**: Acces complet la toate datele
- **Răspunsuri**: Scurte și concise (max 50 cuvinte)
- **Acțiuni**: Listează rezervări, caută clienți, modifică rezervări

### Pentru Clienți (Webhook)

#### Dental Client
- **Key**: `dental.client.limited_access.v1`
- **Capabilități**: Acces limitat, fără date personale
- **Răspunsuri**: Prietenoase și ghidare (max 150 cuvinte)
- **Acțiuni**: Listează servicii, medici, ghidare pentru programări

#### Gym Client
- **Key**: `gym.client.limited_access.v1`
- **Capabilități**: Acces limitat, fără date personale
- **Răspunsuri**: Prietenoase și ghidare (max 150 cuvinte)
- **Acțiuni**: Listează abonamente, antrenori, ghidare pentru înscrieri

#### Hotel Client
- **Key**: `hotel.client.limited_access.v1`
- **Capabilități**: Acces limitat, fără date personale
- **Răspunsuri**: Prietenoase și ghidare (max 150 cuvinte)
- **Acțiuni**: Listează camere, servicii, ghidare pentru rezervări

## Testare

### 1. Testare Automată

Rulează scriptul de testare:

```bash
cd ai-agent-server
node scripts/test-role-based-responses.js
```

### 2. Testare Manuală

#### Test Operator (WebSocket)
```bash
curl -X POST http://localhost:3000/agent/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location",
    "userId": "operator-123",
    "message": "Listează toate rezervările de azi"
  }'
```

#### Test Client (Webhook)
```bash
curl -X POST http://localhost:3000/agent/process-webhook-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location",
    "userId": "client-123",
    "message": "Ce servicii oferiți?",
    "source": "meta"
  }'
```

## Adăugare Instrucțiuni Noi

Pentru a adăuga instrucțiuni noi, editează fișierul `scripts/populate-system-instructions.js`:

```javascript
const newInstruction = {
  key: 'business_type.role.category.v1',
  businessType: 'dental', // sau 'gym', 'hotel', 'general'
  category: 'operator_guidelines', // sau 'client_guidelines'
  version: '1.0.0',
  isActive: true,
  instructionsJson: {
    role: 'operator', // sau 'client'
    capabilities: {
      canAccessAllData: true,
      canViewPersonalInfo: true,
      canModifyReservations: true,
      canListAllResources: true,
      responseStyle: 'concise' // sau 'friendly_guidance'
    },
    instructions: {
      primary: 'Instrucțiunea principală...',
      // ... alte instrucțiuni
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

## Monitorizare

### Loguri

Agentul loghează automat:
- Rolul identificat pentru fiecare cerere
- Capabilitățile utilizatorului
- Tipul de răspuns generat

### Verificare Instrucțiuni

Pentru a verifica instrucțiunile încărcate:

```bash
# Verifică sănătatea serviciului
curl http://localhost:3000/agent/health

# Testează analiza intențiilor
curl http://localhost:3000/agent/test-intent/Vreau%20să%20fac%20o%20programare
```

## Troubleshooting

### Probleme Comune

1. **Tabelul nu există**
   - Verifică că tabelul `rag-system-instructions` este creat în DynamoDB
   - Verifică numele tabelului în variabilele de mediu

2. **Instrucțiunile nu se încarcă**
   - Verifică că scriptul de populare a rulat cu succes
   - Verifică că `isActive: true` pentru instrucțiunile dorite

3. **Răspunsurile nu sunt adaptate la rol**
   - Verifică că `source` este setat corect ('websocket' pentru operator, 'webhook' pentru client)
   - Verifică că instrucțiunile pentru rolul corect sunt active

### Debug

Pentru debug, adaugă loguri în `SystemRagNode`:

```typescript
console.log('User role:', userRole);
console.log('Business type:', businessType);
console.log('Loaded instructions:', loaded.length);
console.log('Filtered instructions:', filteredInstructions.length);
```

## Extensii

### Adăugare Tipuri de Business Noi

1. Adaugă tipul de business în `businessType` enum
2. Creează instrucțiuni specifice pentru operator și client
3. Actualizează scriptul de populare
4. Testează cu scriptul de testare

### Adăugare Roluri Noi

1. Extinde `role` enum în interfețe
2. Adaugă capabilități specifice pentru noul rol
3. Creează instrucțiuni adaptate
4. Actualizează logica de filtrare

## Suport

Pentru probleme sau întrebări:
1. Verifică logurile serviciului
2. Rulează scriptul de testare
3. Verifică configurația DynamoDB
4. Consultă documentația Role-Based Access Control
