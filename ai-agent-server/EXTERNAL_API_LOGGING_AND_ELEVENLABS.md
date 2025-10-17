# 📊 External API Logging & Eleven Labs Integration

## Overview

Această implementare adaugă:
1. **Logging centralizat** pentru toate acțiunile externe (SMS, Email, Meta, Voice) inițiate de agent
2. **Eleven Labs Conversational AI** - integrare agent-to-agent cu Bedrock
3. **Multi-tenant configuration** - configurare per business din RDS (resursa "setting")

---

## 🔧 Componente Implementate

### 1. **Kinesis Logger Service**

**Path**: `ai-agent-server/src/shared/services/kinesis-logger.service.ts`

**Scop**: Loghează toate acțiunile externe inițiate de agent în Kinesis stream (același stream ca resources: `resources-operations`)

**Format Log**:
```typescript
{
  resourceType: 'agent-log',
  operation: 'create',
  businessId: 'B0100001',
  locationId: 'L0100001',
  data: {
    actionType: 'sms' | 'email' | 'voice_call' | 'meta_message',
    subAction: 'send' | 'receive' | 'failed',
    agentSessionId: 'session-123',
    triggeredBy: 'bedrock_agent',
    recipient: { phone/email, userId, name },
    provider: 'aws_sns' | 'twilio' | 'meta' | 'gmail' | 'elevenlabs',
    externalId: 'message-id-from-provider',
    metadata: {
      // Specific pentru fiecare tip
      callDuration, conversationId, subject, messageLength, etc.
      deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed',
      errorMessage: '...'
    }
  },
  timestamp: '2025-10-15T10:00:00Z',
  requestId: 'uuid'
}
```

**Metode**:
- `logAgentSms()` - log SMS
- `logAgentEmail()` - log Email
- `logAgentMetaMessage()` - log Meta message
- `logAgentVoiceCall()` - log Eleven Labs conversation

**Flow**:
```
Agent Tool (external-api.tool.ts)
    ↓ execute SMS/Email/Meta
External APIs Service (sendSMS/sendEmail/etc)
    ↓ success/failure
KinesisLogger.logAgent***()
    ↓
Kinesis Stream (resources-operations)
    ↓
Resources Server Consumer
    ↓
Elixir Listener → Broadcast WebSocket
    ↓
RDS (agent-log resource)
```

---

### 2. **External API Tool - Logging Integration**

**Path**: `ai-agent-server/src/modules/tools/http-tools/external-api.tool.ts`

**Modificări**:
- Inject `KinesisLoggerService`
- După fiecare apel SMS/Email/Meta → log la Kinesis
- Include `agentSessionId`, `provider`, `success/failure`, `externalId`
- Log și în catch block pentru failures

**Nu modificăm**:
- `external-apis.service.ts` (logica de SMS/Email rămâne neschimbată)
- `message-automation.service.ts` (automation rămâne neschimbat)

**Doar logăm când**:
- Agentul inițiază acțiunea prin tool
- Avem `context.sessionId` disponibil

---

### 3. **Eleven Labs Service**

**Path**: `ai-agent-server/src/modules/external-apis/voice/elevenlabs.service.ts`

**Funcționalități**:

#### a) **Configuration Management**
- Citește config din RDS (resursa `setting`, resourceId: `elevenlabs-config`)
- Format config:
```typescript
{
  enabled: boolean,
  agentId: string, // Eleven Labs agent ID
  voiceId: string,
  greeting: string,
  customPrompt?: string,
  apiKey: string, // Per-tenant API key
  phoneNumber?: string,
  conversationSettings: {
    maxDuration: 300,
    recordCalls: true,
    sendTranscripts: false
  }
}
```

#### b) **Activation Flow**
```
Admin POST /api/elevenlabs/activate/:businessId
    ↓
ElevenLabsService.activate()
    ↓
1. Verifică dacă nu e deja activat
2. Creează agent pe Eleven Labs (API call)
3. Salvează config în RDS (prin app server → Kinesis)
4. Return agentId
```

#### c) **Agent Creation** (Eleven Labs API)
```typescript
POST https://api.elevenlabs.io/v1/convai/agents
{
  name: "Agent ${businessName}",
  prompt: { system: "...", greeting: "..." },
  voice: { voice_id: "..." },
  webhook: {
    url: "${AI_AGENT_SERVER_URL}/api/elevenlabs/webhook",
    metadata: { businessId: "B0100001" }
  },
  conversation_config: {
    turn_timeout: 10,
    max_duration: 300
  }
}
```

#### d) **Deactivation**
- Set `enabled: false` în config
- Păstrează `agentId` pentru reactivare

---

### 4. **Eleven Labs Controller (Webhook Handler)**

**Path**: `ai-agent-server/src/modules/external-apis/voice/elevenlabs.controller.ts`

**Endpoints**:

#### POST `/api/elevenlabs/activate/:businessId`
```json
{
  "locationId": "L0100001",
  "voiceId": "voice_id_from_elevenlabs",
  "greeting": "Bună ziua, cu ce vă pot ajuta?",
  "customPrompt": "...",
  "apiKey": "elevenlabs_api_key",
  "businessName": "Clinica Dentara XYZ"
}
```

#### DELETE `/api/elevenlabs/deactivate/:businessId?locationId=L0100001`

#### GET `/api/elevenlabs/status/:businessId?locationId=L0100001`

#### POST `/api/elevenlabs/webhook` (Agent-to-Agent Integration)
```
Eleven Labs trimite:
{
  event: 'message',
  conversationId: 'conv_xxx',
  message: { content: 'Vreau o programare' },
  metadata: { businessId: 'B0100001', locationId: 'L0100001' },
  duration: 30,
  transcript: '...'
}

Flow:
1. Extract businessId din metadata
2. Verifică dacă Eleven Labs este enabled
3. Log la Kinesis (voice_call.receive)
4. Procesează prin Bedrock Agent:
   agentService.processMessage({
     businessId,
     locationId,
     userId: conversationId, // conversationId = userId
     sessionId: conversationId, // conversationId = sessionId
     message,
     view: { source: 'voice', conversationId }
   })
5. Return răspuns către Eleven Labs:
   {
     response: bedrockResponse.message,
     continueConversation: true,
     actions: bedrockResponse.actions
   }
```

**Event Types**:
- `message` - mesaj nou de procesat
- `conversation_start` - conversație începută
- `conversation_end` - conversație încheiată (log duration)

---

## 🔄 Flow Complet: Voice Call → Bedrock → Response

```
1. Customer sună numărul clinicii
   ↓
2. Eleven Labs răspunde cu vocea configurată
   ↓
3. Customer: "Vreau o programare mâine la 10"
   ↓
4. Eleven Labs → POST /api/elevenlabs/webhook
   {
     conversationId: "conv_123",
     message: { content: "Vreau o programare..." },
     metadata: { businessId: "B0100001" }
   }
   ↓
5. ElevenLabsController:
   - Extract businessId
   - Verifică isEnabled
   - Log la Kinesis (agent-log: voice_call.receive)
   ↓
6. AgentService.processMessage() → Bedrock Agent
   - Context: businessId, locationId, sessionId=conversationId
   - View: { source: 'voice' }
   ↓
7. Bedrock Agent:
   - Understanding message
   - Apelează tool: query_app_server (check disponibilitate)
   - Generate răspuns: "Perfect! Avem disponibil mâine la 10:00..."
   ↓
8. Răspuns către Eleven Labs:
   {
     response: "Perfect! Avem disponibil...",
     continueConversation: true
   }
   ↓
9. Eleven Labs citește răspunsul vocal clientului
```

---

## 📊 Logging Flow

```
Tool Call (SMS/Email/Meta/Voice)
    ↓
KinesisLoggerService.logAgent***()
    ↓
Kinesis Stream: resources-operations
    ↓
Resources Server (KinesisConsumer)
    ↓
POST http://elixir-server/api/external-api-actions
    ↓
Elixir Listener:
  - Process/enrich action
  - Broadcast la WebSocket (real-time UI update)
  - POST http://resources-server/resources (save to RDS)
    ↓
RDS: resources table
  - businessLocationId: "B0100001:L0100001"
  - resourceType: "agent-log"
  - resourceId: "log-{uuid}"
  - data: { actionType, subAction, recipient, metadata, ... }
```

**Beneficii**:
- ✅ Tracking complet al tuturor acțiunilor agent
- ✅ Date în timp real prin WebSocket
- ✅ Persistență în RDS pentru analytics
- ✅ Audit trail complet
- ✅ Non-blocking (logging nu oprește flow-ul)

---

## 🔐 Security Considerations

### API Keys Management
- API keys pentru Eleven Labs sunt stocate în RDS (în practică ar trebui encriptate)
- Webhook-urile de la Eleven Labs ar trebui validate cu signature
- Admin endpoints (`/activate`, `/deactivate`) ar trebui protejate cu `AdminGuard`

### Webhook Signature Verification (TODO)
```typescript
// În ElevenLabsController.handleWebhook()
const signature = req.headers['x-elevenlabs-signature'];
const isValid = this.verifyWebhookSignature(req.body, signature, config.webhookSecret);
if (!isValid) {
  throw new UnauthorizedException('Invalid signature');
}
```

---

## 📝 Configuration în DynamoDB

### ✅ **NU** în RDS - folosim DynamoDB!

**De ce DynamoDB?**
- ✅ Acces rapid (< 10ms latency)
- ✅ Scalabilitate automată
- ✅ Pay-per-request (cost-effective)
- ✅ Ideal pentru configurații per tenant
- ✅ Nu necesită migrări schema

### Table Structure

```
Table Name: elevenlabs-agents
Primary Key (HASH): businessId
Sort Key (RANGE): locationId
```

### Item Example

```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "enabled": true,
  "agentId": "agent_abc123",
  "voiceId": "voice_def456",
  "greeting": "Bună ziua! Sunt asistentul virtual.",
  "customPrompt": "You are a helpful assistant...",
  "conversationSettings": {
    "maxDuration": 300,
    "recordCalls": true,
    "sendTranscripts": false
  },
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-10-15T10:00:00Z"
}
```

### Create Table

```bash
./scripts/create-elevenlabs-agents-table.sh
```

### Query Config

```typescript
// În ElevenLabsService
const config = await this.getConfig('B0100001', 'L0100001');
// DynamoDB GetItem - O(1) lookup
```

**Vezi detalii complete**: `DYNAMODB_ELEVENLABS_AGENTS.md`

---

## 🧪 Testing

### 1. Test Activation
```bash
POST http://localhost:3003/api/elevenlabs/activate/B0100001
Content-Type: application/json

{
  "locationId": "L0100001",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "greeting": "Bună ziua! Sunt asistentul clinicii. Cu ce vă pot ajuta?",
  "customPrompt": "You are a helpful dental assistant...",
  "businessName": "Clinica Test"
}

# Expected Response:
{
  "success": true,
  "agentId": "agent_xyz123",
  "message": "Eleven Labs conversational AI activated successfully"
}

# ✅ Agent-ul este creat pe contul global (folosind ELEVENLABS_API_KEY din env)
# ✅ Config salvat în DynamoDB (elevenlabs-agents table)
```

### 2. Check Status
```bash
GET http://localhost:3003/api/elevenlabs/status/B0100001?locationId=L0100001

# Expected Response:
{
  "enabled": true,
  "config": {
    "agentId": "agent_xyz123",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "greeting": "...",
    "conversationSettings": { ... }
  }
}
```

### 3. Test Webhook (Simulate Eleven Labs)
```bash
POST http://localhost:3003/api/elevenlabs/webhook
Content-Type: application/json

{
  "event": "message",
  "conversationId": "conv_test_123",
  "message": {
    "content": "Vreau să fac o programare"
  },
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  },
  "duration": 5
}

# Expected Response:
{
  "response": "Desigur! Cu plăcere vă pot ajuta cu o programare. Pentru ce dată doriți?",
  "continueConversation": true,
  "actions": []
}
```

### 4. Verify Logging în Kinesis
```bash
# Check DynamoDB pentru agent-log resources
# sau
# Check Elixir WebSocket pentru broadcast events
```

---

## 🌐 Environment Variables

```bash
# ai-agent-server/.env
AI_AGENT_SERVER_URL=https://your-ai-agent-server.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
KINESIS_STREAM_NAME=resources-operations

# Eleven Labs - UN SINGUR API KEY GLOBAL
ELEVENLABS_API_KEY=your_global_api_key
DYNAMODB_ELEVENLABS_AGENTS_TABLE=elevenlabs-agents
```

### ⚠️ Important: API Key Management

- **UN SINGUR** API key în `ELEVENLABS_API_KEY` (environment variable)
- **NU** salvăm API key per tenant
- Toate agent-urile sunt create pe același cont Eleven Labs
- Diferențierea: prin `agentId` + `metadata.businessId` în webhook

---

## 📚 Integration Points

### 1. Bedrock Agent
- Eleven Labs calls → `AgentService.processMessage()`
- Context include `view.source = 'voice'` pentru voice-specific behavior
- Session management prin `conversationId`

### 2. Tools Available
Voice calls au acces la toate tool-urile Bedrock:
- `query_app_server` - check disponibilități
- `create_appointment` - creează programări
- `send_external_message` - trimite confirmare SMS/Email
- `send_elixir_notification` - notifică frontend

### 3. Real-time Updates
- Logs în Kinesis → Elixir → WebSocket broadcast
- Frontend primește în timp real când agentul trimite SMS/Email/Voice

---

## 🚀 Next Steps

1. ✅ **Implementat**: Kinesis logging pentru agent actions
2. ✅ **Implementat**: Eleven Labs service cu config din RDS
3. ✅ **Implementat**: Webhook handler cu integrare Bedrock
4. ⏳ **TODO**: Webhook signature verification
5. ⏳ **TODO**: Admin guard pentru activate/deactivate endpoints
6. ⏳ **TODO**: API key encryption în RDS
7. ⏳ **TODO**: Transcript storage pentru voice calls
8. ⏳ **TODO**: Analytics dashboard pentru agent logs
9. ⏳ **TODO**: Cost tracking per action (Eleven Labs, Twilio, etc.)

---

## 📄 Files Changed/Created

### Created:
- `ai-agent-server/src/shared/services/kinesis-logger.service.ts`
- `ai-agent-server/src/modules/external-apis/voice/elevenlabs.service.ts`
- `ai-agent-server/src/modules/external-apis/voice/elevenlabs.controller.ts`

### Modified:
- `ai-agent-server/src/modules/tools/http-tools/external-api.tool.ts`
- `ai-agent-server/src/modules/tools/tools.module.ts`
- `ai-agent-server/src/modules/external-apis/external-apis.module.ts`

---

**Implementare completă! Ready for testing! 🎉**

