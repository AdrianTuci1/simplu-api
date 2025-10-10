#!/bin/bash

# Setup Dental Knowledge Base prin AWS CLI
# IMPORTANT: Configurează variabilele mai jos înainte de a rula

set -e  # Exit on error

echo "🦷 Setting up Dental Knowledge Base via AWS CLI..."

# ========== CONFIGURARE ==========
REGION="us-east-1"
S3_BUCKET="simplu-ai-rag-embeddings"
S3_PREFIX="dental/"
KB_NAME="simplu-dental-kb"
VECTOR_STORE_NAME="simplu-dental-vector-store"

# ⚠️ IMPORTANT: Înlocuiește cu Account ID-ul tău AWS
AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"  # ex: 123456789012

# ========== VERIFICARE AWS CLI ==========
echo ""
echo "📋 Checking AWS CLI configuration..."
aws sts get-caller-identity

if [ $? -ne 0 ]; then
    echo "❌ AWS CLI not configured. Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"

# ========== STEP 1: UPLOAD DOCUMENTE ÎN S3 ==========
echo ""
echo "📤 Step 1: Uploading documents to S3..."

# Generează documente
echo "Generating documents..."
npm run prepare-dental-kb

# Upload în S3
echo "Uploading to S3..."
aws s3 sync data/kb-documents/dental/ s3://${S3_BUCKET}/${S3_PREFIX} \
  --region ${REGION}

# Verifică
FILE_COUNT=$(aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX} --recursive | wc -l)
echo "✅ Uploaded ${FILE_COUNT} files to S3"

# ========== STEP 2: CREEAZĂ OPENSEARCH COLLECTION ==========
echo ""
echo "🔍 Step 2: Creating OpenSearch Serverless collection..."

# Creează collection pentru vectori
COLLECTION_RESPONSE=$(aws opensearchserverless create-collection \
  --name ${VECTOR_STORE_NAME} \
  --type VECTORSEARCH \
  --region ${REGION} \
  --output json)

COLLECTION_ID=$(echo $COLLECTION_RESPONSE | jq -r '.createCollectionDetail.id')
COLLECTION_ARN=$(echo $COLLECTION_RESPONSE | jq -r '.createCollectionDetail.arn')

echo "Collection ID: ${COLLECTION_ID}"
echo "Collection ARN: ${COLLECTION_ARN}"

# Așteaptă ca collection să devină ACTIVE
echo "Waiting for collection to become ACTIVE (this may take 2-5 minutes)..."
while true; do
  STATUS=$(aws opensearchserverless batch-get-collection \
    --ids ${COLLECTION_ID} \
    --region ${REGION} \
    --output json | jq -r '.collectionDetails[0].status')
  
  echo "Status: ${STATUS}"
  
  if [ "$STATUS" = "ACTIVE" ]; then
    break
  fi
  
  sleep 10
done

echo "✅ OpenSearch collection is ACTIVE"

# ========== STEP 3: CREEAZĂ IAM ROLE ==========
echo ""
echo "🔑 Step 3: Creating IAM role for Knowledge Base..."

# Trust policy pentru Bedrock
cat > /tmp/kb-trust-policy.json <<EOF
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

# Creează role
ROLE_NAME="AmazonBedrockExecutionRoleForKB_dental"
aws iam create-role \
  --role-name ${ROLE_NAME} \
  --assume-role-policy-document file:///tmp/kb-trust-policy.json \
  --region ${REGION} || echo "Role already exists"

ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
echo "Role ARN: ${ROLE_ARN}"

# Attach permissions pentru S3
cat > /tmp/kb-permissions.json <<EOF
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
        "arn:aws:s3:::${S3_BUCKET}",
        "arn:aws:s3:::${S3_BUCKET}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:${REGION}::foundation-model/amazon.titan-embed-text-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "aoss:APIAccessAll"
      ],
      "Resource": "${COLLECTION_ARN}"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name ${ROLE_NAME} \
  --policy-name KB-Permissions \
  --policy-document file:///tmp/kb-permissions.json

echo "✅ IAM role configured"

# ========== STEP 4: CREEAZĂ KNOWLEDGE BASE ==========
echo ""
echo "🧠 Step 4: Creating Knowledge Base..."

KB_RESPONSE=$(aws bedrock-agent create-knowledge-base \
  --name "$KB_NAME" \
  --description "Knowledge base pentru clinica dentară cu scheme resurse și instrucțiuni" \
  --role-arn "${ROLE_ARN}" \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:'${REGION}'::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \
  --storage-configuration '{
    "type": "OPENSEARCH_SERVERLESS",
    "opensearchServerlessConfiguration": {
      "collectionArn": "'${COLLECTION_ARN}'",
      "vectorIndexName": "bedrock-knowledge-base-default-index",
      "fieldMapping": {
        "vectorField": "bedrock-knowledge-base-default-vector",
        "textField": "AMAZON_BEDROCK_TEXT_CHUNK",
        "metadataField": "AMAZON_BEDROCK_METADATA"
      }
    }
  }' \
  --region ${REGION} \
  --output json)

KB_ID=$(echo $KB_RESPONSE | jq -r '.knowledgeBase.knowledgeBaseId')
echo "Knowledge Base ID: ${KB_ID}"
echo ""
echo "⚠️  IMPORTANT: Add this to your .env file:"
echo "BEDROCK_KNOWLEDGE_BASE_ID=${KB_ID}"
echo ""

# ========== STEP 5: CREEAZĂ DATA SOURCE ==========
echo ""
echo "📊 Step 5: Creating data source..."

DS_RESPONSE=$(aws bedrock-agent create-data-source \
  --knowledge-base-id "$KB_ID" \
  --name "dental-documents-s3" \
  --description "S3 data source cu documente dental KB" \
  --data-source-configuration '{
    "type": "S3",
    "s3Configuration": {
      "bucketArn": "arn:aws:s3:::'${S3_BUCKET}'",
      "inclusionPrefixes": ["'${S3_PREFIX}'"]
    }
  }' \
  --vector-ingestion-configuration '{
    "chunkingConfiguration": {
      "chunkingStrategy": "FIXED_SIZE",
      "fixedSizeChunkingConfiguration": {
        "maxTokens": 300,
        "overlapPercentage": 20
      }
    }
  }' \
  --region ${REGION} \
  --output json)

DS_ID=$(echo $DS_RESPONSE | jq -r '.dataSource.dataSourceId')
echo "Data Source ID: ${DS_ID}"

# ========== STEP 6: SYNC DATA SOURCE (Populează Vector Store!) ==========
echo ""
echo "🔄 Step 6: Starting ingestion job (this populates the vector store)..."

INGESTION_RESPONSE=$(aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --region ${REGION} \
  --output json)

INGESTION_JOB_ID=$(echo $INGESTION_RESPONSE | jq -r '.ingestionJob.ingestionJobId')
echo "Ingestion Job ID: ${INGESTION_JOB_ID}"
echo ""
echo "⏳ Waiting for ingestion to complete..."

# Poll pentru status
while true; do
  STATUS=$(aws bedrock-agent get-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --ingestion-job-id "$INGESTION_JOB_ID" \
    --region ${REGION} \
    --output json | jq -r '.ingestionJob.status')
  
  echo "Status: ${STATUS}"
  
  if [ "$STATUS" = "COMPLETE" ]; then
    echo "✅ Ingestion completed successfully!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ Ingestion failed!"
    aws bedrock-agent get-ingestion-job \
      --knowledge-base-id "$KB_ID" \
      --data-source-id "$DS_ID" \
      --ingestion-job-id "$INGESTION_JOB_ID" \
      --region ${REGION}
    exit 1
  fi
  
  sleep 10
done

# ========== VERIFICARE FINALĂ ==========
echo ""
echo "✅ ========== SETUP COMPLETE =========="
echo ""
echo "📋 Summary:"
echo "  Knowledge Base ID: ${KB_ID}"
echo "  Data Source ID: ${DS_ID}"
echo "  S3 Path: s3://${S3_BUCKET}/${S3_PREFIX}"
echo "  Vector Store: ${VECTOR_STORE_NAME}"
echo "  Region: ${REGION}"
echo ""
echo "📝 Add to your .env file:"
echo "  BEDROCK_KNOWLEDGE_BASE_ID=${KB_ID}"
echo ""
echo "🧪 Test your Knowledge Base:"
echo "  aws bedrock-agent-runtime retrieve \\"
echo "    --knowledge-base-id ${KB_ID} \\"
echo "    --retrieval-query '{\"text\": \"La ce oră deschideți luni?\"}' \\"
echo "    --region ${REGION}"
echo ""
echo "🚀 Ready to use!"

