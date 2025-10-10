# Knowledge Base Setup Guide

## 📦 Ce Conține Acest Director

### 1. `knowledge-base-data.json`
Fișier master cu toate datele pentru Knowledge Base:

- **System Instructions** (6 documente) - Comportament agent pentru fiecare rol × business type
- **Tool Guidance** (5 documente) - Cum să folosească fiecare tool
- **Conversation Patterns** (3 documente) - Fluxuri conversaționale tipice
- **Domain Knowledge** (3 documente) - Cunoștințe despre dental, gym, hotel
- **Quick Responses** - Pattern-uri pentru răspunsuri rapide

**Total: ~17 documente de instruire**

## 🚀 Cum Să Folosești Datele

### Opțiunea 1: Upload Direct (Simplu)

#### Pas 1: Pregătește Documentele

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server

# Rulează scriptul de pregătire
node scripts/prepare-knowledge-base.js
```

Acest script va crea:
- `data/kb-documents/` - Director cu documente JSON individuale
- Fiecare document are ID, content și metadata
- Format optimizat pentru embeddings

#### Pas 2: Creează S3 Bucket

```bash
# Creează bucket-ul (dacă nu există)
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1

# Verifică că s-a creat
aws s3 ls | grep simplu-ai-rag
```

#### Pas 3: Upload în S3

```bash
# Upload toate documentele
aws s3 sync data/kb-documents/ s3://simplu-ai-rag-embeddings/documents/ \
  --region us-east-1

# Verifică upload
aws s3 ls s3://simplu-ai-rag-embeddings/documents/
```

### Opțiunea 2: Folosește Scriptul Existent

```bash
# Dacă ai deja date în DynamoDB, folosește:
node scripts/migrate-rag-to-s3.js

# Acest script:
# - Extrage din DynamoDB (tabelul rag-instructions)
# - Convertește în format KB
# - Upload în S3
```

## 🧠 Crearea Knowledge Base în AWS

### Pas 1: Deschide AWS Console

1. AWS Console → **Amazon Bedrock**
2. În sidebar: **Knowledge bases**
3. Click **Create knowledge base**

### Pas 2: Knowledge Base Details

- **Name**: `simplu-ai-knowledge-base`
- **Description**: "Knowledge base pentru instrucțiuni RAG și ghidare conversațională"
- **IAM Role**: Creează nou sau selectează existent
- Click **Next**

### Pas 3: Configure Data Source

- **Data source name**: `s3-kb-documents`
- **S3 URI**: `s3://simplu-ai-rag-embeddings/documents/`
- **Chunking strategy**: Fixed-size (default 300 tokens, 20% overlap)
- Click **Next**

### Pas 4: Select Embeddings Model

- **Embeddings model**: `Amazon Titan Embeddings G1 - Text v2`
  - Sau: `amazon.titan-embed-text-v2:0`
- **Dimensions**: 1024 (default)
- Click **Next**

### Pas 5: Configure Vector Store

**Opțiunea A: Quick Create (Recomandat pentru început)**
- Select **Quick create a new vector store**
- Va crea Amazon OpenSearch Serverless automat
- Click **Next**

**Opțiunea B: Custom Vector Store**
- Dacă ai deja OpenSearch, Pinecone, sau alt vector DB
- Configurează connection details

### Pas 6: Review and Create

- Review toate setările
- Click **Create knowledge base**
- Așteaptă 2-5 minute până devine **ACTIVE**

### Pas 7: Sync Data

1. După creare, Knowledge Base-ul apare în listă
2. Click pe numele lui
3. În secțiunea **Data sources**, click pe `s3-kb-documents`
4. Click **Sync** pentru a indexa documentele
5. Așteaptă până sync-ul se finalizează (~2-10 minute)

### Pas 8: Copy Knowledge Base ID

1. În header-ul paginii vei vedea: **Knowledge base ID: `XXXXXXXXXX`**
2. **Copiază acest ID** (10 caractere)
3. Adaugă în `.env`:

```bash
BEDROCK_KNOWLEDGE_BASE_ID=XXXXXXXXXX
```

## ✅ Verificare Setup

### Test 1: Query Direct în Console

În AWS Console → Knowledge Base → secțiunea **Test**:

**Query de test:**
```
Cum ar trebui să răspund unui operator care lucrează într-o clinică dentară?
```

**Expected result:**
Ar trebui să returneze document-ul `operator-dental-001` cu instrucțiuni pentru operatori dentali.

### Test 2: Query din Aplicație

```bash
# Restart server
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server
npm run start:dev

# Test cu curl
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "operator_1",
    "session_id": "test_session",
    "message_id": "msg_1",
    "payload": {
      "content": "Vreau să văd programările de azi"
    }
  }'
```

Ar trebui să primești un răspuns care:
- Folosește stilul operator (concis, profesional)
- Apelează tool-ul `query_app_server`
- Răspunde în max 50 cuvinte

## 📊 Structura Documentelor

Fiecare document are formatul:

```json
{
  "id": "operator-dental-001",
  "content": "Instrucțiuni detaliate și exemple...",
  "metadata": {
    "category": "systemInstructions",
    "businessType": "dental",
    "role": "operator",
    "keywords": "operator, dental, programări",
    "priority": "high"
  }
}
```

**Metadata** ajută la:
- Filtrare relevantă per query
- Scoring mai bun al rezultatelor
- Debugging și analytics

## 🔄 Actualizarea Datelor

Când modifici instrucțiunile:

1. **Editează** `knowledge-base-data.json`
2. **Regenerează** documentele:
   ```bash
   node scripts/prepare-knowledge-base.js
   ```
3. **Re-upload** în S3:
   ```bash
   aws s3 sync data/kb-documents/ s3://simplu-ai-rag-embeddings/documents/ --delete
   ```
4. **Sync** în AWS Console:
   - Knowledge bases → selectează KB-ul tău → Data sources → Sync

## 💰 Costuri Estimate

**S3 Storage:**
- ~20 documente × 5KB = 100KB total
- Cost: $0.023 per GB/month → **$0.000002/month** (neglijabil)

**Knowledge Base:**
- Sync (indexing): $0.10 per 1000 documents
- Query: $0.10 per query (cu 5 results)
- Cost estimat: **$5-20/month** (depinde de traffic)

**Embeddings:**
- Titan Embeddings: $0.0001 per 1K tokens
- ~20 docs × 300 tokens = 6K tokens
- Cost indexing: **$0.0006 one-time**

## 🛠️ Troubleshooting

### Problema: "No documents found in S3"

```bash
# Verifică că documentele sunt în S3
aws s3 ls s3://simplu-ai-rag-embeddings/documents/

# Verifică permisiunile
# Knowledge Base trebuie să aibă acces read la bucket
```

### Problema: "Sync failed"

- Verifică IAM role permissions
- Verifică că documentele sunt JSON valid
- Încercă să ștergi și recreezi data source

### Problema: "No relevant results returned"

- Scade scorul minim în `.env`:
  ```bash
  BEDROCK_KB_MIN_SCORE=0.5  # în loc de 0.7
  ```
- Crește numărul de rezultate:
  ```bash
  BEDROCK_KB_RESULTS=10  # în loc de 5
  ```

### Problema: "Knowledge Base too slow"

- Reduce `numberOfResults` în queries
- Folosește caching pentru queries frecvente
- Consideră pre-warming pentru queries comune

## 📚 Resurse

- [AWS Bedrock Knowledge Bases Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Titan Embeddings Model](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
- [OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html)

## 🎯 Next Steps

După setup:

1. **Testează** cu diverse query-uri
2. **Monitorizează** accuracy și relevance
3. **Ajustează** instrucțiunile bazat pe feedback
4. **Extinde** cu mai multe business types
5. **Optimizează** chunking strategy dacă e necesar

---

**Good luck! 🚀**

Pentru întrebări, verifică logs-urile sau testează în AWS Console.

