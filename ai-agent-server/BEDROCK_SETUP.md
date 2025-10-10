# AWS Bedrock Setup Guide

## Overview

Acest proiect folosește AWS Bedrock pentru procesarea mesajelor AI prin:
- **Bedrock Agent** - orchestrează conversațiile și apelează tools
- **Knowledge Bases** - RAG integrat cu vectori în S3
- **Tools Architecture** - ai-agent-server devine un orchestrator de tools

## Variabile de Mediu Necesare

Adaugă următoarele variabile în `.env`:

```bash
# AWS Bedrock Configuration
BEDROCK_AGENT_ID=your_bedrock_agent_id              # ID-ul Bedrock Agent
BEDROCK_AGENT_ALIAS_ID=TSTALIASID                   # Alias-ul agent-ului (TSTALIASID pentru testing)
BEDROCK_KNOWLEDGE_BASE_ID=your_knowledge_base_id    # ID-ul Knowledge Base pentru RAG
AWS_BEDROCK_REGION=us-east-1                        # Region AWS pentru Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0  # Model Foundation (Claude Sonnet)

# Optional: Performance Settings
BEDROCK_ENABLE_TRACE=true                           # Enable tracing pentru debugging
BEDROCK_TIMEOUT=60000                               # Timeout în milliseconds
BEDROCK_KB_RESULTS=5                                # Număr de rezultate din Knowledge Base
BEDROCK_KB_MIN_SCORE=0.7                            # Scor minim pentru relevanță
```

## Pași de Setup

### 1. Creează Bedrock Agent

```bash
# Folosește AWS Console sau AWS CLI
aws bedrock-agent create-agent \
  --agent-name "simplu-ai-agent" \
  --foundation-model "anthropic.claude-3-5-sonnet-20240620-v1:0" \
  --instruction "Ești un asistent AI pentru un sistem de management business..." \
  --region us-east-1
```

### 2. Configurează Action Groups (Tools)

Agent-ul trebuie să aibă acces la următoarele action groups:

#### HTTP Tools Action Group
- `query_app_server` - Queries pentru resources, bookings, patients
- `query_management_server` - Queries pentru business config
- `send_external_message` - Trimitere mesaje prin Meta/Twilio/Gmail
- `send_elixir_notification` - Notificări către frontend

#### WebSocket Tools Action Group  
- `broadcast_websocket_message` - Broadcast către clienți
- `manage_draft` - Creare/editare drafts
- `interact_with_frontend` - Solicitare resurse de la frontend

### 3. Creează Knowledge Base

```bash
# 1. Creează S3 bucket pentru embeddings
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# 2. Rulează scriptul de migrare RAG
cd scripts
node migrate-rag-to-s3.js

# 3. Creează Knowledge Base în AWS Console
# - Data source: S3 bucket creat mai sus
# - Embedding model: amazon.titan-embed-text-v2:0
# - Vector database: Amazon OpenSearch Serverless (sau Pinecone)
```

### 4. Configurează IAM Permissions

Bedrock Agent are nevoie de permisiuni pentru:
- Bedrock Runtime (InvokeAgent)
- Knowledge Base (Retrieve)
- S3 (pentru Knowledge Base)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent",
        "bedrock:Retrieve",
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::simplu-ai-rag-embeddings",
        "arn:aws:s3:::simplu-ai-rag-embeddings/*"
      ]
    }
  ]
}
```

## Tools Architecture

### Structura Modulului Tools

```
src/modules/tools/
├── interfaces/           # Interfețe pentru tools
│   ├── tool.interface.ts
│   └── tool-result.interface.ts
├── bedrock/             # Integrare Bedrock
│   ├── bedrock-agent.service.ts
│   └── tool-executor.service.ts
├── http-tools/          # Tools pentru HTTP requests
│   ├── app-server.tool.ts
│   ├── elixir-notification.tool.ts
│   ├── external-api.tool.ts
│   └── management-server.tool.ts
├── websocket-tools/     # Tools pentru WebSocket
│   ├── broadcast.tool.ts
│   ├── draft-management.tool.ts
│   └── frontend-interaction.tool.ts
├── tools.service.ts     # Service principal
└── tools.module.ts      # Module configuration
```

### Cum Funcționează

1. **Mesaj primit** → Agent Service
2. **Agent Service** → Tools Service → Bedrock Agent
3. **Bedrock Agent** → Decide ce tools să apeleze
4. **Tool Executor** → Execută tools-ul (HTTP request, WebSocket broadcast, etc.)
5. **Rezultat** → înapoi la Bedrock Agent
6. **Răspuns final** → către utilizator

## Migrarea RAG din DynamoDB în S3

Rulează scriptul de migrare:

```bash
cd scripts
node migrate-rag-to-s3.js
```

Acest script:
1. Citește datele RAG din DynamoDB (tabelul `rag-instructions`)
2. Convertește datele în format text pentru embeddings
3. Upload în S3 bucket configurat
4. Creează metadate pentru Knowledge Base

## Testing

### Test Bedrock Integration

```bash
# Test direct prin API
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test_business",
    "user_id": "test_user",
    "session_id": "test_session",
    "message_id": "msg_1",
    "payload": {
      "content": "Vreau să văd lista de pacienți"
    }
  }'
```

### Test Tools

```typescript
// În agent.service.spec.ts
it('should invoke Bedrock and execute tools', async () => {
  const result = await agentService.processMessage({
    businessId: 'test',
    userId: 'user1',
    message: 'Lista de pacienți',
    sessionId: 'session1',
  });
  
  expect(result.success).toBe(true);
  expect(result.metadata.toolsUsed).toContain('query_app_server');
});
```

## Monitoring și Debugging

### Enable Tracing

```bash
BEDROCK_ENABLE_TRACE=true
```

Trace-urile vor include:
- Model invocations
- Tool calls
- Knowledge Base retrievals
- Execution times

### Logs

```bash
# Verifică logs pentru Bedrock invocations
grep "Bedrock Agent" logs/app.log

# Verifică tool executions
grep "Tool" logs/app.log
```

## Cost Optimization

- **Bedrock Agent**: ~$0.002 per 1K input tokens
- **Knowledge Base**: ~$0.10 per query
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens

**Recomandări**:
1. Folosește cache pentru queries frecvente
2. Optimizează prompt-urile pentru răspunsuri scurte
3. Limitează numărul de rezultate din Knowledge Base
4. Folosește session state pentru context persistence

## Troubleshooting

### Agent ID not found
```
Error: BEDROCK_AGENT_ID is required
```
Verifică că ai setat `BEDROCK_AGENT_ID` în `.env`

### Knowledge Base not returning results
- Verifică că embeddings-urile sunt în S3
- Verifică scorul minim (`BEDROCK_KB_MIN_SCORE`)
- Testează direct prin AWS Console

### Tools not executing
- Verifică că Action Groups sunt configurate în Bedrock Agent
- Verifică logs pentru tool registration
- Testează tools individual prin `ToolsService`

## Migration Guide

### De la RAG DynamoDB la Bedrock Knowledge Base

1. **Backup datele existente**
```bash
node scripts/backup-dynamodb-rag.js
```

2. **Migrează în S3**
```bash
node scripts/migrate-rag-to-s3.js
```

3. **Validează migrarea**
```bash
node scripts/validate-knowledge-base.js
```

4. **Switch la Bedrock**
- Actualizează `agent.module.ts` să folosească `ToolsModule`
- Restart server
- Monitor logs pentru erori

## Support

Pentru ajutor:
- AWS Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
- Internal Documentation: `/ai-agent-server/src/modules/tools/`
- Issues: Creează un issue în repository

