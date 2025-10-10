# Setup Checklist - AWS Bedrock Integration

## ✅ Checklist Complet

### Pas 1: Environment Variables ✓

Editează `ai-agent-server/.env`:

```bash
# AWS Bedrock
BEDROCK_AGENT_ID=                    # ← COMPLETEAZĂ din AWS Console
BEDROCK_AGENT_ALIAS_ID=TSTALIASID   # ✓ OK pentru testing
AWS_BEDROCK_REGION=us-east-1         # ✓ OK
AWS_ACCESS_KEY_ID=                   # ← COMPLETEAZĂ
AWS_SECRET_ACCESS_KEY=               # ← COMPLETEAZĂ

# Internal Auth (ACELAȘI în ai-agent-server și app!)
AI_SERVER_KEY=                       # ← GENEREAZĂ și COMPLETEAZĂ

# Servers
API_SERVER_URL=http://localhost:3000  # ✓ OK
ELIXIR_HTTP_URL=http://localhost:4000 # ✓ OK

# DynamoDB
DYNAMODB_MESSAGES_TABLE=ai-agent-messages
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
AWS_REGION=eu-central-1

# Optional - Knowledge Base
BEDROCK_KNOWLEDGE_BASE_ID=           # ← COMPLETEAZĂ după creare KB
BEDROCK_ENABLE_TRACE=true
```

**Generează AI_SERVER_KEY:**
```bash
openssl rand -base64 32
# Copiază output-ul și pune-l în AI_SERVER_KEY în AMBELE servere
```

### Pas 2: Creează Bedrock Agent în AWS ✓

**Opțiune A: AWS Console** (recomandat)

1. AWS Console → **Bedrock** → **Agents** → **Create Agent**

2. **Agent details:**
   - Name: `simplu-ai-dental-agent`
   - Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
   - Instructions:
   ```
   Ești un asistent AI inteligent pentru o clinică dentară.
   
   Ai acces la multiple tools pentru a interacționa cu sistemul:
   - query_app_server: pentru a citi date (programări, pacienți, medici, tratamente)
   - call_frontend_function: pentru a executa acțiuni în UI (create, update, delete)
   - send_elixir_notification: pentru notificări către utilizatori
   - broadcast_websocket_message: pentru mesaje real-time către operatori
   
   IMPORTANT:
   - Pentru OPERATORI: răspunsuri concise (max 50 cuvinte), profesionale
   - Pentru PACIENȚI: răspunsuri prietenoase (max 150 cuvinte), empatic
   - Folosește query_app_server DOAR pentru citire
   - Folosește call_frontend_function pentru modificări
   - Respectă privacy-ul pacienților
   - userId din context poate fi resourceId al medicului
   ```

3. **Copy Agent ID** → pune în `.env` la `BEDROCK_AGENT_ID`

4. **Alias:**
   - Folosește `TSTALIASID` pentru testing
   - Sau creează alias production și copy Alias ID

**Opțiune B: AWS CLI**

```bash
aws bedrock-agent create-agent \
  --agent-name "simplu-ai-dental-agent" \
  --foundation-model "anthropic.claude-3-5-sonnet-20240620-v1:0" \
  --instruction "Ești un asistent AI pentru o clinică dentară..." \
  --region us-east-1
```

### Pas 3: (Optional) Creează Knowledge Base

#### 3a. Pregătește datele

```bash
cd ai-agent-server

# Generează documente pentru KB
npm run prepare-kb
```

Rezultat: `data/kb-documents/` cu documente JSON

#### 3b. Upload în S3

```bash
# Creează bucket
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# Upload documente
aws s3 sync data/kb-documents/ s3://simplu-ai-rag-embeddings/dental/ \
  --region us-east-1
```

#### 3c. Creează Knowledge Base

1. AWS Console → **Bedrock** → **Knowledge bases** → **Create**
2. Name: `simplu-dental-kb`
3. Data source: `s3://simplu-ai-rag-embeddings/dental/`
4. Embeddings model: `amazon.titan-embed-text-v2:0`
5. Vector store: Amazon OpenSearch Serverless (quick create)
6. **Sync** data source
7. **Copy Knowledge Base ID** → `.env` la `BEDROCK_KNOWLEDGE_BASE_ID`

### Pas 4: Configurează Action Groups în Bedrock Agent

Deschide Agent-ul creat → **Action Groups** → **Add**

**Action Group 1: Query Tools**
- Name: `query_tools`
- Description: "Read-only queries pentru date"
- Action: Manual schema
- Schema: Copy din `src/modules/tools/http-tools/app-server.tool.ts` → `getDefinition()`

**Action Group 2: Frontend Tools**
- Name: `frontend_tools`
- Description: "Apeluri funcții frontend pentru modificări"
- Schema: Copy din `src/modules/tools/websocket-tools/frontend-interaction.tool.ts` → `getDefinition()`

**Action Group 3: Notification Tools**
- Name: `notification_tools`  
- Description: "Notificări și broadcast"
- Schema: Copy din tools pentru `send_elixir_notification` și `broadcast_websocket_message`

### Pas 5: Test Setup

```bash
# Start server
cd ai-agent-server
npm run start:dev
```

**Logs expected:**
```
✅ Registered 6 tools: query_app_server, call_frontend_function, ...
✅ WebSocket Gateway set for WebSocket tools
🤖 Bedrock Agent Service initialized with agent: XXXXXXXXXX
```

**Test query:**
```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test_session",
    "message_id": "msg_1",
    "payload": {
      "content": "Câte programări am astăzi?"
    }
  }'
```

**Expected response:**
```json
{
  "responseId": "resp_...",
  "message": "Astăzi ai 8 programări: 5 consultații, 2 tratamente, 1 implant.",
  "actions": [],
  "sessionId": "test_session",
  "metadata": {
    "toolsUsed": ["query_app_server"],
    "executionTime": 1234
  }
}
```

## 🔍 Troubleshooting

### ❌ Error: "Invalid AI-SERVER-KEY"

**Cauză:** AI_SERVER_KEY diferit între servere sau lipsă

**Fix:**
```bash
# Generează key
openssl rand -base64 32

# Adaugă în ai-agent-server/.env
echo "AI_SERVER_KEY=generated_key_here" >> .env

# Adaugă în app/.env  
cd ../app
echo "AI_SERVER_KEY=generated_key_here" >> .env
```

### ❌ Error: "BEDROCK_AGENT_ID is required"

**Cauză:** Nu ai creat agent în AWS sau nu ai setat ID-ul

**Fix:**
1. Creează agent în AWS Console (vezi Pas 2)
2. Copy Agent ID
3. Adaugă în `.env`: `BEDROCK_AGENT_ID=XXXXXXXXXX`

### ❌ Error: "ValidationException: agentAliasId failed to satisfy constraint"

**Cauză:** Alias greșit (prea lung sau caractere invalide)

**Fix:**
```bash
# În .env, folosește:
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

### ❌ Error: "No tool found: manage_draft"

**Cauză:** Bedrock încearcă să apeleze tool-ul vechi (draft)

**Fix:**
1. Actualizează Knowledge Base cu datele noi (fără drafts)
2. Re-sync data source în AWS Console
3. Sau actualizează instrucțiunile agent-ului în AWS

## 📊 Status Final

- [x] Tools refactorizate (6 tools active)
- [x] Draft system eliminat
- [x] app-server.tool.ts corectat (READ-ONLY)
- [x] call_frontend_function implementat
- [x] AI_SERVER_KEY authentication configurată
- [x] dental-knowledge-base.json creat cu structuri reale
- [x] Documentație completă (ENV_SETUP.md, REFACTORING_SUMMARY.md)
- [ ] **TODO: Creează Bedrock Agent în AWS**
- [ ] **TODO: (Optional) Creează Knowledge Base**
- [ ] **TODO: Test end-to-end**

## 📚 Documentație

| Document | Conținut |
|----------|----------|
| `ENV_SETUP.md` | Toate env vars necesare |
| `REFACTORING_SUMMARY.md` | Ce am modificat și de ce |
| `data/dental-knowledge-base.json` | Schema resurse și instrucțiuni |
| `data/KNOWLEDGE_BASE_SETUP.md` | Setup AWS Knowledge Base |
| `QUICKSTART.md` | Quick start guide |
| `BEDROCK_SETUP.md` | Setup complet Bedrock |

---

**Ready to deploy! 🚀**

Următorul pas: Creează Bedrock Agent în AWS și testează!

