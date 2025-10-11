# Quick Setup: AWS Bedrock Knowledge Base cu S3 Vectors

## 🚀 Setup Rapid (Recomandat)

### Pas 1: Rulează scriptul automat de setup

```bash
cd ai-agent-server
./scripts/setup-s3-vectors-kb.sh
```

Scriptul va:
- ✅ Crea bucket-uri S3 (vectori + date)
- ✅ Crea index S3 Vectors
- ✅ Upload documente în S3
- ✅ Crea rol IAM cu permisiuni
- ✅ Crea Knowledge Base
- ✅ Crea Data Source
- ✅ Porni ingestion job automat

**Output**: La final vei primi `BEDROCK_KNOWLEDGE_BASE_ID` de adăugat în `.env`

---

## 📊 Verificare Status Ingestion

```bash
# Verifică ultimul ingestion job
./scripts/check-ingestion-status.sh KB123456 DS123456

# Verifică un ingestion job specific
./scripts/check-ingestion-status.sh KB123456 DS123456 IJ123456
```

---

## 🔄 Actualizare Documente

Când modifici `dental-knowledge-base.json`:

```bash
# Regenerează, sync S3 și re-index automat
./scripts/sync-kb-documents.sh KB123456 DS123456

# Sau doar re-index (fără sync S3)
./scripts/sync-kb-documents.sh KB123456 DS123456 --skip-sync
```

---

## 🔧 Setup Manual (Pas cu Pas)

### 1. Pregătire Documente

```bash
# Regenerează documentele din dental-knowledge-base.json
node scripts/prepare-dental-kb.js
```

### 2. Creează Buckets S3

```bash
# Bucket pentru vectori
aws s3api create-bucket \
  --bucket simplu-ai-vectors \
  --region us-east-1

# Bucket pentru documente sursă
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1
```

### 3. Creează S3 Vector Index

```bash
aws s3vectors create-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --dimensions 1024 \
  --embedding-data-type FLOAT32 \
  --region us-east-1
```

**Important**: `dimensions` = **1024** pentru Titan Embed Text v2

### 4. Upload Documente

```bash
aws s3 sync \
  ./data/kb-documents/dental/ \
  s3://simplu-ai-rag-embeddings/dental/ \
  --region us-east-1
```

### 5. Creează IAM Role

Creează rol cu politică din `S3_VECTORS_SETUP.md` (secțiunea 4)

### 6. Creează Knowledge Base

```bash
aws bedrock-agent create-knowledge-base \
  --name "simplu-dental-kb" \
  --description "Dental clinic knowledge base" \
  --role-arn "arn:aws:iam::YOUR_ACCOUNT_ID:role/BedrockS3VectorsKnowledgeBaseRole" \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \
  --storage-configuration '{
    "type": "S3_VECTORS",
    "s3VectorsConfiguration": {
      "vectorBucketArn": "arn:aws:s3:::simplu-ai-vectors",
      "indexName": "dental-kb-index"
    }
  }' \
  --region us-east-1
```

**Notează**: `knowledgeBaseId` din răspuns!

### 7. Creează Data Source

```bash
aws bedrock-agent create-data-source \
  --name "dental-documents" \
  --description "Dental knowledge base documents" \
  --knowledge-base-id "YOUR_KB_ID" \
  --data-source-configuration '{
    "type": "S3",
    "s3Configuration": {
      "bucketArn": "arn:aws:s3:::simplu-ai-rag-embeddings",
      "inclusionPrefixes": ["dental/"]
    }
  }' \
  --vector-ingestion-configuration '{
    "chunkingConfiguration": {
      "chunkingStrategy": "FIXED_SIZE",
      "fixedSizeChunkingConfiguration": {
        "maxTokens": 512,
        "overlapPercentage": 20
      }
    }
  }' \
  --region us-east-1
```

**Notează**: `dataSourceId` din răspuns!

### 8. Start Ingestion

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "YOUR_KB_ID" \
  --data-source-id "YOUR_DS_ID" \
  --region us-east-1
```

### 9. Verifică Status

```bash
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "YOUR_KB_ID" \
  --data-source-id "YOUR_DS_ID" \
  --ingestion-job-id "YOUR_JOB_ID" \
  --region us-east-1
```

---

## ⚙️ Configurare .env

După setup, adaugă în `.env`:

```bash
# AWS Bedrock Configuration
BEDROCK_KNOWLEDGE_BASE_ID=YOUR_KB_ID_HERE
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0

# AWS Credentials (dacă nu folosești IAM roles)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

---

## 🧪 Testare Knowledge Base

### Test via CLI

```bash
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id YOUR_KB_ID \
  --retrieval-query '{"text": "What are the working hours?"}' \
  --region us-east-1
```

### Test via API (în aplicație)

```typescript
// Exemplu: Query KB în cod
const response = await this.bedrockService.queryKnowledgeBase({
  query: 'What are the dental treatments available?',
  knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID,
});
```

---

## 📋 Comenzi Utile

### Listează toate Knowledge Bases

```bash
aws bedrock-agent list-knowledge-bases --region us-east-1
```

### Verifică detalii KB

```bash
aws bedrock-agent get-knowledge-base \
  --knowledge-base-id YOUR_KB_ID \
  --region us-east-1
```

### Listează Data Sources

```bash
aws bedrock-agent list-data-sources \
  --knowledge-base-id YOUR_KB_ID \
  --region us-east-1
```

### Listează Ingestion Jobs

```bash
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID \
  --region us-east-1
```

### Verifică S3 Vector Index

```bash
aws s3vectors describe-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --region us-east-1
```

### Șterge Knowledge Base

```bash
# ATENȚIE: Acțiune ireversibilă!
aws bedrock-agent delete-knowledge-base \
  --knowledge-base-id YOUR_KB_ID \
  --region us-east-1
```

---

## 🐛 Troubleshooting

### Eroare: "Index not found"

```bash
# Verifică că indexul există
aws s3vectors describe-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --region us-east-1

# Re-creează indexul dacă lipsește
aws s3vectors create-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --dimensions 1024 \
  --embedding-data-type FLOAT32 \
  --region us-east-1
```

### Eroare: "Access Denied"

Verifică că rol-ul IAM are toate permisiunile:
- S3: `ListBucket`, `GetObject` pe data bucket
- S3 Vectors: `PutVectors`, `GetVectors`, `SearchVectors` pe index
- Bedrock: `InvokeModel` pentru embedding model

### Ingestion Job Failed

```bash
# Verifică detalii eroare
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID \
  --ingestion-job-id YOUR_JOB_ID \
  --region us-east-1

# Verifică CloudWatch logs
aws logs tail /aws/bedrock/knowledgebases/YOUR_KB_ID --follow
```

### Documente nu sunt găsite în retrieval

1. Verifică că ingestion job s-a terminat cu succes
2. Verifică că documentele sunt în S3 la path-ul corect
3. Re-run ingestion job

```bash
./scripts/sync-kb-documents.sh YOUR_KB_ID YOUR_DS_ID --skip-sync
```

---

## 💰 Costuri Estimate

| Resursă | Cost Lunar (estimat) |
|---------|---------------------|
| S3 Storage (vectori + documente) | ~$0.50 - $2.00 |
| S3 Vectors (search queries) | ~$0.10 - $1.00 |
| Bedrock Titan Embeddings | ~$0.50 - $5.00 |
| Bedrock Claude (inference) | ~$10 - $100+ |

**Total estimat**: $11 - $108/lună (depinde de trafic)

**Comparație**:
- Pinecone: ~$70/lună (plan starter)
- OpenSearch: ~$100+/lună (cluster managed)
- **S3 Vectors: Cel mai ieftin** ✅

---

## 📚 Documentație Completă

Pentru detalii complete, vezi:
- `S3_VECTORS_SETUP.md` - Ghid complet pas cu pas
- `data/KNOWLEDGE_BASE_SETUP.md` - Setup general KB
- Scripts:
  - `scripts/setup-s3-vectors-kb.sh` - Setup automat
  - `scripts/check-ingestion-status.sh` - Verificare status
  - `scripts/sync-kb-documents.sh` - Sync documente

---

## ✅ Checklist Final

Înainte de a marca task-ul ca finalizat:

- [ ] Knowledge Base creat cu succes
- [ ] Vector Index creat în S3 Vectors
- [ ] Documente uploadate în S3
- [ ] Data Source configurat
- [ ] Ingestion job rulat și completat cu succes
- [ ] `BEDROCK_KNOWLEDGE_BASE_ID` adăugat în `.env`
- [ ] Test retrieval funcționează
- [ ] Aplicația poate query KB-ul

---

## 🎉 Success!

Acum ai un Knowledge Base funcțional pe **AWS S3 Vectors** - soluția nativă AWS, fără Pinecone sau OpenSearch!

**Next steps**:
1. Integrează în aplicație (vezi `bedrock-agent.service.ts`)
2. Testează cu queries reale
3. Monitorizează performanța
4. Optimizează chunking strategy dacă e necesar

