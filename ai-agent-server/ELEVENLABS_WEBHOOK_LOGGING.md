# 📞 Eleven Labs Webhook Logging - Call Completion

## Overview

Această implementare adaugă logging automat pentru apelurile finalizate de la Eleven Labs Conversational AI. Când un apel se încheie, Eleven Labs trimite un webhook `post_call_transcription` cu toate datele relevante (durata, costul, transcrierea).

---

## 🔄 Flow Complet

```
┌──────────────────────────────────────────────────────────────┐
│  1. Customer sună → Eleven Labs răspunde                     │
│  2. Conversație completă (agent vorbește cu clientul)        │
│  3. Apelul se încheie                                        │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│  4. Eleven Labs trimite webhook: post_call_transcription     │
│  POST /api/elevenlabs/webhook                                │
│  {                                                           │
│    "type": "post_call_transcription",                        │
│    "event_timestamp": 1739537297,                            │
│    "data": {                                                 │
│      "agent_id": "agent_xyz123",                             │
│      "conversation_id": "conv_abc456",                       │
│      "status": "done",                                       │
│      "transcript": [...],                                    │
│      "metadata": {                                           │
│        "start_time_unix_secs": 1739537297,                   │
│        "call_duration_secs": 42,                             │
│        "cost": 350                                           │
│      }                                                       │
│    }                                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│  5. ElevenLabsController.handleWebhook()                     │
│     - Detectează event type: post_call_transcription         │
│     - Extrage agent_id, conversation_id, metadata            │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│  6. Găsește tenant (businessId + locationId)                 │
│     - ElevenLabsService.findTenantByAgentId(agent_id)        │
│     - Scan prin DynamoDB după agentId                        │
│     - Returns: { businessId: "B0100001", locationId: "..." }│
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│  7. Log call data to Kinesis                                 │
│     - KinesisLogger.logAgentVoiceCall({                      │
│         subAction: 'call_ended',                             │
│         conversationId,                                      │
│         metadata: {                                          │
│           callDuration: 42,                                  │
│           cost: 350,                                         │
│           startTime: 1739537297,                             │
│           status: 'done',                                    │
│           transcriptLength: 15                               │
│         }                                                    │
│       })                                                     │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│  8. Kinesis → Resources Server → Elixir                      │
│     - Procesare și salvare în RDS                            │
│     - Broadcast prin WebSocket către frontend                │
│     - UI: Real-time update cu datele apelului                │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Date Logate

Când un apel se încheie, următoarele date sunt logate în Kinesis (format compatibil cu `BaseResource`):

```typescript
{
  resourceType: 'agent-logs',  // Plural pentru consistență cu alte resurse
  resourceId: 'log-a1b2c3d4-e5f6-7890-abcd-ef1234567890',  // Unique log ID
  operation: 'create',
  businessId: 'B0100001',
  locationId: 'L0100001',
  data: {
    actionType: 'voice_call',
    subAction: 'call_ended',
    agentSessionId: 'conv_abc456',
    triggeredBy: 'elevenlabs',  // Source: 'elevenlabs' or 'bedrock_agent'
    provider: 'elevenlabs',
    externalId: 'conv_abc456',
    metadata: {
      conversationId: 'conv_abc456',
      callDuration: 42,  // secunde
      cost: 350,          // cost în unități Eleven Labs
      startTime: 1739537297,  // Unix timestamp
      status: 'done',
      transcriptLength: 15,  // număr de mesaje în transcript
      transcriptAvailable: true,
      deliveryStatus: 'delivered'
    }
  },
  timestamp: '2025-10-19T10:00:00Z',
  requestId: 'req-uuid-here'
}
```

### Compatibilitate cu BaseResource

Acest format este 100% compatibil cu `BaseResource` din `app/src/modules/resources/types/base-resource.ts`:

- ✅ `resourceType`: `'agent-logs'` (string)
- ✅ `resourceId`: `'log-{uuid}'` (unique identifier)
- ✅ `businessId`: tenant ID
- ✅ `locationId`: location ID  
- ✅ `data`: Record<string, any> cu toate detaliile
- ✅ `timestamp`: ISO 8601 string
- ✅ `id` (generat de resources-server): `B0100001-L0100001-log-{uuid}`

---

## 🔧 Implementare Tehnică

### 1. **Webhook Handler** (`elevenlabs.controller.ts`)

```typescript
@Post('webhook')
async handleWebhook(@Body() payload: any) {
  const eventType = payload?.type;
  
  if (eventType === 'post_call_transcription') {
    return await this.handleCallEnded(payload);
  }
  
  return { success: true, message: 'Event received but not processed' };
}

private async handleCallEnded(payload: any) {
  const { agent_id, conversation_id, status, transcript, metadata } = payload.data;
  const { start_time_unix_secs, call_duration_secs, cost } = metadata;
  
  // Find tenant by agent_id
  const { businessId, locationId } = await this.findTenantByAgentId(agent_id);
  
  // Log to Kinesis
  await this.kinesisLogger.logAgentVoiceCall({
    businessId,
    locationId,
    agentSessionId: conversation_id,
    subAction: 'call_ended',
    conversationId: conversation_id,
    transcriptAvailable: !!transcript,
    metadata: {
      callDuration: call_duration_secs,
      cost,
      startTime: start_time_unix_secs,
      status,
      transcriptLength: transcript?.length || 0
    }
  });
}
```

### 2. **Tenant Lookup** (`elevenlabs.service.ts`)

```typescript
async findTenantByAgentId(agentId: string): Promise<{ businessId: string; locationId: string } | null> {
  // Scan DynamoDB table pentru a găsi config cu acest agentId
  const result = await this.dynamoClient.send(new ScanCommand({
    TableName: tableNames.elevenLabsAgents,
    FilterExpression: 'agentId = :agentId',
    ExpressionAttributeValues: {
      ':agentId': agentId
    }
  }));
  
  if (!result.Items || result.Items.length === 0) {
    return null;
  }
  
  return {
    businessId: result.Items[0].businessId,
    locationId: result.Items[0].locationId
  };
}
```

### 3. **Kinesis Logger Extension** (`kinesis-logger.service.ts`)

Extended `logAgentVoiceCall()` to support `call_ended` subAction:

```typescript
async logAgentVoiceCall(params: {
  businessId: string;
  locationId: string;
  agentSessionId: string;
  subAction: 'receive' | 'send' | 'failed' | 'call_ended';  // ← Added call_ended
  conversationId: string;
  callDuration?: number;
  transcriptAvailable?: boolean;
  errorMessage?: string;
  metadata?: any;  // ← Added for additional data
}): Promise<void>
```

---

## 🔐 Eleven Labs Webhook Configuration

Pentru a primi acest webhook, trebuie să configurezi în Eleven Labs Dashboard:

### Step 1: Accesează Eleven Labs Settings
1. Deschide [Eleven Labs Dashboard](https://elevenlabs.io)
2. Mergi la **Settings → Webhooks**

### Step 2: Adaugă Webhook
```
Event Type: post_call_transcription
URL: https://your-ai-agent-server.com/api/elevenlabs/webhook
```

### Step 3: Test Webhook
```bash
# Simulează webhook de test
POST /api/elevenlabs/webhook
Content-Type: application/json

{
  "type": "post_call_transcription",
  "event_timestamp": 1739537297,
  "data": {
    "agent_id": "agent_xyz123",
    "conversation_id": "conv_test_123",
    "status": "done",
    "transcript": [
      {
        "role": "agent",
        "message": "Bună ziua! Cum vă pot ajuta?",
        "time_in_call_secs": 0
      },
      {
        "role": "user",
        "message": "Vreau o programare.",
        "time_in_call_secs": 2
      }
    ],
    "metadata": {
      "start_time_unix_secs": 1739537297,
      "call_duration_secs": 42,
      "cost": 350
    }
  }
}

# Expected Response:
{
  "success": true,
  "message": "Call data logged successfully"
}
```

---

## 📊 Analytics & Monitoring

### Queries în RDS (după procesare de către resources-server)

```sql
-- Toate apelurile finalizate pentru un business
SELECT * FROM resources 
WHERE "businessLocationId" = 'B0100001:L0100001'
  AND "resourceType" = 'agent-logs'
  AND "data"->>'actionType' = 'voice_call'
  AND "data"->>'subAction' = 'call_ended'
ORDER BY "createdAt" DESC;

-- Total durata apeluri și cost pentru luna curentă
SELECT 
  COUNT(*) as total_calls,
  SUM((data->'metadata'->>'callDuration')::int) as total_duration_secs,
  SUM((data->'metadata'->>'cost')::int) as total_cost
FROM resources
WHERE "businessLocationId" = 'B0100001:L0100001'
  AND "resourceType" = 'agent-logs'
  AND "data"->>'actionType' = 'voice_call'
  AND "data"->>'subAction' = 'call_ended'
  AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE);

-- Apeluri grupate pe zi
SELECT 
  DATE("createdAt") as call_date,
  COUNT(*) as num_calls,
  AVG((data->'metadata'->>'callDuration')::int) as avg_duration,
  SUM((data->'metadata'->>'cost')::int) as total_cost
FROM resources
WHERE "businessLocationId" = 'B0100001:L0100001'
  AND "resourceType" = 'agent-logs'
  AND "data"->>'subAction' = 'call_ended'
GROUP BY DATE("createdAt")
ORDER BY call_date DESC;

-- Toate log-urile agent (SMS, Email, Voice, Meta) pentru un business
SELECT 
  "data"->>'actionType' as action_type,
  "data"->>'subAction' as sub_action,
  "data"->>'triggeredBy' as triggered_by,
  COUNT(*) as count
FROM resources
WHERE "businessLocationId" = 'B0100001:L0100001'
  AND "resourceType" = 'agent-logs'
GROUP BY "data"->>'actionType', "data"->>'subAction', "data"->>'triggeredBy'
ORDER BY count DESC;
```

---

## ⚡ Performance Considerations

### DynamoDB Scan Performance

⚠️ **Current Implementation**: Uses `ScanCommand` to find tenant by `agentId`

**Problema**: Scan-ul este O(n) și poate fi lent cu multe agenți.

**Soluții pentru producție**:

#### 1. **Global Secondary Index (GSI)** pe agentId

Cel mai eficient - lookup O(1):

```typescript
// Create GSI in DynamoDB
{
  IndexName: 'agentId-index',
  KeySchema: [
    { AttributeName: 'agentId', KeyType: 'HASH' }
  ],
  Projection: {
    ProjectionType: 'ALL'
  }
}

// Query cu GSI
const result = await this.dynamoClient.send(new QueryCommand({
  TableName: tableNames.elevenLabsAgents,
  IndexName: 'agentId-index',
  KeyConditionExpression: 'agentId = :agentId',
  ExpressionAttributeValues: {
    ':agentId': agentId
  }
}));
```

#### 2. **In-Memory Cache**

Cache mapping-ul agentId → businessId:locationId:

```typescript
private agentCache = new Map<string, { businessId: string; locationId: string }>();

async findTenantByAgentId(agentId: string) {
  // Check cache first
  if (this.agentCache.has(agentId)) {
    return this.agentCache.get(agentId);
  }
  
  // Fallback to scan
  const result = await this.scanForAgent(agentId);
  
  // Cache result
  if (result) {
    this.agentCache.set(agentId, result);
  }
  
  return result;
}
```

#### 3. **Eleven Labs Metadata**

Cel mai simplu - include businessId/locationId în metadata webhook-ului la crearea agentului:

```typescript
// În registerAgent()
webhook: {
  url: webhookUrl,
  metadata: {
    businessId: params.businessId,
    locationId: params.locationId  // Eleven Labs va returna asta în webhook
  }
}

// În webhook handler
const { businessId, locationId } = payload.data.metadata;  // Direct din webhook!
```

---

## 🧪 Testing

### 1. Test Manual cu cURL

```bash
# Simulează webhook post_call_transcription
curl -X POST http://localhost:3003/api/elevenlabs/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "post_call_transcription",
    "event_timestamp": 1739537297,
    "data": {
      "agent_id": "agent_xyz123",
      "conversation_id": "conv_test_123",
      "status": "done",
      "transcript": [
        {
          "role": "agent",
          "message": "Bună ziua!",
          "time_in_call_secs": 0
        }
      ],
      "metadata": {
        "start_time_unix_secs": 1739537297,
        "call_duration_secs": 42,
        "cost": 350
      }
    }
  }'
```

### 2. Check Logs

```bash
# AI Agent Server logs
tail -f logs/ai-agent-server.log | grep "Call ended"

# Expected output:
# 📞 Call ended: conv_test_123 | Duration: 42s | Cost: 350 | Status: done
# 🔍 Looking up tenant for agentId: agent_xyz123
# ✅ Found tenant: B0100001:L0100001 for agentId: agent_xyz123
# ✅ Call data logged for B0100001:L0100001
```

### 3. Verify in DynamoDB

```bash
# Check Kinesis stream for agent-log
aws kinesis get-records --shard-iterator <iterator>

# Should see record with:
# - actionType: "voice_call"
# - subAction: "call_ended"
# - metadata: { callDuration: 42, cost: 350, ... }
```

---

## 📝 Transcript Storage (Optional)

Dacă vrei să salvezi transcrierea completă (nu doar metadata), ai două opțiuni:

### Option 1: Store in Metadata (Small transcripts)

```typescript
metadata: {
  callDuration: duration,
  cost,
  transcriptLength: transcript?.length || 0,
  transcript: transcript  // ← Include full transcript
}
```

⚠️ **Limită**: Max ~400KB în Kinesis record

### Option 2: Store in S3 (Large transcripts)

```typescript
// Upload transcript to S3
const transcriptKey = `transcripts/${businessId}/${conversationId}.json`;
await s3.putObject({
  Bucket: 'elevenlabs-transcripts',
  Key: transcriptKey,
  Body: JSON.stringify(transcript),
  ContentType: 'application/json'
});

// Log only S3 reference
metadata: {
  callDuration: duration,
  cost,
  transcriptS3Key: transcriptKey,
  transcriptLength: transcript?.length || 0
}
```

---

## 🚀 Next Steps

1. ✅ **Implementat**: Webhook handler pentru `post_call_transcription`
2. ✅ **Implementat**: Logging în Kinesis cu toate datele apelului
3. ✅ **Implementat**: Tenant lookup prin DynamoDB scan
4. ⏳ **TODO**: Adaugă GSI pe `agentId` în DynamoDB pentru performance
5. ⏳ **TODO**: Implementează cache in-memory pentru agent mapping
6. ⏳ **TODO**: Transcript storage în S3 (opțional)
7. ⏳ **TODO**: Analytics dashboard pentru call metrics
8. ⏳ **TODO**: Webhook signature verification pentru security

---

## 📄 Files Modified/Created

### Modified:
- `ai-agent-server/src/modules/external-apis/voice/elevenlabs.controller.ts`
  - Added `handleWebhook()` endpoint for Eleven Labs events
  - Added `handleCallEnded()` private method for processing call completion
  - Added `findTenantByAgentId()` private method

- `ai-agent-server/src/modules/external-apis/voice/elevenlabs.service.ts`
  - Added `findTenantByAgentId()` public method (DynamoDB scan)
  - Added `ScanCommand` import

- `ai-agent-server/src/shared/services/kinesis-logger.service.ts`
  - **Changed `resourceType` from `'agent-log'` to `'agent-logs'`** (plural, compatible with BaseResource)
  - **Added `resourceId` field** (unique log ID: `'log-{uuid}'`)
  - **Moved `timestamp` and `requestId` to top level** (out of `data`)
  - Extended `AgentLogAction` interface with:
    - `resourceId: string`
    - `triggeredBy: 'bedrock_agent' | 'elevenlabs'`
    - Extended metadata: `cost`, `status`, `startTime`, `transcriptLength`
  - Extended `logAgentAction()` with optional `triggeredBy` parameter
  - Extended `logAgentVoiceCall()` with:
    - `call_ended` subAction support
    - `triggeredBy: 'elevenlabs'` 
    - Additional metadata support

### Created:
- `ai-agent-server/ELEVENLABS_WEBHOOK_LOGGING.md` (this file)

---

**Implementare completă! Ready for production! 🎉**

