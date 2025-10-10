# Dental Knowledge Base - Setup Complet

## 🚀 Setup în 5 Pași Simpli

### Pas 1: Pregătește Documentele

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server

# Rulează scriptul de pregătire
npm run prepare-dental-kb
```

**Output așteptat:**
```
🦷 Starting Dental Knowledge Base preparation...
📁 Created output directory: data/kb-documents/dental
📝 Processing System Instructions...
✅ Created 2 System Instruction documents
📝 Processing Resource Schemas...
✅ Created 4 Resource Schema documents
📝 Processing Context Usage...
✅ Created Context Usage document
📝 Processing Query Examples...
✅ Created Query Examples document
📝 Processing Conversation Patterns...
✅ Created Conversation Patterns document
📝 Processing Terminology...
✅ Created Terminology document
📝 Processing Best Practices...
✅ Created Best Practices document

🎉 SUCCESS! Created 11 documents for Dental KB
📦 Documents are ready in: data/kb-documents/dental
```

**Verifică că documentele au fost create:**
```bash
ls -la data/kb-documents/dental/
```

Ar trebui să vezi:
```
_metadata.json
dental-operator-instructions.json
dental-customer-instructions.json
dental-resource-appointment.json
dental-resource-medic.json
dental-resource-patient.json
dental-resource-treatment.json
dental-context-usage.json
dental-query-examples.json
dental-conversation-patterns.json
dental-terminology.json
dental-best-practices.json
```

---

### Pas 2: Creează S3 Bucket

```bash
# Verifică dacă bucket-ul există
aws s3 ls | grep simplu-ai-rag

# Dacă nu există, creează-l
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# Verifică creare
aws s3 ls simplu-ai-rag-embeddings
```

---

### Pas 3: Upload Documente în S3

```bash
# Upload documentele în folder dental
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ \
  --region us-east-1

# Verifică upload
aws s3 ls s3://simplu-ai-rag-embeddings/dental/
```

**Output așteptat:**
```
upload: data/kb-documents/dental/_metadata.json to s3://...
upload: data/kb-documents/dental/dental-operator-instructions.json to s3://...
upload: data/kb-documents/dental/dental-customer-instructions.json to s3://...
... (11 files total)
```

**Verificare:**
```bash
aws s3 ls s3://simplu-ai-rag-embeddings/dental/ --recursive
```

Ar trebui să vezi toate cele 11 fișiere.

---

### Pas 4: Creează Knowledge Base în AWS Console

#### 4.1. Deschide AWS Console

1. Mergi la **AWS Console** → **Amazon Bedrock**
2. În sidebar stânga, click **Knowledge bases**
3. Click **Create knowledge base**

#### 4.2. Knowledge Base Details

**Step 1 - Provide knowledge base details:**

- **Knowledge base name:** `simplu-dental-kb`
- **Description:** `Knowledge base pentru clinica dentară cu instrucțiuni, scheme resurse și best practices`
- **IAM role:** 
  - Select **Create and use a new service role**
  - Role name: `AmazonBedrockExecutionRoleForKnowledgeBase_dental`
- Click **Next**

#### 4.3. Set Up Data Source

**Step 2 - Set up data source:**

- **Data source name:** `dental-documents-s3`
- **S3 URI:** `s3://simplu-ai-rag-embeddings/dental/`
- **Chunking strategy:** 
  - Select **Default chunking**
  - Maximum tokens: `300`
  - Overlap percentage: `20%`

**Important:** Asigură-te că S3 URI se termină cu `/` (slash)!

Click **Next**

#### 4.4. Select Embeddings Model

**Step 3 - Select embeddings model:**

- **Embeddings model:** `Titan Embeddings G1 - Text v2`
  - Sau selectează: `amazon.titan-embed-text-v2:0`
- **Dimensions:** `1024` (default)

Click **Next**

#### 4.5. Configure Vector Store

**Step 4 - Configure vector store:**

**Opțiunea A - Quick Create (Recomandat pentru început):**
- Select **Quick create a new vector store**
- Vector store name: `simplu-dental-vector-store`
- Click **Next**

**Opțiunea B - Custom (Dacă ai deja OpenSearch):**
- Select **Choose a vector store you have created**
- Selectează vector store-ul existent
- Click **Next**

#### 4.6. Review and Create

**Step 5 - Review and create:**

Verifică toate setările:
- ✓ Name: `simplu-dental-kb`
- ✓ Data source: `s3://simplu-ai-rag-embeddings/dental/`
- ✓ Embeddings: `amazon.titan-embed-text-v2:0`
- ✓ Vector store: OpenSearch Serverless (quick create)

Click **Create knowledge base**

⏳ **Așteaptă 2-5 minute** până Knowledge Base devine **ACTIVE**

---

### Pas 5: Sync Data Source

După ce Knowledge Base este **ACTIVE**:

1. Click pe **`simplu-dental-kb`** în listă
2. Scroll down la secțiunea **Data sources**
3. Click pe **`dental-documents-s3`**
4. Click butonul **Sync** (sus dreapta)
5. Confirmă **Sync data source**

⏳ **Așteaptă 2-10 minute** pentru indexare

**Status-uri:**
- 🟡 Syncing... (în progres)
- 🟢 Ready (finalizat cu succes)

#### Verifică Sync

În pagina data source, ar trebui să vezi:
- **Status:** Ready
- **Documents:** 11
- **Last sync:** acum câteva minute

---

### Pas 6: Copy Knowledge Base ID

După creare, în header-ul paginii Knowledge Base vei vedea:

```
Knowledge base ID: AB12CD34EF  (← COPIAZĂ ACEST ID)
```

**Adaugă în `.env`:**

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server

# Editează .env și adaugă:
BEDROCK_KNOWLEDGE_BASE_ID=AB12CD34EF  # Înlocuiește cu ID-ul tău
```

---

### Pas 7: Test Knowledge Base

#### Test în AWS Console

1. În pagina Knowledge Base, click pe tab **Test**
2. În **Test knowledge base**, introdu un query:

**Test query 1:**
```
Cum ar trebui să răspund unui operator care lucrează într-o clinică dentară?
```

**Expected:** Ar trebui să returneze document-ul `dental-operator-instructions` cu:
- Stil concis (max 50 cuvinte)
- Profesional
- Tools disponibile

**Test query 2:**
```
Ce structură are o programare (appointment) în sistem?
```

**Expected:** Ar trebui să returneze `dental-resource-appointment` cu schema completă

**Test query 3:**
```
Cum folosesc userId din context pentru a găsi programările medicului curent?
```

**Expected:** Ar trebui să returneze `dental-context-usage` cu exemple

#### Test din Aplicație

```bash
# Restart server
npm run start:dev
```

**Test cu curl:**
```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test_kb",
    "message_id": "msg_test",
    "payload": {
      "content": "Câte programări am astăzi?"
    }
  }'
```

**Expected response:**
- Răspuns în stil operator (concis, profesional)
- Folosește `query_app_server` tool
- Filtrare cu `data.doctor.id === userId`

---

## 📝 Naming Convention

### Knowledge Base Name
```
simplu-dental-kb
```

**Pattern:** `simplu-{businessType}-kb`

**Motivație:**
- `simplu` - numele proiectului
- `dental` - tipul de business
- `kb` - knowledge base

**Pentru viitor:**
- Gym: `simplu-gym-kb`
- Hotel: `simplu-hotel-kb`
- General: `simplu-general-kb`

### S3 Bucket Structure
```
s3://simplu-ai-rag-embeddings/
  ├── dental/           ← Pentru clinică dentară
  │   ├── dental-operator-instructions.json
  │   ├── dental-resource-appointment.json
  │   └── ... (11 files)
  ├── gym/              ← Pentru sală de sport (viitor)
  └── hotel/            ← Pentru hotel (viitor)
```

**Motivație:**
- Bucket comun pentru toate KB-urile
- Folder separate per business type
- Ușor de scalat pentru multiple business types

### Vector Store Name
```
simplu-dental-vector-store
```

**Pattern:** `simplu-{businessType}-vector-store`

---

## 🔧 Comenzi Complete (Copy-Paste)

```bash
# 1. Pregătește documentele
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server
npm run prepare-dental-kb

# 2. Creează S3 bucket (dacă nu există)
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# 3. Upload în S3
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ \
  --region us-east-1

# 4. Verifică upload
aws s3 ls s3://simplu-ai-rag-embeddings/dental/ --recursive

# 5. După creare KB în AWS Console, verifică că ID-ul e în .env
grep BEDROCK_KNOWLEDGE_BASE_ID .env
```

---

## ✅ Checklist Final

- [ ] Rulat `npm run prepare-dental-kb` ✓
- [ ] Verificat că 11 documente au fost create în `data/kb-documents/dental/`
- [ ] Creat S3 bucket `simplu-ai-rag-embeddings`
- [ ] Uploaded documente în `s3://simplu-ai-rag-embeddings/dental/`
- [ ] Verificat în S3 că toate fișierele sunt acolo
- [ ] Creat Knowledge Base în AWS Console: `simplu-dental-kb`
- [ ] Configurat data source: `s3://simplu-ai-rag-embeddings/dental/`
- [ ] Selectat embeddings model: `amazon.titan-embed-text-v2:0`
- [ ] Created vector store (OpenSearch Serverless)
- [ ] Sync-uit data source
- [ ] Verificat că sync-ul a reușit (Status: Ready, Documents: 11)
- [ ] Copiat Knowledge Base ID
- [ ] Adăugat `BEDROCK_KNOWLEDGE_BASE_ID` în `.env`
- [ ] Testat în AWS Console (tab Test)
- [ ] Testat din aplicație (curl)

---

## 💰 Cost Estimate

**S3 Storage:**
- 11 documents × ~5KB = ~55KB total
- Cost: ~$0.000001/month (neglijabil)

**Knowledge Base:**
- Indexing (one-time): $0.10 per 1000 documents = $0.0011
- Queries: $0.10 per query (cu 5 results)
- Estimate lunar: **$5-15** (100-150 queries/zi)

**OpenSearch Serverless:**
- OCU (OpenSearch Compute Units): ~$0.24/hour
- Estimate lunar: **~$175/month**
- **TIP:** Poate folosi Pinecone sau alte vector DB mai ieftine

**Total estimate:** **~$180-190/month** pentru Knowledge Base

**Reducere costuri:**
- Folosește Pinecone free tier (până la 1M vectori)
- Sau folosește FAISS local (gratis dar mai lent)
- Reduce numărul de query results (5 → 3)

---

## 🔍 Troubleshooting

### Error: "No documents found in S3"

```bash
# Verifică că documentele sunt în S3
aws s3 ls s3://simplu-ai-rag-embeddings/dental/

# Verifică permisiunile IAM role
# Knowledge Base role trebuie să aibă acces la bucket
```

### Error: "Sync failed"

**Verifică:**
1. S3 URI este corect: `s3://simplu-ai-rag-embeddings/dental/`
2. IAM role are permisiuni `s3:GetObject`, `s3:ListBucket`
3. Documentele sunt JSON valid

**Fix:**
```bash
# Re-upload documentele
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ --delete

# Încearcă sync din nou în console
```

### Error: "No relevant results returned"

**În `.env`, ajustează:**
```bash
# Reduce scorul minim
BEDROCK_KB_MIN_SCORE=0.5  # în loc de 0.7

# Crește număr rezultate
BEDROCK_KB_RESULTS=10  # în loc de 5
```

### Error: "Vector store creation failed"

- OpenSearch Serverless are nevoie de puțin timp pentru setup
- Așteaptă 5-10 minute și încearcă din nou
- SAU folosește un vector store existent

---

## 📊 Ce Conțin Documentele

**Total: 11 documente**

1. **dental-operator-instructions** - Comportament pentru operatori
2. **dental-customer-instructions** - Comportament pentru clienți
3. **dental-resource-appointment** - Schema programare cu exemple
4. **dental-resource-medic** - Schema medic (userId === resourceId!)
5. **dental-resource-patient** - Schema pacient
6. **dental-resource-treatment** - Schema tratament
7. **dental-context-usage** - Cum să folosești userId din context
8. **dental-query-examples** - Exemple de query-uri comune
9. **dental-conversation-patterns** - Fluxuri conversaționale
10. **dental-terminology** - Terminologie medicală
11. **dental-best-practices** - Best practices

Plus:
- **_metadata.json** - Informații despre KB

---

## 🎯 După Setup

### Conectează KB la Bedrock Agent

1. **AWS Console** → **Bedrock** → **Agents**
2. Selectează agent-ul tău
3. În **Knowledge bases**, click **Add**
4. Selectează `simplu-dental-kb`
5. **Instructions for knowledge base:**
   ```
   Use this knowledge base to understand:
   - How to behave as operator vs customer
   - Resource schemas and data structures  
   - How to use userId from context
   - Query examples and conversation patterns
   - Dental terminology and best practices
   ```
6. **Save**

### Restart AI Agent Server

```bash
npm run start:dev
```

**Logs expected:**
```
🤖 Bedrock Agent Service initialized with agent: XXXXXXXXXX
✅ Registered 6 tools
```

### Test Complet

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "final_test",
    "message_id": "msg_final",
    "payload": {
      "content": "Creează programare pentru Ion Popescu mâine la 14:00, consultație"
    }
  }'
```

**Expected:**
- AI înțelege că e operator (userId === medic)
- Folosește `call_frontend_function` pentru creare
- Răspuns concis și profesional
- Include toate câmpurile necesare (doctor, patient, service)

---

## 📚 Documentation Files

După setup, ai următoarea documentație:

| File | Content |
|------|---------|
| `DENTAL_KB_SETUP.md` | Acest ghid (setup complet) |
| `dental-knowledge-base.json` | Date source pentru KB |
| `data/kb-documents/dental/` | Documente generate pentru S3 |
| `SETUP_CHECKLIST.md` | Checklist general Bedrock |
| `ENV_SETUP.md` | Environment variables |

---

## 🆘 Need Help?

**Verifică logs:**
```bash
grep -i "knowledge" logs/*.log
grep -i "bedrock" logs/*.log
```

**Test Knowledge Base retrieval:**
```typescript
// În aplicație
const results = await toolsService.retrieveFromKnowledgeBase(
  'Cum creez o programare?',
  5
);
console.log('KB Results:', results);
```

**Common issues:**
- S3 URI wrong → Verifică că se termină cu `/`
- Permissions → IAM role needs `s3:GetObject` + `s3:ListBucket`
- No results → Reduce `BEDROCK_KB_MIN_SCORE`
- Slow → Reduce `BEDROCK_KB_RESULTS`

---

**Good luck! 🚀**

Următorul pas: Creează Bedrock Agent și conectează Knowledge Base!

