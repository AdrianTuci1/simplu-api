# Knowledge Base Quick Reference

## 📚 Ce este Knowledge Base?

Knowledge Base permite Bedrock Agent să acceseze documentație și context specific business-ului folosind RAG (Retrieval Augmented Generation). Agent-ul poate căuta informații relevante în documente și le folosește pentru a răspunde mai precis.

## 🎯 De ce ai nevoie de Knowledge Base?

**Fără KB**: Agent-ul știe doar ce i-ai spus în instructions (prompt general)
**Cu KB**: Agent-ul are acces la:
- Instrucțiuni detaliate pentru operatori
- Instrucțiuni pentru clienți
- Structuri de date și câmpuri
- Politici și proceduri specifice clinicii
- Context business-specific

## 📁 Structura Documentelor

### Pentru Dental Clinic

Documentele sunt în `ai-agent-server/data/kb-documents/dental/`:

```
dental/
├── _metadata.json                          # Metadata despre toate documentele
├── dental-customer-instructions.json       # Instrucțiuni pentru clienți/pacienți
├── dental-operator-instructions.json       # Instrucțiuni pentru operatori
├── dental-resource-structure.json          # Structura resurse (appointments, patients, etc.)
├── dental-data-field-structure.json        # Descrieri câmpuri de date
└── dental-resource-setting.json            # Setări și configurări
```

### Format Documente

Fiecare document JSON are structura:

```json
{
  "id": "document-id",
  "title": "Document Title",
  "type": "instructions",
  "businessType": "dental",
  "content": "Actual document content in markdown format...",
  "metadata": {
    "version": "1.0",
    "lastUpdated": "2024-01-15",
    "tags": ["operators", "instructions"]
  }
}
```

## 🚀 Setup Rapid

### Opțiunea 1: Folosind Scriptul Automat

```bash
cd ai-agent-server

# Setup complet (S3 bucket + Knowledge Base + Sync documents)
./scripts/setup-s3-vectors-kb.sh

# Urmărește instrucțiunile interactive
# Scriptul va:
# 1. Verifica/Crea S3 bucket
# 2. Sincroniza documentele locale în S3
# 3. Ghida crearea Knowledge Base în AWS Console
# 4. Verifica sincronizarea
```

### Opțiunea 2: Manual Step-by-Step

#### Pasul 1: Creează S3 Bucket

```bash
# Creează bucket
aws s3api create-bucket \
  --bucket simplu-ai-dental-kb \
  --region us-east-1

# Activează versioning (opțional, dar recomandat)
aws s3api put-bucket-versioning \
  --bucket simplu-ai-dental-kb \
  --versioning-configuration Status=Enabled
```

#### Pasul 2: Upload Documente în S3

```bash
cd ai-agent-server

# Sync toate documentele dental
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-dental-kb/dental/ \
  --exclude "*" \
  --include "*.json"

# Verifică
aws s3 ls s3://simplu-ai-dental-kb/dental/ --recursive
```

#### Pasul 3: Creează Knowledge Base în AWS Console

1. **AWS Console** → **Bedrock** → **Knowledge bases** → **Create**
2. Completează:
   - **Name**: `simplu-dental-kb`
   - **Description**: `Knowledge base for dental clinic operations`
   - **IAM role**: Create new role

3. **Data source**:
   - **Type**: Amazon S3
   - **S3 URI**: `s3://simplu-ai-dental-kb/dental/`
   - **Name**: `dental-documents`

4. **Embeddings**:
   - **Model**: `amazon.titan-embed-text-v2:0`
   - **Dimensions**: 1024 (auto)

5. **Vector database**:
   - **Type**: Amazon OpenSearch Serverless
   - Click **Quick create**

6. **Create** → Așteaptă ~2-5 minute

7. După creare, click **Sync** pe data source

8. **Copiază Knowledge Base ID** → `.env`

#### Pasul 4: Asociază la Agent

1. AWS Console → Bedrock → Agents → Selectează agent-ul
2. Tab **Knowledge bases** → **Add**
3. Selectează KB creat
4. **Instructions for knowledge base** (opțional):
   ```
   Use this knowledge base to answer questions about dental clinic operations,
   appointment booking policies, treatment information, and data structures.
   ```
5. **Add**

## 🔄 Update Documente

### Update Local și Re-sync

```bash
# 1. Editează documentele în data/kb-documents/dental/
nano data/kb-documents/dental/dental-operator-instructions.json

# 2. Sync în S3
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-dental-kb/dental/

# 3. Sync Knowledge Base în AWS Console
# AWS Console → Bedrock → Knowledge bases → Selectează KB → Data sources → Click "Sync"
```

### Sau folosind scriptul:

```bash
cd ai-agent-server
./scripts/sync-kb-documents.sh dental
```

## 🧪 Test Knowledge Base

### Test în AWS Console

1. **Bedrock** → **Knowledge bases** → Selectează KB
2. Tab **Test**
3. Query: "Care sunt instrucțiunile pentru programări?"
4. Verifică rezultatele

### Test prin Cod

```typescript
// În ai-agent-server
const result = await toolsService.retrieveFromKnowledgeBase(
  "Care sunt instrucțiunile pentru programări?",
  5 // numberOfResults
);

console.log(result.results);
```

### Test prin API

```bash
curl -X POST http://localhost:3003/agent/test-kb \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Care sunt instrucțiunile pentru programări?",
    "numberOfResults": 5
  }'
```

## 📊 Monitoring & Logs

### În aplicația ta (cu logging-ul nou):

```
📚 Knowledge Base retrieved 3 references
```

### În trace events:

```json
{
  "knowledgeBaseLookupOutput": {
    "retrievedReferences": [
      {
        "content": {
          "text": "Pentru programări, operatorul trebuie să..."
        },
        "location": {
          "s3Location": {
            "uri": "s3://simplu-ai-dental-kb/dental/dental-operator-instructions.json"
          }
        },
        "score": 0.8567
      }
    ]
  }
}
```

## 💰 Costuri

### Knowledge Base (Amazon OpenSearch Serverless):

- **OCU (OpenSearch Compute Units)**: ~$0.24/OCU/hour
- **Minimum**: 2 OCUs = ~$345/lună (always on)
- **Indexing**: $0.024/OCU/hour pentru ingestie

### Alternative mai ieftine:

1. **Pinecone Free Tier**: 
   - 1 index, 100K vectori gratis
   - Perfect pentru testing

2. **Redis Enterprise Cloud Free Tier**:
   - 30MB gratis
   - Suficient pentru ~1000 documente mici

### Embeddings:

- **Titan Embed v2**: $0.0001 per 1K tokens
- **Exemple**: 100KB text = ~25K tokens = $0.0025

### Queries:

- **Retrieve**: $0.00004 per query (extrem de ieftin)
- **1000 queries** = $0.04

## 🔧 Troubleshooting

### KB nu returnează rezultate

**Cauze**:
1. Documentele nu sunt sincronizate (nu ai făcut Sync după upload)
2. Scorul minim prea mare (`BEDROCK_KB_MIN_SCORE`)
3. Embeddings-urile nu sunt generate corect

**Soluție**:
```bash
# Verifică documentele în S3
aws s3 ls s3://simplu-ai-dental-kb/dental/ --recursive

# Re-sync data source în AWS Console
# AWS Console → KB → Data sources → Sync

# Verifică statusul
aws bedrock-agent get-knowledge-base \
  --knowledge-base-id YOUR_KB_ID
```

### Eroare: "Access Denied" la S3

**Cauză**: IAM role pentru Knowledge Base nu are acces la S3

**Soluție**: Adaugă policy la KB role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::simplu-ai-dental-kb",
        "arn:aws:s3:::simplu-ai-dental-kb/*"
      ]
    }
  ]
}
```

### KB returnează rezultate irelevante

**Cauze**:
1. Documentele sunt prea generale
2. Query-ul este prea vag
3. Numărul de rezultate prea mare

**Soluție**:
- Îmbunătățește documentele cu informații mai specifice
- Folosește query-uri mai precise
- Reduce `numberOfResults` la 3-5

### Sync-ul durează prea mult

**Cauză**: OpenSearch Serverless trebuie să proceseze embeddings

**Normal**: 
- 5-10 documente = 1-2 minute
- 50-100 documente = 5-10 minute

**Check status**:
```bash
aws bedrock-agent get-data-source \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID
```

## 📚 Best Practices

### 1. Structură Documente

✅ **Bine**:
```json
{
  "content": "## Instrucțiuni Programări\n\n### Pentru operatori\n1. Verifică disponibilitatea\n2. ..."
}
```

❌ **Rău**:
```json
{
  "content": "programari: verifica disponibilitate apoi..."
}
```

### 2. Chunking

- **Default**: 300 tokens cu 20% overlap (bun pentru majoritatea cazurilor)
- **Pentru documente mari**: 500 tokens cu 30% overlap
- **Pentru FAQ-uri**: 150 tokens cu 10% overlap

### 3. Metadata

Adaugă metadata utilă:
```json
{
  "metadata": {
    "section": "appointments",
    "audience": "operators",
    "lastUpdated": "2024-01-15",
    "version": "1.2"
  }
}
```

### 4. Update Regular

- **Verifică documentele** lunar
- **Actualizează** când se schimbă procedurile
- **Re-sync** după fiecare update

## 🔗 Resurse Suplimentare

- **AWS Docs**: [Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- **Project Docs**:
  - `BEDROCK_SETUP.md` - Setup complet
  - `BEDROCK_ACTION_GROUPS_SETUP.md` - Configurare Action Groups și KB
  - `S3_VECTORS_SETUP.md` - Setup S3 și vectori
  - `scripts/setup-s3-vectors-kb.sh` - Script automat

## ✅ Checklist Knowledge Base

- [ ] S3 bucket creat
- [ ] Documente sincronizate în S3
- [ ] Knowledge Base creat în AWS
- [ ] Data source configurat (S3)
- [ ] Embeddings model selectat
- [ ] Vector database creat (OpenSearch/Pinecone)
- [ ] Initial sync completat (verifică în AWS Console)
- [ ] Knowledge Base asociat la Agent
- [ ] `BEDROCK_KNOWLEDGE_BASE_ID` setat în `.env`
- [ ] Test în AWS Console reușit
- [ ] Test în aplicație reușit (vezi log-uri KB retrieval)

