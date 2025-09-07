# Role-Based Access Control pentru Agent

## Prezentare Generală

Agentul a fost îmbunătățit pentru a face diferența între **operatori** (websocket) și **clienți** (webhook), oferind acces diferențiat la informații și răspunsuri adaptate la rolul utilizatorului.

## Diferențierea Rolurilor

### 1. Operator (WebSocket)
- **Sursa**: `websocket`
- **Rol**: `operator`
- **Capabilități**:
  - Acces complet la toate datele
  - Poate vizualiza informații personale ale clienților
  - Poate modifica rezervări
  - Poate lista toate resursele
  - Răspunsuri scurte și concise (max 50 cuvinte)

### 2. Client (Webhook)
- **Sursa**: `webhook`
- **Rol**: `webhook`
- **Capabilități**:
  - Acces limitat la date
  - NU poate vizualiza informații personale ale altor clienți
  - NU poate modifica rezervări
  - Poate lista informații generale (medici, servicii)
  - Răspunsuri prietenoase și ghidare (max 150 cuvinte)

## Implementarea Tehnică

### 1. IdentificationNode
```typescript
// Pentru operatori (websocket)
if (state.source === 'websocket') {
  return { 
    role: 'operator', 
    userCapabilities: {
      canAccessAllData: true,
      canViewPersonalInfo: true,
      canModifyReservations: true,
      canListAllResources: true,
      responseStyle: 'concise'
    }
  };
}

// Pentru clienți (webhook)
if (state.source === 'webhook') {
  return { 
    role: 'webhook', 
    userCapabilities: {
      canAccessAllData: false,
      canViewPersonalInfo: false,
      canModifyReservations: false,
      canListAllResources: true,
      responseStyle: 'friendly_guidance'
    }
  };
}
```

### 2. SystemRagNode
- **Căutare în baza de date**: Caută instrucțiuni specifice rolului din `ragSystemInstructions`
- **Fallback logic**: Dacă nu găsește instrucțiuni specifice, folosește instrucțiuni generale
- **Hardcoded fallback**: Dacă nu găsește nimic în DB, folosește instrucțiuni hardcodate

```typescript
private async findRoleSpecificInstruction(userRole: string, businessType: string) {
  // 1. Caută instrucțiune specifică: dental.operator.complete_guidance.v1
  const instructionKey = `${businessType}.${roleKey}.${roleKey === 'operator' ? 'complete_guidance' : 'limited_access'}.v1`;
  const dbInstruction = await this.ragService.getSystemInstructionByKey(instructionKey);
  
  if (dbInstruction && dbInstruction.isActive) {
    return this.formatInstructionFromDB(dbInstruction);
  }
  
  // 2. Fallback la instrucțiune generală: general.operator.base_guidance.v1
  const generalKey = `general.${roleKey}.base_guidance.v1`;
  const generalInstruction = await this.ragService.getSystemInstructionByKey(generalKey);
  
  if (generalInstruction && generalInstruction.isActive) {
    return this.formatInstructionFromDB(generalInstruction);
  }
  
  // 3. Final fallback la instrucțiuni hardcodate
  return this.createHardcodedInstruction(userRole, businessType);
}
```

### 3. ResponseNode
- **Pentru operatori**: Răspunsuri scurte și directe
- **Pentru clienți**: Răspunsuri prietenoase și ghidare

```typescript
if (userRole === 'operator' && responseStyle === 'concise') {
  return `
    Generează un răspuns scurt și concis pentru un operator.
    - Scurt și la obiect (max 50 de cuvinte)
    - Focusat pe informațiile esențiale
    - Profesional și direct
  `;
} else {
  return `
    Generează un răspuns prietenos și util pentru un client.
    - Prietenos și încurajator
    - Să ghideze clientul către informațiile de care are nevoie
    - Să nu includă date personale ale altor clienți
  `;
}
```

## Endpoints API

### 1. Procesare WebSocket (Operator)
```http
POST /agent/process-message
{
  "businessId": "business-123",
  "locationId": "location-456",
  "userId": "operator-789",
  "message": "Listează toate rezervările de azi"
}
```

### 2. Procesare Webhook (Client)
```http
POST /agent/process-webhook
{
  "businessId": "business-123",
  "locationId": "location-456",
  "userId": "client-789",
  "message": "Vreau să fac o programare",
  "source": "meta"
}
```

### 3. Procesare Webhook prin Pipeline (Testare)
```http
POST /agent/process-webhook-pipeline
{
  "businessId": "business-123",
  "locationId": "location-456",
  "userId": "client-789",
  "message": "Ce medici sunt disponibili?",
  "source": "meta"
}
```

## Filtrarea Instrucțiunilor

Pentru clienți, instrucțiunile sunt filtrate pentru a elimina accesul la date sensibile:

```typescript
private filterInstructionsByRole(instructions: any[], userRole: string): any[] {
  if (userRole === 'operator') {
    return instructions; // Acces complet
  } else {
    return instructions.filter(instruction => {
      const sensitiveKeywords = [
        'clienti_personali',
        'rezervari_specifice', 
        'date_personale',
        'istoric_complet',
        'admin',
        'operator',
        'coordonator'
      ];
      
      const instructionText = (instruction.instruction || '').toLowerCase();
      return !sensitiveKeywords.some(keyword => instructionText.includes(keyword));
    });
  }
}
```

## Beneficii

1. **Securitate**: Clienții nu au acces la datele personale ale altor clienți
2. **Eficiență**: Operatorii primesc răspunsuri scurte și directe
3. **Experiență Utilizator**: Clienții primesc ghidare prietenoasă
4. **Flexibilitate**: Sistemul poate fi extins pentru alte roluri

## Testare

### 1. Testare Instrucțiuni din Baza de Date

```bash
# Testează structura și conținutul instrucțiunilor
node scripts/test-system-instructions.js
```

### 2. Testare Comportament Agent

```bash
# Testează răspunsurile adaptate la rol
node scripts/test-role-based-responses.js
```

### 3. Testare Manuală

**Test Operator**:
```bash
curl -X POST http://localhost:3000/agent/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location",
    "userId": "operator-123",
    "message": "Listează toate rezervările"
  }'
```

**Test Client**:
```bash
curl -X POST http://localhost:3000/agent/process-webhook-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location",
    "userId": "client-123",
    "message": "Ce medici sunt disponibili?",
    "source": "meta"
  }'
```

### 4. Verificare Loguri

Agentul loghează automat:
```
SystemRagNode: Found role-specific instruction: dental.operator.complete_guidance.v1
SystemRagNode: Loaded 3 instructions for operator in dental
```

## Monitorizare

Sistemul loghează automat:
- Rolul identificat pentru fiecare cerere
- Capabilitățile utilizatorului
- Tipul de răspuns generat (concise vs friendly_guidance)

```typescript
console.log(`User role: ${state.role}, Capabilities: ${JSON.stringify(state.userCapabilities)}`);
```
