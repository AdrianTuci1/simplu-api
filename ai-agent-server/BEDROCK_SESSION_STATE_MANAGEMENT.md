# 🔄 Bedrock Session State Management

## 📖 Prezentare Generală

Bedrock Agent păstrează context conversațional prin **session state** care trebuie persistat și re-folosit între apeluri pentru conversații multi-turn eficiente.

## ❓ Problema Inițială

### Ce trimiteam ÎNAINTE:

```typescript
sessionState: {
  sessionAttributes: {
    businessId: 'clinic-123',
    userId: 'user-456',
    role: 'operator',
    // ... atribute statice
  }
}
```

**Probleme**:
- ❌ Trimiteam DOAR atribute statice la fiecare apel
- ❌ Primeam `sessionState` înapoi de la Bedrock dar îl IGNORAM
- ❌ Bedrock nu putea păstra context între mesaje
- ❌ Conversații multi-turn nu funcționau corect

### Ce primim ÎNAPOI de la Bedrock:

```json
{
  "sessionState": {
    "sessionAttributes": {
      "businessId": "clinic-123",
      "userId": "user-456",
      // ... atribute statice
    },
    "promptSessionAttributes": {
      "patientName": "Ion Popescu",
      "selectedDate": "2024-01-20",
      "bookingStep": "confirm",
      "previousQuery": "available slots",
      // ... context dinamic generat de agent
    }
  }
}
```

**`promptSessionAttributes`** conține:
- Variabile temporare menționate în conversație
- State-ul workflow-ului (unde suntem în proces)
- Context istoric relevant

## ✅ Soluția Implementată

### 1. Persistență în DynamoDB

Am adăugat câmpul `bedrockSessionState` în sesiuni:

```typescript
interface Session {
  sessionId: string;
  // ... alte câmpuri
  metadata: {
    businessType: string;
    context: any;
    bedrockSessionState?: any; // ← NOU!
  };
}
```

### 2. Retrieve State ÎNAINTE de Apel

```typescript
// În agent.service.ts
const previousSessionState = await this.sessionService.getBedrockSessionState(sessionId);

const bedrockResult = await this.toolsService.processMessage(
  message,
  toolContext,
  sessionId,
  previousSessionState // ← Pasăm state-ul anterior
);
```

### 3. Merge cu Atribute Curente

```typescript
// În bedrock-agent.service.ts
const sessionState = previousSessionState ? {
  ...previousSessionState,
  sessionAttributes: {
    ...previousSessionState.sessionAttributes,
    ...currentAttributes, // Override cu atribute fresh
  },
} : {
  sessionAttributes: currentAttributes,
};
```

### 4. Save State DUPĂ Apel

```typescript
// În agent.service.ts
if (bedrockResult.sessionState) {
  await this.sessionService.updateBedrockSessionState(
    sessionId,
    bedrockResult.sessionState
  );
}
```

## 🔄 Flow Complet

### Primul Mesaj (Inițiere Conversație)

```
User: "Vreau să fac o programare"

1. getBedrockSessionState(sessionId) 
   → null (nu există state anterior)

2. invokeAgent(message, context, sessionId, null)
   → Bedrock: "Pentru ce dată doriți programarea?"

3. updateBedrockSessionState(sessionId, {
     promptSessionAttributes: {
       bookingIntent: "create_appointment",
       bookingStep: "date_selection"
     }
   })
```

### Al Doilea Mesaj (Cu Context)

```
User: "Pe 20 ianuarie"

1. getBedrockSessionState(sessionId)
   → {
       sessionAttributes: {...},
       promptSessionAttributes: {
         bookingIntent: "create_appointment",
         bookingStep: "date_selection"
       }
     }

2. invokeAgent(message, context, sessionId, previousState)
   → Bedrock știe contextul: "Înțeleg, 20 ianuarie. La ce oră?"
   → Actualizează state: bookingStep = "time_selection"
                        selectedDate = "2024-01-20"

3. updateBedrockSessionState(sessionId, newState)
```

### Al Treilea Mesaj (Continuare Context)

```
User: "La 14:00"

1. getBedrockSessionState(sessionId)
   → {
       promptSessionAttributes: {
         bookingIntent: "create_appointment",
         bookingStep: "time_selection",
         selectedDate: "2024-01-20"
       }
     }

2. invokeAgent(message, context, sessionId, previousState)
   → Bedrock știe tot contextul anterior
   → "Perfect! Programare pentru 20 ianuarie la 14:00. Confirmați?"

3. updateBedrockSessionState(sessionId, updatedState)
```

## 📊 Cod Modificat

### 1. `session.interface.ts`

```typescript
export interface Session {
  // ... existing fields
  metadata: {
    businessType: string;
    context: any;
    bedrockSessionState?: any; // ← Adăugat
  };
}
```

### 2. `session.service.ts`

Adăugate 2 metode noi:

```typescript
async updateBedrockSessionState(
  sessionId: string,
  bedrockSessionState: any
): Promise<void>

async getBedrockSessionState(
  sessionId: string
): Promise<any | null>
```

### 3. `bedrock-agent.service.ts`

```typescript
async invokeAgent(
  message: string,
  context: ToolContext,
  sessionId?: string,
  previousSessionState?: any, // ← Parametru nou
): Promise<BedrockInvocationResult>
```

### 4. `tools.service.ts`

```typescript
async processMessage(
  message: string,
  context: ToolContext,
  sessionId?: string,
  previousSessionState?: any, // ← Parametru nou
): Promise<BedrockInvocationResult>
```

### 5. `agent.service.ts`

```typescript
// Retrieve state
const previousSessionState = await this.sessionService
  .getBedrockSessionState(toolContext.sessionId);

// Invoke with state
const bedrockResult = await this.toolsService.processMessage(
  data.message,
  toolContext,
  toolContext.sessionId,
  previousSessionState,
);

// Save new state
if (bedrockResult.sessionState) {
  await this.sessionService.updateBedrockSessionState(
    toolContext.sessionId,
    bedrockResult.sessionState
  );
}
```

### 6. `agent.module.ts`

```typescript
imports: [
  BusinessInfoModule,
  ToolsModule,
  SessionModule, // ← Adăugat pentru dependency injection
],
```

## 🧪 Testing

### Test Conversație Multi-Turn

```bash
# Mesaj 1
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-session-001",
    "message_id": "msg_1",
    "payload": {
      "content": "Vreau să fac o programare"
    }
  }'

# Mesaj 2 (aceeași sesiune)
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-session-001",
    "message_id": "msg_2",
    "payload": {
      "content": "Pe 20 ianuarie"
    }
  }'

# Mesaj 3 (aceeași sesiune)
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-session-001",
    "message_id": "msg_3",
    "payload": {
      "content": "La 14:00"
    }
  }'
```

### Log-uri Așteptate

**La primul mesaj:**
```
🔧 SessionService: No Bedrock session state found for test-session-001
📤 Invoking Bedrock Agent for session: test-session-001
✅ SessionService: Bedrock session state updated for test-session-001
```

**La al doilea mesaj:**
```
✅ SessionService: Retrieved Bedrock session state for test-session-001
🔄 Reusing previous session state with 2 prompt attributes
📤 Invoking Bedrock Agent for session: test-session-001
✅ SessionService: Bedrock session state updated for test-session-001
```

## 💡 Beneficii

### 1. **Context Conversațional Persistent**

❌ **Înainte:**
```
User: "Vreau o programare"
Agent: "Pentru ce dată?"
User: "20 ianuarie"
Agent: "Pentru ce dată dorești programarea?" ← Nu își amintește!
```

✅ **Acum:**
```
User: "Vreau o programare"
Agent: "Pentru ce dată?"
User: "20 ianuarie"
Agent: "Perfect! La ce oră doriți?" ← Își amintește contextul!
```

### 2. **Workflow State Management**

Bedrock poate păstra unde ești în proces:
- `bookingStep: "date_selection"` → `"time_selection"` → `"confirmation"`
- Agent știe exact ce să întrebe next

### 3. **Variabile Temporare**

Agent reține informații menționate:
- Nume pacient menționat
- Data selectată
- Serviciul ales
- Preferences specifice

### 4. **Conversații Naturale**

User nu trebuie să repete informații:
```
User: "Schimbă data"
Agent: ← Știe despre ce programare vorbești din state
```

## 🔍 Debugging

### Verifică State-ul în DynamoDB

```bash
aws dynamodb get-item \
  --table-name ai-agent-sessions \
  --key '{"sessionId": {"S": "test-session-001"}}' \
  | jq '.Item.metadata.M.bedrockSessionState'
```

### Log-uri Detaliate

În `bedrock-agent.service.ts` am adăugat:

```typescript
if (previousSessionState) {
  this.logger.log(
    `🔄 Reusing previous session state with ${
      Object.keys(previousSessionState.promptSessionAttributes || {}).length
    } prompt attributes`
  );
}
```

Vei vedea câte atribute dinstate sunt re-folosite.

## ⚠️ Considerații

### 1. **Session Cleanup**

State-ul Bedrock este stocat în `metadata.bedrockSessionState` care:
- ✅ Persistă între mesaje în aceeași sesiune
- ✅ Este șters când sesiunea este closed/resolved
- ✅ Nu ocupă mult spațiu (doar JSON cu variabile)

### 2. **State Size**

Bedrock limitează dimensiunea sessionState. Evită:
- ❌ Să stochezi liste mari în state
- ❌ Să stochezi date binare
- ✅ Păstrează doar variabile esențiale

### 3. **Merge Strategy**

Când merge-uim state, `sessionAttributes` (statice) **suprascriu** pe cele din previousState:
```typescript
sessionAttributes: {
  ...previousSessionState.sessionAttributes,
  ...currentAttributes, // ← Override
}
```

Dar `promptSessionAttributes` (dinamice) rămân neschimbate de noi - le gestionează Bedrock.

## 📚 Resurse

- **AWS Docs**: [Bedrock Agent Session State](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html)
- **Code**: 
  - `src/shared/interfaces/session.interface.ts`
  - `src/modules/session/session.service.ts`
  - `src/modules/tools/bedrock/bedrock-agent.service.ts`
  - `src/modules/agent/agent.service.ts`

## ✅ Checklist

- [x] Session interface actualizat cu `bedrockSessionState`
- [x] SessionService: metode get/update pentru state
- [x] BedrockAgentService: accept previousSessionState
- [x] ToolsService: pasează previousSessionState
- [x] AgentService: retrieve state înainte, save state după
- [x] AgentModule: importă SessionModule
- [x] No linting errors
- [x] Logging pentru debugging state management

**Conversațiile multi-turn acum funcționează corect! 🎉**

