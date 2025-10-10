# AWS CLI Knowledge Base Setup Guide

## 🎯 Important de Înțeles

### NU uploadezi direct în Vector Store!

**Flow-ul corect:**

```
1. Tu uploadezi documente în S3
   ↓
2. Creezi Knowledge Base (KB) în AWS
   ↓
3. KB creează Data Source (link la S3)
   ↓
4. Rulezi SYNC (ingestion job)
   ↓
5. Bedrock citește din S3 → generează embeddings → stochează în Vector Store
```

**Vector Store-ul se POPULEAZĂ AUTOMAT la sync!**

---

## 🚀 Quick Setup (Având Deja KB Creat)

### Dacă AI DEJA Knowledge Base creat în AWS Console:

```bash
# 1. Găsește KB ID și Data Source ID
aws bedrock-agent list-knowledge-bases --region us-east-1

# Output:
# knowledgeBaseId: "XXXXXXXXXX"  ← COPY

aws bedrock-agent list-data-sources \
  --knowledge-base-id "XXXXXXXXXX" \
  --region us-east-1

# Output:
# dataSourceId: "YYYYYYYYYY"  ← COPY

# 2. Upload documente în S3
npm run prepare-dental-kb
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/

# 3. Sync (ACESTA populează vector store!)
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "XXXXXXXXXX" \
  --data-source-id "YYYYYYYYYY" \
  --region us-east-1

# 4. Verifică progres
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "XXXXXXXXXX" \
  --data-source-id "YYYYYYYYYY" \
  --ingestion-job-id "ZZZZZZZZZZ" \
  --region us-east-1
```

---

## 📦 Setup Complet de la Zero (CLI)

### Opțiunea 1: Folosește Scriptul Automat

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server

# Editează scriptul
nano scripts/setup-kb-cli.sh

# Setează AWS_ACCOUNT_ID (linia 15):
AWS_ACCOUNT_ID="123456789012"  # Replace cu ID-ul tău

# Salvează (Ctrl+X, Y, Enter)

# Dă permisiuni de execuție
chmod +x scripts/setup-kb-cli.sh

# Rulează
./scripts/setup-kb-cli.sh
```

**Scriptul face automat:**
1. ✅ Upload S3
2. ✅ Creează OpenSearch collection
3. ✅ Creează IAM role
4. ✅ Creează Knowledge Base
5. ✅ Creează Data Source
6. ✅ Sync (populează vector store)
7. ✅ Verifică completion

**Durată:** ~10-15 minute

---

### Opțiunea 2: Manual Step-by-Step

#### 2.1. Upload în S3

```bash
npm run prepare-dental-kb
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/
```

#### 2.2. Găsește AWS Account ID

```bash
aws sts get-caller-identity

# Output:
# "Account": "123456789012"  ← COPY
```

#### 2.3. Creează Knowledge Base (Console mai simplu!)

Este **MULT MAI SIMPLU** prin Console pentru prima creare.

CLI este util pentru:
- ✅ **Sync-uri repetate** (update documente)
- ✅ **Automatizare** (CI/CD)
- ✅ **Multiple environments**

---

## 🔄 Update Documente (Cel Mai Comun)

Când modifici `dental-knowledge-base.json`:

```bash
# 1. Regenerează documente
npm run prepare-dental-kb

# 2. Upload în S3 (cu --delete pentru a șterge vechi)
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ \
  --delete \
  --region us-east-1

# 3. Găsește IDs (prima dată)
aws bedrock-agent list-knowledge-bases --region us-east-1
# Copy KB_ID

aws bedrock-agent list-data-sources \
  --knowledge-base-id "KB_ID_HERE" \
  --region us-east-1
# Copy DS_ID

# 4. Sync (populează vector store cu date noi!)
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "KB_ID_HERE" \
  --data-source-id "DS_ID_HERE" \
  --region us-east-1

# 5. Monitor progres
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id "KB_ID_HERE" \
  --data-source-id "DS_ID_HERE" \
  --region us-east-1
```

---

## 🧪 Test Knowledge Base via CLI

```bash
# Test retrieval (după sync)
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id "XXXXXXXXXX" \
  --retrieval-query '{"text": "La ce oră deschideți luni?"}' \
  --region us-east-1
```

**Expected output:**
```json
{
  "retrievalResults": [
    {
      "content": {
        "text": "Setting-ul working-hours este CRUCIAL..."
      },
      "location": {
        "s3Location": {
          "uri": "s3://simplu-ai-rag-embeddings/dental/dental-resource-setting.json"
        }
      },
      "score": 0.85
    }
  ]
}
```

---

## 💡 Script Simplu pentru Sync

Editează `scripts/sync-kb.sh` și setează IDs:

```bash
#!/bin/bash
KB_ID="XXXXXXXXXX"  # Din AWS Console sau list-knowledge-bases
DS_ID="YYYYYYYYYY"  # Din list-data-sources
REGION="us-east-1"

npm run prepare-dental-kb
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ --delete
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --region ${REGION}
```

**Apoi când updatezi documente:**
```bash
chmod +x scripts/sync-kb.sh
./scripts/sync-kb.sh
```

---

## 📝 NPM Script (Recomandat)

Adaugă în `package.json`:

```json
"scripts": {
  "sync-kb": "sh scripts/sync-kb.sh"
}
```

**Apoi:**
```bash
npm run sync-kb
```

---

## ✅ TL;DR:

**Nu uploadezi DIRECT în vector store!**

**Procesul corect:**
1. 📤 Upload JSON în S3 (CLI: `aws s3 sync`)
2. 🔄 Sync Knowledge Base (CLI: `start-ingestion-job`)
3. ⚙️ Bedrock citește S3 → generează embeddings → **populează automat vector store**

**Vector store-ul se populează AUTOMAT la sync!** 🎉

Vrei să rulăm scriptul sau preferi să creezi KB în Console (mai simplu prima dată)? 🚀
