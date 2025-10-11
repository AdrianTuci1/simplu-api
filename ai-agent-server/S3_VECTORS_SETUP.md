# AWS Bedrock Knowledge Base cu S3 Vectors (Native Vector Store)

## Introducere

S3 Vectors este un vector store nativ AWS care **NU necesită Pinecone sau OpenSearch**. Este soluția cost-eficientă și simplă pentru RAG cu Bedrock.

---

## Dimensiuni Vector pentru Modele Titan Embedding

| Model | Dimensiuni Vector | ARN |
|-------|-------------------|-----|
| Titan Embed Text v1 | **1536** | `arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1:0` |
| Titan Embed Text v2 | **1024** (sau 256, 512) | `arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0` |

> **Recomandare**: Folosește **Titan Embed Text v2** cu **1024 dimensiuni** (model mai nou, mai performant)

---

## Pași de Setup

### 1. Crearea Bucket S3 pentru Vectori

```bash
# Bucket pentru vectori (indexul vectorial)
aws s3api create-bucket \
  --bucket simplu-ai-vectors \
  --region us-east-1

# Bucket pentru documente sursă (dacă nu există deja)
aws s3api create-bucket \
  --bucket simplu-ai-rag-embeddings \
  --region us-east-1
```

### 2. Crearea Index S3 Vectors

```bash
aws s3vectors create-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --dimensions 1024 \
  --embedding-data-type FLOAT32 \
  --region us-east-1
```

**Notă**: 
- `dimensions` trebuie să corespundă cu modelul de embedding ales
- Pentru Titan v2: **1024**
- Pentru Titan v1: **1536**

### 3. Upload Documente în S3 (Sursa de Date)

```bash
# Sync documentele locale către S3
aws s3 sync \
  ./data/kb-documents/dental/ \
  s3://simplu-ai-rag-embeddings/dental/ \
  --region us-east-1
```

### 4. Configurare Rol IAM pentru Bedrock

Creează un rol IAM cu următoarea politică:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::simplu-ai-rag-embeddings",
        "arn:aws:s3:::simplu-ai-rag-embeddings/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3vectors:PutVectors",
        "s3vectors:GetVectors",
        "s3vectors:DeleteVectors",
        "s3vectors:DescribeIndex",
        "s3vectors:SearchVectors"
      ],
      "Resource": [
        "arn:aws:s3vectors:us-east-1:YOUR_ACCOUNT_ID:bucket/simplu-ai-vectors/index/dental-kb-index"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
      ]
    }
  ]
}
```

Creează rol-ul:

```bash
# Creează trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Creează rol
aws iam create-role \
  --role-name BedrockS3VectorsKnowledgeBaseRole \
  --assume-role-policy-document file://trust-policy.json

# Attach politica
aws iam put-role-policy \
  --role-name BedrockS3VectorsKnowledgeBaseRole \
  --policy-name BedrockS3VectorsPolicy \
  --policy-document file://bedrock-s3vectors-policy.json
```

### 5. Crearea Knowledge Base cu S3 Vectors

```bash
aws bedrock-agent create-knowledge-base \
  --name "simplu-dental-kb" \
  --description "Dental clinic knowledge base using S3 Vectors" \
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

**Output important**: Notează `knowledgeBaseId` din răspuns!

### 6. Adăugarea Data Source

```bash
aws bedrock-agent create-data-source \
  --name "dental-documents" \
  --description "Dental knowledge base documents" \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
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

**Output important**: Notează `dataSourceId`!

### 7. Pornirea Ingestion Job (Popularea Vectorilor)

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --data-source-id "YOUR_DATA_SOURCE_ID" \
  --region us-east-1
```

### 8. Verificarea Status-ului Ingestion

```bash
# Listează toate ingestion jobs
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --data-source-id "YOUR_DATA_SOURCE_ID" \
  --region us-east-1

# Verifică status-ul unui job specific
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --data-source-id "YOUR_DATA_SOURCE_ID" \
  --ingestion-job-id "YOUR_JOB_ID" \
  --region us-east-1
```

---

## Metoda Alternativă: Populare Manuală cu s3vectors-embed-cli

Dacă vrei să populezi vectorii **manual** (fără ingestion job):

### Instalare s3vectors-embed-cli

```bash
# Instalează tool-ul AWS Labs
pip install s3vectors-embed-cli
```

### Populare Vectori

```bash
s3vectors-embed put \
  --vector-bucket-name simplu-ai-vectors \
  --index-name dental-kb-index \
  --model-id amazon.titan-embed-text-v2:0 \
  --text "./data/kb-documents/dental/*.json" \
  --metadata '{"businessType": "dental", "version": "1.0.0"}' \
  --max-workers 4 \
  --region us-east-1
```

---

## Actualizarea Datelor

Când actualizezi documentele:

```bash
# 1. Sync documentele noi în S3
aws s3 sync ./data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/

# 2. Pornește un nou ingestion job
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --data-source-id "YOUR_DATA_SOURCE_ID" \
  --region us-east-1
```

---

## Configurare .env

După ce ai creat Knowledge Base, adaugă în `.env`:

```bash
# Bedrock Knowledge Base
BEDROCK_KNOWLEDGE_BASE_ID=YOUR_KNOWLEDGE_BASE_ID
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
```

---

## Avantaje S3 Vectors vs Pinecone/OpenSearch

| Aspect | S3 Vectors | Pinecone | OpenSearch |
|--------|-----------|----------|------------|
| **Cost** | ✅ Foarte ieftin | ❌ Costisitor | ⚠️ Moderat |
| **Setup** | ✅ Simplu (nativ AWS) | ⚠️ Serviciu extern | ❌ Complex |
| **Scalabilitate** | ✅ Automată | ✅ Da | ⚠️ Manual |
| **Integrare Bedrock** | ✅ Nativă | ⚠️ Via API | ⚠️ Via API |
| **Mentenanță** | ✅ Zero | ❌ Necesară | ❌ Necesară |

---

## Comenzi Utile

### Listează toate Knowledge Bases

```bash
aws bedrock-agent list-knowledge-bases --region us-east-1
```

### Obține detalii Knowledge Base

```bash
aws bedrock-agent get-knowledge-base \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --region us-east-1
```

### Listează Data Sources

```bash
aws bedrock-agent list-data-sources \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --region us-east-1
```

### Șterge Knowledge Base

```bash
aws bedrock-agent delete-knowledge-base \
  --knowledge-base-id "YOUR_KNOWLEDGE_BASE_ID" \
  --region us-east-1
```

### Verifică Index S3 Vectors

```bash
aws s3vectors describe-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --region us-east-1
```

---

## Script Complet de Setup

```bash
#!/bin/bash

# Variabile
REGION="us-east-1"
ACCOUNT_ID="YOUR_ACCOUNT_ID"
VECTOR_BUCKET="simplu-ai-vectors"
DATA_BUCKET="simplu-ai-rag-embeddings"
INDEX_NAME="dental-kb-index"
KB_NAME="simplu-dental-kb"
ROLE_NAME="BedrockS3VectorsKnowledgeBaseRole"

# 1. Creează buckets
aws s3api create-bucket --bucket $VECTOR_BUCKET --region $REGION
aws s3api create-bucket --bucket $DATA_BUCKET --region $REGION

# 2. Creează index
aws s3vectors create-index \
  --bucket-arn arn:aws:s3:::$VECTOR_BUCKET \
  --index-name $INDEX_NAME \
  --dimensions 1024 \
  --embedding-data-type FLOAT32 \
  --region $REGION

# 3. Upload documents
aws s3 sync ./data/kb-documents/dental/ s3://$DATA_BUCKET/dental/

# 4. Creează rol IAM (presupunând că ai fișierele de politică)
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name $ROLE_NAME --policy-name BedrockS3VectorsPolicy --policy-document file://bedrock-s3vectors-policy.json

# 5. Creează Knowledge Base
KB_RESPONSE=$(aws bedrock-agent create-knowledge-base \
  --name $KB_NAME \
  --description "Dental clinic knowledge base" \
  --role-arn "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME" \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \
  --storage-configuration '{
    "type": "S3_VECTORS",
    "s3VectorsConfiguration": {
      "vectorBucketArn": "arn:aws:s3:::'$VECTOR_BUCKET'",
      "indexName": "'$INDEX_NAME'"
    }
  }' \
  --region $REGION)

KB_ID=$(echo $KB_RESPONSE | jq -r '.knowledgeBase.knowledgeBaseId')
echo "Knowledge Base ID: $KB_ID"

# 6. Creează Data Source
DS_RESPONSE=$(aws bedrock-agent create-data-source \
  --name "dental-documents" \
  --knowledge-base-id $KB_ID \
  --data-source-configuration '{
    "type": "S3",
    "s3Configuration": {
      "bucketArn": "arn:aws:s3:::'$DATA_BUCKET'",
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
  --region $REGION)

DS_ID=$(echo $DS_RESPONSE | jq -r '.dataSource.dataSourceId')
echo "Data Source ID: $DS_ID"

# 7. Pornește ingestion
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DS_ID \
  --region $REGION

echo ""
echo "Setup complete!"
echo "Knowledge Base ID: $KB_ID"
echo "Data Source ID: $DS_ID"
echo ""
echo "Add to .env:"
echo "BEDROCK_KNOWLEDGE_BASE_ID=$KB_ID"
```

---

## Troubleshooting

### Eroare: "Index not found"

```bash
# Verifică că indexul există
aws s3vectors describe-index \
  --bucket-arn arn:aws:s3:::simplu-ai-vectors \
  --index-name dental-kb-index \
  --region us-east-1
```

### Eroare: "Access Denied"

Verifică că rol-ul IAM are toate permisiunile necesare pentru:
- S3 (read/write pe ambele buckets)
- S3 Vectors (toate operațiunile)
- Bedrock (InvokeModel pentru embedding)

### Ingestion Job Failed

```bash
# Verifică logs
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "YOUR_KB_ID" \
  --data-source-id "YOUR_DS_ID" \
  --ingestion-job-id "YOUR_JOB_ID" \
  --region us-east-1
```

---

## Referințe

- [AWS S3 Vectors Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html)
- [Bedrock Knowledge Bases with S3 Vectors](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-bedrock-kb.html)
- [s3vectors-embed-cli GitHub](https://github.com/awslabs/s3vectors-embed-cli)
- [AWS Blog: Cost-effective RAG with S3 Vectors](https://aws.amazon.com/blogs/machine-learning/building-cost-effective-rag-applications-with-amazon-bedrock-knowledge-bases-and-amazon-s3-vectors/)

