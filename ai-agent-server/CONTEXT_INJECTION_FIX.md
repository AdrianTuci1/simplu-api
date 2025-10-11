# 🔧 Context Injection Fix - Bedrock Agent

## ❌ Problema Descoperită

### Ce nu funcționa:
În Agent Instructions din AWS Console folosisem sintaxa:
```
Role: $session_attributes.role$
Business: $session_attributes.businessId$
```

**Rezultat**: Agentul vedea text literal `$session_attributes.role$` în loc de valorile reale!

### De ce?
- Sintaxa `$session_attributes.x$` **NU funcționează** în Agent Instructions standard
- Session attributes sunt disponibile pentru **Action Groups (tools)** automat
- DAR nu sunt injectate automat în prompt-ul către model

## ✅ Soluția Implementată

### 1. Injectare Context în Input Text

**Fișier**: `bedrock-agent.service.ts`

```typescript
// Prepend context to message for first message in session
let inputText = message;
if (!previousSessionState) {
  // First message - add context
  const contextPrefix = `[Context: You are assisting a ${context.role} user for business ${context.businessId} (${context.businessType}), location ${context.locationId}]\n\n`;
  inputText = contextPrefix + message;
  this.logger.log(`📋 Adding context prefix to first message`);
}
```

**Ce face**:
- La primul mesaj din sesiune (când `previousSessionState` e null)
- Adaugă prefix cu contextul complet
- Mesajele ulterioare nu mai primesc prefix (contextul e păstrat în session state)

### 2. Agent Instructions Actualizate

**Locație**: AWS Console → Bedrock → Agents → Agent Instructions

**Snippet cheie**:
```
## CONTEXT FROM SESSION

The first message in each conversation will include context in this format:
[Context: You are assisting a {role} user for business {businessId} ({businessType}), location {locationId}]

Extract and remember:
- Role: operator or customer
- Business ID: The business identifier
- Location ID: The location identifier  
- Business Type: Type of business (dental, gym, hotel, etc.)
```

**Instrucțiuni complete**: Vezi `BEDROCK_AGENT_INSTRUCTIONS.md`

## 📊 Flow Complet

### Primul Mesaj într-o Sesiune

```
User input: "Salut!"

↓ (bedrock-agent.service.ts)

Bedrock primește:
"[Context: You are assisting a operator user for business B0100001 (dental), location L0100001]

Salut!"

↓ (Bedrock Agent)

Agent extrage:
- role = operator
- businessId = B0100001
- locationId = L0100001
- businessType = dental

↓ (Agent răspunde cu context)

"Salut! Cum vă pot ajuta astăzi?"
```

### Al Doilea Mesaj (Aceeași Sesiune)

```
User input: "Ce tratamente avem?"

↓ (bedrock-agent.service.ts)

previousSessionState EXISTS → NU adaugă prefix

Bedrock primește:
"Ce tratamente avem?"

↓ (Bedrock Agent)

Agent își amintește contextul din session state
Știe role=operator, businessId, locationId

↓ (Agent poate apela tools cu context corect)

Apelează query_app_server cu businessId=B0100001, locationId=L0100001
```

## 🔍 Verificare în Log-uri

### La primul mesaj:
```
📋 Adding context prefix to first message
📤 Invoking Bedrock Agent for session: test-session-123

În trace, modelInvocationInput va arăta:
"messages": [{
  "content": "[{text=[Context: You are assisting a operator user for business B0100001 (dental), location L0100001]\n\nSalut!}]",
  "role": "user"
}]
```

### La mesajele următoare:
```
🔄 Reusing previous session state with X prompt attributes
📤 Invoking Bedrock Agent for session: test-session-123

În trace, modelInvocationInput:
"messages": [...istoric conversație fără prefix...]
```

## 💡 Beneficii

### 1. **Context Explicit**
✅ Agentul vede exact ce role are user-ul
✅ Știe businessId și locationId pentru tool calls
✅ Poate valida permisiuni corect

### 2. **Eficiență**
✅ Context adăugat doar la primul mesaj
✅ Session state păstrează contextul pentru mesajele următoare
✅ Nu repetăm contextul inutil

### 3. **Simplitate**
✅ Nu necesită Prompt Templates custom complexe
✅ Funcționează cu Agent Instructions standard
✅ Ușor de debugat în trace

## 🧪 Testing

### Test Manual

```bash
# Start server
cd ai-agent-server
npm run start:dev

# Trimite primul mesaj într-o sesiune nouă
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test-context-' $(date +%s) '",
    "message_id": "msg_1",
    "payload": {
      "content": "Salut!"
    }
  }'
```

**Verifică în log-uri:**
```
✅ SessionService: No Bedrock session state found for test-context-...
📋 Adding context prefix to first message
📤 Invoking Bedrock Agent for session: test-context-...
```

**În trace (modelInvocationInput):**
```json
{
  "text": "...messages\":[{\"content\":\"[{text=[Context: You are assisting a operator user for business B0100001 (dental), location L0100001]\\n\\nSalut!}]\"..."
}
```

### Test al Doilea Mesaj

```bash
# Același session_id ca mai sus
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test-context-XXXXX",  # Același session_id!
    "message_id": "msg_2",
    "payload": {
      "content": "Ce tratamente avem?"
    }
  }'
```

**Verifică în log-uri:**
```
✅ SessionService: Retrieved Bedrock session state for test-context-...
🔄 Reusing previous session state with X prompt attributes
📤 Invoking Bedrock Agent for session: test-context-...
```

**NU mai vezi "Adding context prefix"** - corect!

## 📝 Fișiere Modificate

1. ✅ **bedrock-agent.service.ts**
   - Adăugat logică de injectare context în primul mesaj
   - Log nou: `📋 Adding context prefix to first message`

2. ✅ **BEDROCK_AGENT_INSTRUCTIONS.md**
   - Actualizat instructions pentru AWS Console
   - Eliminat sintaxa greșită `$session_attributes.x$`
   - Adăugat secțiune despre extragere context din mesaj

## ⚠️ Important

### Ce trebuie să faci în AWS Console:

1. Mergi la **Bedrock** → **Agents** → Selectează agent-ul
2. **Edit Agent** → **Agent Instructions**
3. **Șterge** instrucțiunile vechi cu `$session_attributes.role$`
4. **Copiază** instrucțiunile noi din `BEDROCK_AGENT_INSTRUCTIONS.md`
5. **Save** + **Prepare** agent

**Fără acest pas, agentul nu va ști să interpreteze contextul!**

## 🎯 Rezultat Final

### Înainte ❌:
```
Trace: "Role: $session_attributes.role$"
       ↑ Text literal, neînlocuit
```

### Acum ✅:
```
Trace: "[Context: You are assisting a operator user for business B0100001 (dental), location L0100001]"
       ↑ Valori reale, injectate de codul nostru
```

---

## 📚 Resurse

- **Cod**: `src/modules/tools/bedrock/bedrock-agent.service.ts`
- **Instructions**: `BEDROCK_AGENT_INSTRUCTIONS.md`
- **Session State**: `BEDROCK_SESSION_STATE_MANAGEMENT.md`
- **Action Groups**: `BEDROCK_ACTION_GROUPS_SETUP.md`

**Context injection funcționează perfect! 🎉**

