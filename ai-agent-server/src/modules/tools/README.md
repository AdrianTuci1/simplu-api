# Tools Module - AWS Bedrock Integration

## Overview

Modulul `tools` transformă ai-agent-server într-un orchestrator de tools pentru AWS Bedrock Agent. În loc să execute logica AI local, acum serverul:

1. **Primește mesaje** de la operatori sau clienți
2. **Trimite către Bedrock Agent** pentru procesare
3. **Execută tools-urile** cerute de Bedrock (HTTP requests, WebSocket broadcasts, etc.)
4. **Returnează răspunsul** către utilizator

## Arhitectură

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Server                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Agent Service (Orchestrator)               │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │              Tools Service                           │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │      Bedrock Agent Service                   │   │  │
│  │  │  - InvokeAgent                               │   │  │
│  │  │  - Knowledge Base Retrieval (S3 vectors)     │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                     │  │
│  │  ┌──────────────▼───────────────────────────────┐   │  │
│  │  │      Tool Executor Service                   │   │  │
│  │  │  - Manages tool registry                     │   │  │
│  │  │  - Executes tools on demand                  │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                     │  │
│  │      ┌──────────┴──────────┬──────────────────┐     │  │
│  │      │                     │                  │     │  │
│  │  ┌───▼────┐         ┌─────▼──────┐    ┌─────▼──┐  │  │
│  │  │  HTTP  │         │ WebSocket  │    │ Future │  │  │
│  │  │  Tools │         │   Tools    │    │ Tools  │  │  │
│  │  └────────┘         └────────────┘    └────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                      │                    │
         ▼                      ▼                    ▼
   App Server            Elixir Server       External APIs
   Management            WebSocket Hub       (Meta/Twilio/Gmail)
```

## Componente

### 1. Bedrock Services

#### `bedrock-agent.service.ts`
- **Invocă Bedrock Agent** cu mesaje
- **Procesează streaming responses**
- **Extrage tool usage** din trace
- **Retrieve direct** din Knowledge Base (dacă e nevoie)

```typescript
const result = await bedrockAgentService.invokeAgent(
  'Vreau să văd lista de pacienți',
  {
    businessId: 'dental_clinic_1',
    userId: 'operator_1',
    role: 'operator',
    source: 'websocket',
  }
);
```

#### `tool-executor.service.ts`
- **Registry de tools** - păstrează toate tools-urile disponibile
- **Execută tools** când sunt cerute de Bedrock
- **Tracking și logging** pentru debugging

```typescript
toolExecutor.registerTool(appServerTool);
toolExecutor.registerTool(elixirNotificationTool);

const result = await toolExecutor.executeTool({
  toolName: 'query_app_server',
  parameters: { endpoint: '/api/resources', method: 'GET' },
  context: toolContext,
});
```

### 2. HTTP Tools

Tools pentru comunicarea cu alte servere prin HTTP.

#### `app-server.tool.ts`
Queries către app server pentru resources, bookings, patients.

```typescript
// Tool definition trimisă către Bedrock
{
  name: 'query_app_server',
  description: 'Queries the app server for resources like patients, appointments...',
  inputSchema: {
    json: {
      type: 'object',
      properties: {
        endpoint: { type: 'string' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        params: { type: 'object' },
        body: { type: 'object' },
      }
    }
  }
}

// Execuție
await appServerTool.execute({
  toolName: 'query_app_server',
  parameters: {
    endpoint: '/api/resources',
    method: 'GET',
    params: { type: 'patient', limit: 10 },
  },
  context: { businessId, userId, ... }
});
```

#### `elixir-notification.tool.ts`
Trimite notificări către Elixir notification hub pentru frontend.

```typescript
await elixirNotificationTool.execute({
  toolName: 'send_elixir_notification',
  parameters: {
    businessId: 'clinic_1',
    userId: 'operator_1',
    sessionId: 'session_123',
    content: 'AI response generated',
    context: { actions: [...] },
  },
  context: toolContext,
});
```

#### `external-api.tool.ts`
Trimite mesaje prin Meta (WhatsApp), Twilio (SMS), Gmail.

```typescript
await externalApiTool.execute({
  toolName: 'send_external_message',
  parameters: {
    provider: 'meta',
    to: '+40123456789',
    message: 'Programarea dumneavoastră este confirmată',
    businessId: 'clinic_1',
  },
  context: toolContext,
});
```

#### `management-server.tool.ts`
Queries pentru configurații business, subscriptions, invitations.

### 3. WebSocket Tools

Tools pentru interacțiunea real-time cu frontend-ul.

#### `broadcast.tool.ts`
Broadcast mesaje către clienți WebSocket.

```typescript
await broadcastTool.execute({
  toolName: 'broadcast_websocket_message',
  parameters: {
    target: 'business', // sau 'user'
    businessId: 'clinic_1',
    event: 'new_message',
    data: { message: 'AI response', actions: [...] },
  },
  context: toolContext,
});
```

#### `draft-management.tool.ts`
Creează, actualizează, șterge drafts pentru răspunsuri.

```typescript
await draftManagementTool.execute({
  toolName: 'manage_draft',
  parameters: {
    action: 'create',
    draftType: 'message',
    content: {
      to: 'customer_1',
      subject: 'Răspuns la întrebare',
      body: 'Bună ziua, ...',
    },
  },
  context: toolContext,
});
```

#### `frontend-interaction.tool.ts`
Solicită resurse de la frontend sau trimite date către frontend.

```typescript
await frontendInteractionTool.execute({
  toolName: 'interact_with_frontend',
  parameters: {
    action: 'request_resources',
    requestType: 'patients_list',
    parameters: { filters: { status: 'active' } },
  },
  context: toolContext,
});
```

## Cum să Adaugi un Tool Nou

### 1. Creează Tool Class

```typescript
// src/modules/tools/http-tools/my-custom.tool.ts
import { Injectable } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';

@Injectable()
export class MyCustomTool implements ToolExecutor {
  getDefinition(): ToolDefinition {
    return {
      name: 'my_custom_action',
      description: 'Description for Bedrock to understand when to use this tool',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' },
            param2: { type: 'number', description: 'Second parameter' },
          },
          required: ['param1'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    
    try {
      // Your tool logic here
      const result = await this.performAction(parameters);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  private async performAction(params: any) {
    // Implementation
  }
}
```

### 2. Înregistrează Tool-ul

```typescript
// src/modules/tools/tools.module.ts
import { MyCustomTool } from './http-tools/my-custom.tool';

@Module({
  providers: [
    // ... existing tools
    MyCustomTool,
  ],
})
export class ToolsModule {}
```

```typescript
// src/modules/tools/tools.service.ts
export class ToolsService implements OnModuleInit {
  constructor(
    // ... existing tools
    private readonly myCustomTool: MyCustomTool,
  ) {}

  onModuleInit() {
    // ... existing registrations
    this.toolExecutorService.registerTool(this.myCustomTool);
  }
}
```

### 3. Configurează în Bedrock Agent

1. Du-te în AWS Console → Bedrock → Agents
2. Selectează agent-ul tău
3. Adaugă un nou Action Group sau actualizează unul existent
4. Adaugă tool definition-ul (JSON Schema din `getDefinition()`)
5. Configurează invocation să apeleze Lambda-ul sau API-ul tău

## Knowledge Base (RAG)

### Migrarea din DynamoDB în S3

```bash
cd scripts
node migrate-rag-to-s3.js
```

Acest script:
1. Extrage toate datele RAG din DynamoDB
2. Convertește în format text pentru embeddings
3. Upload în S3 bucket
4. Generează instrucțiuni pentru setup Knowledge Base

### Structura Documentelor în S3

```json
{
  "id": "dental_operator_general",
  "content": "Response: Bună ziua! Cu ce vă pot ajuta?\n\nSystem Instructions: Ești un asistent AI...",
  "metadata": {
    "businessType": "dental",
    "role": "operator",
    "category": "general",
    "lastUpdated": "2024-01-15T10:00:00Z"
  }
}
```

### Retrieve din Knowledge Base

```typescript
const kbResults = await toolsService.retrieveFromKnowledgeBase(
  'Cum procesez o programare?',
  5 // number of results
);
```

## Testing

### Test Tool Individual

```typescript
const result = await toolsService.executeTool(
  'query_app_server',
  {
    endpoint: '/api/resources',
    method: 'GET',
    params: { type: 'patient' },
  },
  {
    businessId: 'test_business',
    userId: 'test_user',
    sessionId: 'test_session',
    role: 'operator',
    source: 'websocket',
  }
);

expect(result.success).toBe(true);
```

### Test Bedrock Integration

```typescript
const result = await toolsService.processMessage(
  'Vreau să văd lista de pacienți',
  {
    businessId: 'dental_clinic',
    userId: 'operator_1',
    sessionId: 'session_123',
    role: 'operator',
    source: 'websocket',
  }
);

expect(result.success).toBe(true);
expect(result.output.message).toBeDefined();
expect(result.toolsUsed).toContain('query_app_server');
```

## Debugging

### Enable Bedrock Tracing

```bash
BEDROCK_ENABLE_TRACE=true
```

Logs vor include:
- Model invocations
- Tool calls cu parametri
- Knowledge Base retrievals
- Execution times

### View Tool Registry

```typescript
const registeredTools = toolsService.getRegisteredTools();
console.log('Registered tools:', registeredTools);
// Output: ['query_app_server', 'send_elixir_notification', ...]

const definitions = toolsService.getToolDefinitions();
console.log('Tool definitions:', definitions);
```

## Performance

### Caching

Tools-urile sunt singleton-uri, create o singură dată la startup.

### Timeouts

- **Bedrock Agent**: 60 seconds (configurable via `BEDROCK_TIMEOUT`)
- **HTTP Tools**: 30 seconds
- **WebSocket Tools**: Instant (no external call)

### Error Handling

Tools-urile returnează întotdeauna `ToolResult` cu:
- `success: boolean`
- `data?: any` (dacă success)
- `error?: string` (dacă failed)

Bedrock Agent va încerca să recupereze din erori sau să ceară mai multe informații.

## Securitate

### API Keys

Toate tools-urile HTTP folosesc API keys pentru autentificare:
- `API_SERVER_KEY` pentru app server
- `MANAGEMENT_SERVER_API_KEY` pentru management server

### Tenant Isolation

Toate tools-urile primesc `context.businessId` și îl folosesc pentru:
- Headers: `x-tenant-id`
- Query parameters: `tenantId`
- Verificare permisiuni

### Rate Limiting

Tools-urile respectă rate limiting-ul serverelor externe:
- App Server: configurabil per tenant
- External APIs: limitat de provider (Meta, Twilio, etc.)

## Troubleshooting

### Tool not found
```
Error: Tool query_app_server not found in registry
```
- Verifică că tool-ul este înregistrat în `tools.service.ts`
- Verifică că provider-ul este adăugat în `tools.module.ts`

### Bedrock Agent timeout
```
Error: Bedrock Agent invocation timed out
```
- Crește `BEDROCK_TIMEOUT`
- Verifică că tool-urile se execută rapid
- Verifică network connectivity către Bedrock

### Knowledge Base no results
```
Warning: No results from Knowledge Base
```
- Verifică că Knowledge Base este synced
- Scade `BEDROCK_KB_MIN_SCORE`
- Verifică query-ul (poate fi prea vag sau prea specific)

## Next Steps

1. **Configurează Bedrock Agent** în AWS Console
2. **Migrează RAG** cu scriptul `migrate-rag-to-s3.js`
3. **Setup Knowledge Base** cu instrucțiunile generate
4. **Deploy** și testează cu mesaje reale
5. **Monitor** logs și metrics în CloudWatch

Pentru mai multe detalii, vezi `BEDROCK_SETUP.md` în root.

