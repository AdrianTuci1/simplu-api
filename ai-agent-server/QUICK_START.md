# Quick Start - Setup Complet în 10 Minute

## 🎯 Obiectiv
Setup complet AWS Bedrock + Knowledge Base pentru clinică dentară.

---

## ⚡ Pas cu Pas (Copy-Paste Ready)

### 1. Fix Environment Variables (2 minute)

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server

# Editează .env
nano .env
```

**Schimbă/Adaugă:**
```bash
# Fix alias-ul
BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# Generează AI_SERVER_KEY (rulează în terminal):
openssl rand -base64 32
# Copy output-ul și pune-l aici:
AI_SERVER_KEY=paste_generated_key_here
```

**IMPORTANT:** Adaugă ACELAȘI `AI_SERVER_KEY` în `app/.env`!

```bash
# Editează app/.env
cd ../app
nano .env
# Adaugă:
AI_SERVER_KEY=same_key_as_above
```

---

### 2. Generează Knowledge Base Documents (1 minut)

```bash
cd ../ai-agent-server

# Generează documente
npm run prepare-dental-kb
```

**Output:**
```
🎉 SUCCESS! Created 12 documents for Dental KB
📦 Documents are ready in: data/kb-documents/dental
```

**Verifică:**
```bash
ls data/kb-documents/dental/
```

Ar trebui să vezi 12 fișiere JSON.

---

### 3. Upload în S3 (2 minute)

```bash
# Creează bucket (dacă nu există)
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# Upload documente
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/

# Verifică
aws s3 ls s3://simplu-ai-rag-embeddings/dental/ --recursive
```

Ar trebui să vezi 12 fișiere uploaded.

---

### 4. Creează Bedrock Agent (3 minute)

**În AWS Console:**

1. **Bedrock** → **Agents** → **Create Agent**

2. **Agent details:**
   - Name: `simplu-dental-agent`
   - Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
   - Instructions:
   ```
   Ești un asistent AI pentru o clinică dentară.
   
   Tools disponibile:
   - query_app_server: READ-ONLY queries pentru date
   - call_frontend_function: Execută acțiuni în UI
   - send_elixir_notification: Notificări
   
   IMPORTANT:
   - Operatori: răspunsuri concise (max 50 cuvinte)
   - Pacienți: răspunsuri prietenoase (max 150 cuvinte)
   - Verifică ÎNTOTDEAUNA working-hours înainte de programări
   - userId poate fi resourceId al medicului
   - NU crea drafts - acționează DIRECT
   ```

3. Click **Create**

4. **Copy Agent ID** → `.env`:
   ```bash
   BEDROCK_AGENT_ID=your_agent_id_here
   ```

---

### 5. Creează Knowledge Base (3 minute)

**În AWS Console:**

1. **Bedrock** → **Knowledge bases** → **Create**

2. **KB Details:**
   - Name: `simplu-dental-kb`
   - Description: `KB pentru clinică dentară`
   - IAM role: Create new

3. **Data Source:**
   - Name: `dental-documents-s3`
   - S3 URI: `s3://simplu-ai-rag-embeddings/dental/`
   - Chunking: Default (300 tokens, 20%)

4. **Embeddings:**
   - Model: `Titan Embeddings G1 - Text v2`

5. **Vector Store:**
   - Quick create new: `simplu-dental-vector-store`

6. **Create** → Așteaptă să devină **ACTIVE**

7. **Sync** data source → Așteaptă să termine

8. **Copy Knowledge Base ID** → `.env`:
   ```bash
   BEDROCK_KNOWLEDGE_BASE_ID=your_kb_id_here
   ```

---

### 6. Test (1 minut)

```bash
# Restart server
npm run start:dev
```

**Expected logs:**
```
✅ Registered 6 tools: query_app_server, call_frontend_function, ...
🤖 Bedrock Agent Service initialized with agent: XXXXXXXXXX
```

**Test:**
```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test",
    "message_id": "msg1",
    "payload": {"content": "La ce oră deschideți luni?"}
  }'
```

**Expected response:**
```json
{
  "message": "Luni deschidem de la 09:00 până la 17:00.",
  "sessionId": "test",
  ...
}
```

✅ **GATA!** Sistemul funcționează!

---

## 📋 Verificare Finală

- [ ] `BEDROCK_AGENT_ALIAS_ID=TSTALIASID` în .env ✓
- [ ] `AI_SERVER_KEY` setat și IDENTIC în ai-agent-server/.env și app/.env ✓
- [ ] Documente generate în `data/kb-documents/dental/` (12 files) ✓
- [ ] Uploaded în S3: `s3://simplu-ai-rag-embeddings/dental/` ✓
- [ ] Bedrock Agent creat, Agent ID în .env ✓
- [ ] Knowledge Base creat, KB ID în .env ✓
- [ ] Data source sync-uit (Status: Ready) ✓
- [ ] Server pornit fără erori ✓
- [ ] Test curl funcționează ✓

---

## 🔧 .env Final

```bash
# AWS Bedrock
BEDROCK_AGENT_ID=XXXXXXXXXX
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
BEDROCK_KNOWLEDGE_BASE_ID=XXXXXXXXXX
AWS_BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Internal Auth (ACELAȘI în app/.env!)
AI_SERVER_KEY=generated_random_key_32_chars

# Servers
API_SERVER_URL=http://localhost:3000
ELIXIR_HTTP_URL=http://localhost:4000

# DynamoDB
DYNAMODB_MESSAGES_TABLE=ai-agent-messages
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
AWS_REGION=eu-central-1

# Optional
BEDROCK_ENABLE_TRACE=true
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **QUICK_START.md** | Acest ghid (10 min setup) |
| **DENTAL_KB_SETUP.md** | Setup detaliat KB cu troubleshooting |
| **SETUP_CHECKLIST.md** | Checklist complet |
| **ENV_SETUP.md** | Toate env vars |
| **REFACTORING_SUMMARY.md** | Ce am modificat |
| **CLEANUP_SUMMARY.md** | Code cleanup |

---

## 💡 Pro Tips

### Test Knowledge Base în AWS Console
1. Knowledge bases → `simplu-dental-kb` → tab **Test**
2. Query: `"La ce oră deschideți luni?"`
3. Ar trebui să returneze working-hours document

### Verifică Working Hours în Răspunsuri
AI-ul ar trebui să:
- Verifice working-hours înainte de programări
- Respingă ore în afara programului
- Respingă zile cu `isWorking: false`
- Ofere alternative în program

### Monitorizare
```bash
# Watch logs
tail -f logs/*.log | grep -E "(Bedrock|Tool|Working)"
```

---

**Total timp:** ~10 minute  
**Dificultate:** Ușor (copy-paste)  
**Rezultat:** Sistem AI complet funcțional! 🚀

