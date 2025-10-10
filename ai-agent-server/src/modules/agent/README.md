# Agent Module - Bedrock Orchestrator

## Overview

Agent Module servește ca **orchestrator** pentru AWS Bedrock Agent. În loc să execute logica AI local, modulul:

1. Primește mesaje de la operatori (WebSocket) sau clienți (webhooks)
2. Creează context pentru Bedrock (businessId, role, businessType, etc.)
3. Trimite către Bedrock Agent pentru procesare
4. Returnează răspunsul către utilizator

## Arhitectură

```
┌─────────────────────────────────────────────────────────┐
│              Agent Module                                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Agent Service                             │  │
│  │  - processMessage() → operator messages          │  │
│  │  - processWebhookMessage() → customer messages   │  │
│  └────────────┬─────────────────────────────────────┘  │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Tools Service (ToolsModule)                │ │
│  │  - Bedrock Agent invocation                       │ │
│  │  - Tool execution                                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Componente

### `agent.service.ts`

Service principal care orchestrează procesarea mesajelor:

#### Methods

**`processMessage(data: MessageDto): Promise<AgentResponse>`**
- Procesează mesaje de la **operatori** prin WebSocket
- Creează context cu `role: 'operator'`
- Invocă Bedrock Agent prin ToolsService
- Returnează răspuns cu metadata (toolsUsed, executionTime)

**`processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult>`**
- Procesează mesaje de la **clienți** prin webhooks (Meta, Twilio, etc.)
- Creează context cu `role: 'customer'`
- Invocă Bedrock Agent
- Returnează rezultat autonomous cu workflow steps

**`processWebhookThroughPipeline(webhookData: WebhookData): Promise<AgentResponse>`**
- Wrapper pentru processWebhookMessage cu format AgentResponse
- Folosit pentru testing sau cazuri speciale

### `agent.controller.ts`

Controller HTTP pentru testarea direct a agentului:

```typescript
POST /agent/message
{
  "businessId": "dental_clinic_1",
  "userId": "operator_1",
  "message": "Vreau să văd lista de pacienți",
  "sessionId": "session_123"
}
```

### `agent.module.ts`

Module NestJS care importă:
- **BusinessInfoModule** - pentru business info
- **ToolsModule** - pentru Bedrock integration și tools

## Context Format

Toate mesajele sunt convertite în **ToolContext** pentru Bedrock:

```typescript
interface ToolContext {
  businessId: string;        // Business/tenant ID
  locationId: string;        // Location within business
  userId: string;            // User sending message
  sessionId: string;         // Session ID pentru conversație
  role: 'operator' | 'customer'; // Role determină capabilitățile
  businessType?: 'dental' | 'gym' | 'hotel'; // Tip business
  source: 'websocket' | 'webhook' | 'cron'; // Sursa mesajului
}
```

## Role-Based Processing

### Operator Role
- **Source**: WebSocket
- **Capabilities**: Full access la toate datele
- **Use Cases**: Internal operations, data analysis, customer support
- **Tools Available**: Toate tools-urile (query_app_server, management, etc.)

### Customer Role
- **Source**: Webhooks (Meta, Twilio, Email)
- **Capabilities**: Limited access (nu poate vedea date alți clienți)
- **Use Cases**: Booking assistance, service inquiries
- **Tools Available**: Subset filtrat de tools

Bedrock Agent decide automat ce tools să folosească bazat pe **role** și **businessType** din context.

## Response Format

### AgentResponse (pentru operatori)

```typescript
{
  responseId: string;
  message: string;           // Răspuns AI
  actions: AgentAction[];    // Acțiuni sugerate
  timestamp: string;
  sessionId: string;
  metadata?: {
    toolsUsed?: string[];    // Tools executate de Bedrock
    executionTime?: number;  // Timp execuție (ms)
  }
}
```

### AutonomousActionResult (pentru clienți)

```typescript
{
  success: boolean;
  workflowResults: WorkflowStepResult[];
  notification: string;
  shouldRespond: boolean;
  response?: string;
}
```

## Integration cu ToolsModule

Agent Service NU mai conține logică AI. Toată procesarea este delegată către **ToolsModule**:

```typescript
// În agent.service.ts
const bedrockResult = await this.toolsService.processMessage(
  data.message,
  toolContext,
  toolContext.sessionId,
);
```

ToolsService se ocupă de:
- Invocare Bedrock Agent
- Execuție tools cerute de Bedrock
- Knowledge Base retrieval (RAG)
- Error handling și retry logic

## Error Handling

Toate erorile sunt handle-ate graceful:

```typescript
try {
  const bedrockResult = await this.toolsService.processMessage(...);
  
  if (!bedrockResult.success) {
    return {
      message: 'Ne pare rău, am întâmpinat o problemă tehnică...',
      // ...
    };
  }
  
  return bedrockResult;
} catch (error) {
  this.logger.error('Error processing message:', error);
  return fallbackResponse;
}
```

## Testing

### Unit Tests

```typescript
// agent.service.spec.ts
describe('AgentService', () => {
  it('should process operator message', async () => {
    const result = await agentService.processMessage({
      businessId: 'test',
      userId: 'operator1',
      message: 'Lista pacienți',
      sessionId: 'session1',
    });
    
    expect(result.success).toBe(true);
    expect(result.metadata.toolsUsed).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Test prin HTTP
curl -X POST http://localhost:3003/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "dental_clinic",
    "userId": "operator_1",
    "message": "Vreau să văd programările de azi"
  }'
```

## Dependencies

- **BusinessInfoService** - pentru business type și info
- **ToolsService** - pentru Bedrock Agent și tools execution

## Migration Note

⚠️ **Serviciile RAG locale au fost eliminate:**
- ❌ `SimplifiedRagService` (șters)
- ❌ `ResourceRagService` (șters)
- ❌ `rag/` directory (șters)

✅ **Acum folosim:**
- AWS Bedrock Agent pentru procesare
- AWS Knowledge Bases pentru RAG (vectori în S3)
- Tools architecture pentru execuție acțiuni

Pentru detalii despre tools, vezi `/src/modules/tools/README.md`.

## See Also

- **BEDROCK_SETUP.md** - Setup complet AWS Bedrock
- **BEDROCK_MIGRATION_SUMMARY.md** - Rezumat migrare
- **src/modules/tools/README.md** - Documentație tools
- **QUICKSTART.md** - Start rapid
