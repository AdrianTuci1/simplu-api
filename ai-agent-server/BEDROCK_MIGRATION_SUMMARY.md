# AWS Bedrock Migration - Summary

## Modificări Efectuate

Am migrat ai-agent-server de la o arhitectură bazată pe RAG local în DynamoDB la o arhitectură modernă folosind **AWS Bedrock Agent** cu **Knowledge Bases**.

### 🎯 Obiective Atinse

1. ✅ **Tools Architecture** - ai-agent-server este acum un orchestrator de tools
2. ✅ **AWS Bedrock Integration** - folosește Bedrock Agent pentru procesarea mesajelor
3. ✅ **Knowledge Bases RAG** - RAG integrat direct în Bedrock cu vectori în S3
4. ✅ **Scalabilitate** - tools-urile pot fi adăugate/modificate ușor
5. ✅ **Modularitate** - separare clară între orchestrare și execuție

## Structură Nouă

### Modul `tools/`

```
src/modules/tools/
├── interfaces/                    # Interfețe TypeScript
│   ├── tool.interface.ts
│   └── tool-result.interface.ts
├── bedrock/                       # Integrare Bedrock
│   ├── bedrock-agent.service.ts  # InvokeAgent, Knowledge Base
│   └── tool-executor.service.ts  # Registry și execuție tools
├── http-tools/                    # Tools HTTP
│   ├── app-server.tool.ts        # Queries către app server
│   ├── elixir-notification.tool.ts # Notificări Elixir
│   ├── external-api.tool.ts      # Meta, Twilio, Gmail
│   └── management-server.tool.ts # Management server queries
├── websocket-tools/               # Tools WebSocket
│   ├── broadcast.tool.ts         # Broadcast mesaje
│   ├── draft-management.tool.ts  # Creare/editare drafts
│   └── frontend-interaction.tool.ts # Interacțiune frontend
├── tools.service.ts               # Service principal
├── tools.module.ts                # Module NestJS
└── README.md                      # Documentație detaliată
```

### Tools Implementate

#### HTTP Tools
1. **query_app_server** - Queries pentru resources, bookings, patients
2. **send_elixir_notification** - Notificări către frontend prin Elixir
3. **send_external_message** - Mesaje prin Meta/Twilio/Gmail
4. **query_management_server** - Configurări business

#### WebSocket Tools
1. **broadcast_websocket_message** - Broadcast către clienți
2. **manage_draft** - Gestionare drafts (create/update/delete)
3. **interact_with_frontend** - Request/provide resurse frontend

## Modificări în Fișiere Existente

### `agent.service.ts`
- ❌ Removed: `SimplifiedRagService`, `ResourceRagService`
- ✅ Added: `ToolsService` integration
- ✅ Updated: `processMessage()` folosește Bedrock
- ✅ Updated: `processWebhookMessage()` folosește Bedrock

**Înainte:**
```typescript
const ragResult = await this.simplifiedRagService.getRagForRoleAndBusiness(...);
```

**Acum:**
```typescript
const bedrockResult = await this.toolsService.processMessage(
  data.message,
  toolContext,
  toolContext.sessionId,
);
```

### `agent.module.ts`
- ✅ Added: `ToolsModule` import
- ❌ Removed: RAG services din providers

### `websocket.gateway.ts`
- ✅ Added: `OnGatewayInit` interface
- ✅ Added: `ToolsService` injection
- ✅ Added: `afterInit()` - set WebSocket Gateway în tools

### `message.interface.ts`
- ✅ Added: `metadata` field în `AgentResponse`
```typescript
metadata?: {
  toolsUsed?: string[];
  executionTime?: number;
  [key: string]: any;
};
```

## Noi Fișiere de Configurare

### `config/bedrock.config.ts`
Configurare pentru AWS Bedrock:
- Agent ID și Alias
- Knowledge Base ID
- Model ID (Claude 3.5 Sonnet)
- Performance settings

### Scripts

#### `scripts/migrate-rag-to-s3.js`
Script pentru migrarea datelor RAG din DynamoDB în S3:
- Extrage RAG data din DynamoDB
- Transformă în format Knowledge Base
- Upload în S3
- Generează instrucțiuni de setup

**Utilizare:**
```bash
npm run migrate-rag-to-s3
```

## Documentație

### 1. `BEDROCK_SETUP.md`
Ghid complet de setup pentru AWS Bedrock:
- Variabile de mediu
- Crearea Bedrock Agent
- Configurarea Knowledge Bases
- IAM permissions
- Testing și troubleshooting

### 2. `src/modules/tools/README.md`
Documentație detaliată pentru modulul tools:
- Arhitectură
- Cum funcționează fiecare tool
- Cum să adaugi un tool nou
- Testing și debugging
- Performance și securitate

### 3. `BEDROCK_MIGRATION_SUMMARY.md` (acest document)
Sumar al modificărilor efectuate.

## Dependențe Noi

Adăugate în `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-agent-runtime": "^3.700.0",
    "@aws-sdk/client-s3": "^3.700.0"
  },
  "scripts": {
    "migrate-rag-to-s3": "node scripts/migrate-rag-to-s3.js"
  }
}
```

## Variabile de Mediu Necesare

Adaugă în `.env`:

```bash
# AWS Bedrock
BEDROCK_AGENT_ID=your_bedrock_agent_id
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
BEDROCK_KNOWLEDGE_BASE_ID=your_knowledge_base_id
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_ENABLE_TRACE=true
BEDROCK_TIMEOUT=60000

# S3 RAG
RAG_S3_BUCKET=simplu-ai-rag-embeddings
```

## Flux de Date (Înainte vs Acum)

### Înainte (RAG Local)
```
User Message → Agent Service → RAG Service → DynamoDB → Response
```

### Acum (Bedrock Agent)
```
User Message 
  → Agent Service 
  → Tools Service 
  → Bedrock Agent 
  → Knowledge Base (S3)
  → Tool Executor 
  → HTTP/WebSocket Tools
  → Response
```

## Avantaje ale Noii Arhitecturi

### 1. **Scalabilitate**
- Tools-urile pot fi adăugate fără a modifica logic-ul principal
- Bedrock se ocupă de orchestrare și decision making
- Knowledge Base scalează automat

### 2. **Modularitate**
- Fiecare tool este independent
- Ușor de testat individual
- Separare clară între concerns

### 3. **Performanță**
- Bedrock optimizează apelurile de tools
- Knowledge Base cu vectori pentru RAG rapid
- Caching la nivel de Bedrock

### 4. **Mentenabilitate**
- Cod mai simplu și mai curat
- Documentație centralizată
- Tools registry pentru tracking

### 5. **Cost Optimization**
- Plătești doar pentru ce folosești în Bedrock
- Nu mai e nevoie de infrastructure pentru RAG local
- Optimizări automate de la AWS

## Pași Următori

### 1. Setup AWS Bedrock

```bash
# 1. Creează Bedrock Agent în AWS Console
# 2. Configurează Action Groups cu tool definitions
# 3. Creează Knowledge Base cu S3 data source
```

### 2. Migrare RAG

```bash
cd ai-agent-server
npm run migrate-rag-to-s3
```

### 3. Instalare Dependențe

```bash
npm install
```

### 4. Configurare Environment

Adaugă variabilele necesare în `.env` (vezi secțiunea Variabile de Mediu).

### 5. Testing

```bash
# Test local
npm run start:dev

# Test Bedrock integration
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test_business",
    "user_id": "test_user",
    "message_id": "msg_1",
    "payload": {
      "content": "Vreau să văd lista de pacienți"
    }
  }'
```

### 6. Deploy

```bash
# Build
npm run build

# Deploy în AWS (Lambda, ECS, etc.)
```

## Backward Compatibility

### ⚠️ Breaking Changes

1. **RAG Services removed**
   - `SimplifiedRagService` nu mai există
   - `ResourceRagService` nu mai există
   - DynamoDB RAG table nu mai e folosit direct

2. **Agent Service API unchanged**
   - `processMessage()` acceptă aceiași parametri
   - `processWebhookMessage()` acceptă aceiași parametri
   - Response format rămâne același (cu adăugarea `metadata`)

### ✅ Non-Breaking Changes

- WebSocket API rămâne neschimbat
- HTTP endpoints rămân neschimbate
- External APIs integration rămâne la fel

## Troubleshooting

### Probleme Comune

#### 1. Bedrock Agent ID not found
```bash
Error: BEDROCK_AGENT_ID is required
```
**Soluție:** Adaugă `BEDROCK_AGENT_ID` în `.env`

#### 2. Tools not registered
```bash
Error: Tool query_app_server not found in registry
```
**Soluție:** Verifică că tool-ul este adăugat în `tools.service.ts` -> `onModuleInit()`

#### 3. Knowledge Base no results
```bash
Warning: No results from Knowledge Base
```
**Soluție:** 
- Verifică că Knowledge Base este synced
- Rulează `npm run migrate-rag-to-s3`
- Scade `BEDROCK_KB_MIN_SCORE`

## Costuri Estimate

### AWS Bedrock
- **Agent invocations**: ~$0.002 per 1K input tokens
- **Knowledge Base queries**: ~$0.10 per query
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens

### Exemplu Monthly (10K mesaje)
- 10,000 invocations × 500 tokens/invocation = 5M tokens
- Input: 5M × $3/1M = $15
- Output: 2M × $15/1M = $30
- Knowledge Base: 5,000 queries × $0.10 = $500
- **Total: ~$545/month**

### Optimizări
1. Cache queries frecvente
2. Limitează Knowledge Base results
3. Folosește session state pentru context
4. Optimizează prompt-urile

## Support

Pentru ajutor sau întrebări:
- **Documentație**: `/ai-agent-server/BEDROCK_SETUP.md`
- **Tools README**: `/ai-agent-server/src/modules/tools/README.md`
- **AWS Bedrock Docs**: https://docs.aws.amazon.com/bedrock/

## Contribuții Viitoare

### Tools de Adăugat
- [ ] Database query tool (direct SQL queries)
- [ ] Analytics tool (generate reports)
- [ ] Booking automation tool
- [ ] Email template tool
- [ ] Voice call tool (ElevenLabs integration)

### Îmbunătățiri
- [ ] Caching layer pentru Knowledge Base
- [ ] Rate limiting per tenant
- [ ] Advanced error recovery
- [ ] Multi-language support
- [ ] Custom embeddings pentru Knowledge Base

---

**Data Migrării:** {{ data_curenta }}
**Versiune:** 1.0.0
**Status:** ✅ Ready for Testing

