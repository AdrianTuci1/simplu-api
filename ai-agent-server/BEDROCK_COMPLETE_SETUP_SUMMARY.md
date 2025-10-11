# 🚀 Bedrock Agent - Ghid Complet de Configurare

## 📖 Prezentare Generală

Acest document este punctul de start pentru configurarea completă a AWS Bedrock Agent cu Action Groups și Knowledge Base.

## 🎯 Ce vei configura?

1. **AWS Bedrock Agent** - Agentul AI care orchestrează conversațiile
2. **3 Action Groups** - Tools pentru query, modificări frontend, și notificări
3. **Knowledge Base** - Documentație și context RAG pentru răspunsuri precise
4. **Logging detaliat** - Pentru debugging și monitoring tool calls

## 📚 Documentație Disponibilă

### Ghiduri Principale

1. **[BEDROCK_ACTION_GROUPS_SETUP.md](./BEDROCK_ACTION_GROUPS_SETUP.md)** ⭐
   - Ghid pas cu pas pentru configurarea Action Groups
   - Schema-uri OpenAPI complete pentru toate tools-urile
   - Instrucțiuni pentru asocierea Knowledge Base
   - Prepare & Deploy
   - Testing și troubleshooting

2. **[KNOWLEDGE_BASE_QUICK_REFERENCE.md](./KNOWLEDGE_BASE_QUICK_REFERENCE.md)**
   - Quick reference pentru Knowledge Base
   - Setup rapid vs manual
   - Update documente
   - Monitoring și troubleshooting
   - Best practices

3. **[BEDROCK_SETUP.md](./BEDROCK_SETUP.md)**
   - Overview general al arhitecturii
   - Variabile de mediu necesare
   - IAM permissions
   - Cost optimization

### Alte Resurse

- **[QUICK_START.md](./QUICK_START.md)** - Start rapid în 5 pași
- **[DENTAL_KB_SETUP.md](./DENTAL_KB_SETUP.md)** - Setup specific pentru dental
- **[S3_VECTORS_SETUP.md](./S3_VECTORS_SETUP.md)** - Detalii despre S3 și vectori

## 🔧 Schema-uri Generate Automat

Am generat schema-urile OpenAPI pentru Action Groups în directorul `bedrock-schemas/`:

```bash
cd ai-agent-server
node scripts/generate-action-group-schemas.js
```

**Output**:
```
bedrock-schemas/
├── query-tools-schema.json          # Pentru query_tools Action Group
├── frontend-tools-schema.json       # Pentru frontend_tools Action Group
├── notification-tools-schema.json   # Pentru notification_tools Action Group
└── all-action-groups.json          # Reference combinată
```

Poți copia direct aceste schema-uri în AWS Console când creezi Action Groups.

## 🎬 Flow Complet de Setup

### Pasul 1: Pregătește Mediul

```bash
cd ai-agent-server

# Instalează dependențele
npm install

# Verifică că ai AWS CLI configurat
aws sts get-caller-identity

# Verifică documentele Knowledge Base
ls -la data/kb-documents/dental/
```

### Pasul 2: Generează Schema-uri

```bash
# Generează schema-uri OpenAPI pentru Action Groups
node scripts/generate-action-group-schemas.js

# Rezultat: bedrock-schemas/*.json
```

### Pasul 3: Creează Agent în AWS

1. **AWS Console** → **Bedrock** → **Agents** → **Create Agent**
2. Configurează:
   - Name: `simplu-ai-agent`
   - Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
   - Instructions: Vezi [BEDROCK_ACTION_GROUPS_SETUP.md](./BEDROCK_ACTION_GROUPS_SETUP.md)

3. **Copiază Agent ID** → `.env`:
   ```bash
   BEDROCK_AGENT_ID=your_agent_id_here
   ```

### Pasul 4: Adaugă Action Groups

Urmărește instrucțiunile din **[BEDROCK_ACTION_GROUPS_SETUP.md](./BEDROCK_ACTION_GROUPS_SETUP.md)**:

1. **Action Group 1**: Query Tools (read-only)
2. **Action Group 2**: Frontend Tools (create/update/delete)
3. **Action Group 3**: Notification Tools (messages & broadcasts)

**Tip**: Copiază schema-urile din `bedrock-schemas/*.json`

### Pasul 5: Setup Knowledge Base

#### Opțiunea A: Automat (Recomandat)

```bash
cd ai-agent-server
./scripts/setup-s3-vectors-kb.sh

# Urmărește instrucțiunile interactive
```

#### Opțiunea B: Manual

Vezi **[KNOWLEDGE_BASE_QUICK_REFERENCE.md](./KNOWLEDGE_BASE_QUICK_REFERENCE.md)** pentru pași detaliali.

### Pasul 6: Asociază Knowledge Base la Agent

1. În pagina Agent-ului → Tab **Knowledge bases**
2. **Add** → Selectează KB creat
3. Adaugă instructions pentru când să folosească KB
4. **Save**

### Pasul 7: Prepare Agent

1. În AWS Console, click **Prepare** (buton sus)
2. Așteaptă ~1-2 minute
3. Verifică:
   - ✅ Status: **Prepared**
   - ✅ Action Groups: 3 active
   - ✅ Knowledge Base: Associated

### Pasul 8: Configurează .env

```bash
# Copiază .env.example
cp .env.example .env

# Editează .env cu ID-urile tale
nano .env
```

**Variabile necesare**:
```bash
# AWS Bedrock
BEDROCK_AGENT_ID=your_agent_id
BEDROCK_AGENT_ALIAS_ID=TSTALIASID  # sau production alias
BEDROCK_KNOWLEDGE_BASE_ID=your_kb_id
AWS_BEDROCK_REGION=us-east-1

# AWS Credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# App Server (pentru tools)
API_SERVER_URL=http://localhost:3000
AI_SERVER_KEY=your_shared_secret

# Pentru debugging
BEDROCK_ENABLE_TRACE=true
```

### Pasul 9: Test Setup

#### Test în AWS Console

1. Bedrock → Agents → Selectează agent → Tab **Test**
2. Mesaj: "Vreau să văd lista de pacienți"
3. Verifică în **Trace**:
   - Tool calls (query_app_server)
   - Knowledge Base retrievals
   - Răspunsul final

#### Test în Aplicație

```bash
# Start server
cd ai-agent-server
npm run start:dev

# Trimite test message
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user",
    "session_id": "test-session",
    "message_id": "msg_1",
    "payload": {
      "content": "Câte programări am astăzi?"
    }
  }'
```

**Log-uri așteptate** (cu logging-ul nou adăugat):

```
📤 Invoking Bedrock Agent for session: test-session
📡 Bedrock response received, processing stream...
🔄 Starting to process event stream...
📦 Event received: ["trace"]
📊 Trace event received: { "orchestrationTrace": { ... }}
🔧 Tool called: query_tools -> query_app_server
📝 Tool parameters: { "module": "resources", ... }
✅ Tool output: {"success": true, "data": [...]}
📚 Knowledge Base retrieved 2 references
✨ Stream processing complete. Tools used: 1, Actions: 0
🔧 Tools used in this invocation: ["query_tools:query_app_server"]
✅ Bedrock Agent invoked successfully in 2345ms
```

## 📊 Verificare Completă

### Checklist Final

- [ ] **Agent Setup**
  - [ ] Agent creat în AWS Bedrock
  - [ ] Agent instructions configurate
  - [ ] `BEDROCK_AGENT_ID` în `.env`

- [ ] **Action Groups**
  - [ ] Query Tools (query_app_server, query_management_server)
  - [ ] Frontend Tools (call_frontend_function)
  - [ ] Notification Tools (send_external_message, send_elixir_notification, broadcast)
  - [ ] Schema-uri OpenAPI configurate corect

- [ ] **Knowledge Base**
  - [ ] S3 bucket creat
  - [ ] Documente sincronizate în S3
  - [ ] Knowledge Base creat în AWS
  - [ ] KB asociat la Agent
  - [ ] Initial sync completat
  - [ ] Test KB în AWS Console reușit
  - [ ] `BEDROCK_KNOWLEDGE_BASE_ID` în `.env`

- [ ] **Prepare & Deploy**
  - [ ] Agent **Prepared** cu succes
  - [ ] Alias creat (opțional, pentru production)
  - [ ] `BEDROCK_AGENT_ALIAS_ID` în `.env`

- [ ] **Testing**
  - [ ] Test în AWS Console - vezi tool calls în trace
  - [ ] Test în aplicație - vezi log-uri detaliate
  - [ ] KB retrieval funcționează
  - [ ] Tools execution funcționează

## 🔍 Debugging

### Nu vezi log-uri de tool calling?

**Cauze posibile**:
1. **Action Groups nu sunt configurate** în AWS
2. **Agent nu e prepared** după adăugarea Action Groups
3. **Agent nu decide să folosească tools** (răspunde direct sau din KB)

**Soluție**:
- Verifică în AWS Console că ai 3 Action Groups
- Click **Prepare** din nou
- Testează în AWS Console tab-ul **Test** să vezi trace-urile

### Knowledge Base nu returnează rezultate?

**Cauze**:
1. Documentele nu sunt sincronizate
2. Data source nu e sync-uit după upload
3. Query prea vag

**Soluție**:
```bash
# Verifică documente în S3
aws s3 ls s3://your-bucket/dental/ --recursive

# Re-sync KB data source în AWS Console
# AWS Console → Bedrock → Knowledge bases → Data sources → Sync

# Sau folosind scriptul
./scripts/sync-kb-documents.sh YOUR_KB_ID YOUR_DS_ID
```

### Tool execution failed?

**Verifică**:
- API Server e pornit și accesibil
- `AI_SERVER_KEY` e corect configurat
- Permissions IAM pentru Agent role

## 💡 Tips & Best Practices

### 1. Development vs Production

**Development**:
```bash
BEDROCK_AGENT_ALIAS_ID=TSTALIASID  # Draft alias
BEDROCK_ENABLE_TRACE=true           # Enable detailed logging
```

**Production**:
```bash
BEDROCK_AGENT_ALIAS_ID=production   # Stable alias
BEDROCK_ENABLE_TRACE=false          # Reduce logging overhead
```

### 2. Update Workflow

Când modifici tools sau documente:

```bash
# 1. Update code/documente
nano src/modules/tools/...

# 2. Sync documente KB (dacă ai schimbat)
./scripts/sync-kb-documents.sh KB_ID DS_ID

# 3. Re-generate schema-uri (dacă ai schimbat tools)
node scripts/generate-action-group-schemas.js

# 4. Update schema-uri în AWS Console

# 5. Prepare agent din nou
# AWS Console → Click Prepare

# 6. Test
npm run start:dev
```

### 3. Monitoring în Production

```bash
# Verifică log-urile pentru tool usage
grep "Tool called:" logs/app.log

# Verifică KB retrieval
grep "Knowledge Base retrieved" logs/app.log

# Verifică execution time
grep "invoked successfully" logs/app.log
```

## 📞 Suport

### Documentație AWS
- [Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Action Groups](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action.html)

### Project Documentation
- Toate ghidurile în `ai-agent-server/*.md`
- Scripturile în `ai-agent-server/scripts/`
- Code în `ai-agent-server/src/modules/`

### Issues
- Creează issue în repository cu:
  - Log-urile complete
  - Configurația (fără secrets!)
  - Pașii de reproducere

## 🎉 Succes!

Dacă toate checkmark-urile sunt bifate, ești gata să folosești Bedrock Agent cu tools și Knowledge Base!

**Next steps**:
1. Optimizează Agent instructions pentru use case-ul tău
2. Adaugă mai multe documente în Knowledge Base
3. Extinde tools-urile cu funcționalități noi
4. Monitor performance și costuri

**Happy coding! 🚀**

