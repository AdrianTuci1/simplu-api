# Quick Start - AWS Bedrock Integration

## 🚀 Start Rapid în 5 Pași

### 1️⃣ Instalează Dependențele

```bash
cd ai-agent-server
npm install
```

Pachetele noi instalate:
- `@aws-sdk/client-bedrock-agent-runtime` - pentru Bedrock Agent
- `@aws-sdk/client-s3` - pentru Knowledge Base în S3

### 2️⃣ Configurează Variabilele de Mediu

Adaugă în `.env`:

```bash
# AWS Bedrock - OBLIGATORIU
BEDROCK_AGENT_ID=your_bedrock_agent_id
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
BEDROCK_KNOWLEDGE_BASE_ID=your_knowledge_base_id
AWS_BEDROCK_REGION=us-east-1

# AWS Credentials - OBLIGATORIU
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Optional - Performance
BEDROCK_ENABLE_TRACE=true
BEDROCK_TIMEOUT=60000
BEDROCK_KB_RESULTS=5

# App Server Authentication - OBLIGATORIU
AI_SERVER_KEY=your_shared_secret_key_here

# Existing variables rămân la fel
API_SERVER_URL=http://localhost:3000
ELIXIR_HTTP_URL=http://localhost:4000
# ... etc
```

### 3️⃣ Creează Bedrock Agent în AWS

#### Opțiune A: AWS Console

1. Mergi la **AWS Console** → **Bedrock** → **Agents**
2. Click **Create Agent**
3. Configurează:
   - **Name**: `simplu-ai-agent`
   - **Model**: `anthropic.claude-3-5-sonnet-20240620-v1:0`
   - **Instructions**: Copiază din `BEDROCK_SETUP.md`

4. Adaugă **Action Groups**:
   - HTTP Tools (app-server, elixir, external-apis, management)
   - WebSocket Tools (broadcast, drafts, frontend-interaction)

5. Copiază **Agent ID** și actualizează `.env`

#### Opțiune B: AWS CLI

```bash
# Creează agent
aws bedrock-agent create-agent \
  --agent-name "simplu-ai-agent" \
  --foundation-model "anthropic.claude-3-5-sonnet-20240620-v1:0" \
  --instruction "Ești un asistent AI inteligent pentru managementul unui business..." \
  --region us-east-1

# Salvează Agent ID din output
```

### 4️⃣ Migrează RAG din DynamoDB în S3

```bash
# Asigură-te că ai date RAG în DynamoDB
npm run populate-rag  # dacă nu ai

# Migrează în S3 pentru Knowledge Base
npm run migrate-rag-to-s3
```

Scriptul va:
- ✅ Extrage date din DynamoDB
- ✅ Converti în format Knowledge Base
- ✅ Upload în S3
- ✅ Genera instrucțiuni de setup

### 5️⃣ Configurează Knowledge Base

După migrarea RAG, urmează instrucțiunile din:
```
ai-agent-server/data/rag-export/SETUP_INSTRUCTIONS.md
```

Sau configurează manual în AWS Console:
1. **Bedrock** → **Knowledge Bases** → **Create**
2. **Data Source**: S3 (`simplu-ai-rag-embeddings`)
3. **Embedding Model**: `amazon.titan-embed-text-v2:0`
4. **Vector Store**: Amazon OpenSearch Serverless
5. **Sync** data source

## ✅ Verificare Setup

### Test 1: Verifică Tools Registry

```bash
npm run start:dev
```

Căută în logs:
```
🔧 Registering tools...
✅ Registered 7 tools: query_app_server, send_elixir_notification, ...
✅ WebSocket Gateway initialized and set in ToolsService
```

### Test 2: Test Bedrock Integration

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test_business",
    "user_id": "test_user",
    "session_id": "test_session",
    "message_id": "msg_123",
    "payload": {
      "content": "Bună ziua, cu ce te pot ajuta?"
    }
  }'
```

Expected output:
```json
{
  "responseId": "resp_...",
  "message": "Bună ziua! Cu ce vă pot ajuta astăzi?",
  "actions": [],
  "timestamp": "2024-...",
  "sessionId": "test_session",
  "metadata": {
    "toolsUsed": [],
    "executionTime": 1234
  }
}
```

### Test 3: Test Tool Execution

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "dental_clinic_1",
    "user_id": "operator_1",
    "session_id": "session_456",
    "message_id": "msg_456",
    "payload": {
      "content": "Vreau să văd lista de pacienți"
    }
  }'
```

Expected:
- Bedrock Agent detectează că trebuie să apeleze `query_app_server`
- Tool-ul execută request către app server
- Response conține lista de pacienți

## 📊 Monitoring

### Logs Important

```bash
# Watch logs
tail -f logs/app.log | grep -E "(Bedrock|Tool|Agent)"
```

Căută:
- `📤 Invoking Bedrock Agent`
- `⚙️ Executing tool: query_app_server`
- `✅ Bedrock Agent invoked successfully`

### CloudWatch

După deployment în AWS:
1. **CloudWatch** → **Log Groups**
2. Filtrează după: `Bedrock`, `Tool`, `Agent`
3. Verifică:
   - Invocation times
   - Tool usage patterns
   - Errors și warnings

## 🛠️ Troubleshooting Rapid

### Error: "BEDROCK_AGENT_ID is required"
```bash
# Verifică .env
echo $BEDROCK_AGENT_ID

# Adaugă în .env
echo "BEDROCK_AGENT_ID=your_agent_id" >> .env
```

### Error: "Tool not found in registry"
```bash
# Restart server
npm run start:dev

# Verifică că tool-ul este înregistrat
# Logs trebuie să arate: "✅ Registered 7 tools"
```

### Error: "Knowledge Base returns no results"
```bash
# Verifică că data e synced
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID

# Sau scade scorul minim
BEDROCK_KB_MIN_SCORE=0.5
```

### Error: "Timeout"
```bash
# Crește timeout
BEDROCK_TIMEOUT=120000  # 2 minutes
```

## 📚 Documentație Completă

Pentru detalii complete:

| Document | Conținut |
|----------|----------|
| `BEDROCK_SETUP.md` | Setup complet AWS Bedrock |
| `BEDROCK_MIGRATION_SUMMARY.md` | Rezumat modificări |
| `src/modules/tools/README.md` | Documentație tools |

## 🎯 Next Steps

După ce ai verificat că totul funcționează:

1. **Deploy în AWS**
   ```bash
   npm run build
   # Deploy via Lambda, ECS, sau EC2
   ```

2. **Configurează Monitoring**
   - CloudWatch Alarms
   - X-Ray tracing
   - Cost monitoring

3. **Optimizări**
   - Fine-tune Knowledge Base
   - Optimizează tool definitions
   - Adaugă caching

4. **Extinde Funcționalitatea**
   - Adaugă tools noi
   - Îmbunătățește prompts
   - Multi-language support

## 💡 Tips

### Best Practices

1. **Tool Definitions** - Fii foarte explicit în descriptions
2. **Error Handling** - Toate tools-urile returnează success/error
3. **Logging** - Enable BEDROCK_ENABLE_TRACE pentru debugging
4. **Testing** - Testează fiecare tool individual

### Performance

1. **Caching** - Cache responses frecvente
2. **Timeouts** - Ajustează per environment
3. **Batch Operations** - Combină tools când e posibil
4. **Knowledge Base** - Limitează numberOfResults

### Securitate

1. **API Keys** - Nu commit-a niciodată în git
2. **IAM Roles** - Folosește role-uri cu least privilege
3. **Rate Limiting** - Implementează per tenant
4. **Audit Logs** - Log toate apelurile de tools

## 🆘 Support

Dacă întâmpini probleme:

1. **Check Logs** - Logs detaliate pentru fiecare tool
2. **AWS Console** - Verifică Bedrock Agent în console
3. **Documentation** - `BEDROCK_SETUP.md` are troubleshooting
4. **Test Individual** - Testează fiecare tool separat

---

**Good luck! 🚀**

Pentru întrebări, consultă documentația detaliată sau verifică logs-urile.

