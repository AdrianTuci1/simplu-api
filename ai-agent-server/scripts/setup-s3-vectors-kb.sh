#!/bin/bash

# Script automat pentru setup Bedrock Knowledge Base cu S3 Vectors
# Fără Pinecone sau OpenSearch - soluție nativă AWS

set -e

# Culori pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funcție pentru log
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Verifică că jq este instalat
if ! command -v jq &> /dev/null; then
  log_error "jq nu este instalat. Instalează cu: brew install jq (MacOS) sau apt-get install jq (Linux)"
  exit 1
fi

# Variabile
REGION="${AWS_REGION:-us-east-1}"
VECTOR_BUCKET="${VECTOR_BUCKET:-simplu-ai-vectors}"
DATA_BUCKET="${DATA_BUCKET:-simplu-ai-rag-embeddings}"
INDEX_NAME="${INDEX_NAME:-dental-kb-index}"
KB_NAME="${KB_NAME:-simplu-dental-kb}"
ROLE_NAME="${ROLE_NAME:-BedrockS3VectorsKnowledgeBaseRole}"
DATA_SOURCE_NAME="dental-documents"
EMBEDDING_MODEL="amazon.titan-embed-text-v2:0"
VECTOR_DIMENSIONS=1024

log_info "🚀 Starting AWS Bedrock Knowledge Base setup with S3 Vectors..."
echo ""
log_info "Configuration:"
echo "  Region: $REGION"
echo "  Vector Bucket: $VECTOR_BUCKET"
echo "  Data Bucket: $DATA_BUCKET"
echo "  Index Name: $INDEX_NAME"
echo "  KB Name: $KB_NAME"
echo "  Embedding Model: $EMBEDDING_MODEL"
echo "  Vector Dimensions: $VECTOR_DIMENSIONS"
echo ""

# Get AWS Account ID
log_info "Getting AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "Account ID: $ACCOUNT_ID"
echo ""

# 1. Creează Vector Bucket (dacă nu există)
log_info "Step 1/8: Creating vector bucket..."
if aws s3api head-bucket --bucket "$VECTOR_BUCKET" 2>/dev/null; then
  log_warning "Bucket $VECTOR_BUCKET already exists"
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$VECTOR_BUCKET" --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$VECTOR_BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  log_success "Vector bucket created: $VECTOR_BUCKET"
fi
echo ""

# 2. Creează Data Bucket (dacă nu există)
log_info "Step 2/8: Creating data bucket..."
if aws s3api head-bucket --bucket "$DATA_BUCKET" 2>/dev/null; then
  log_warning "Bucket $DATA_BUCKET already exists"
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$DATA_BUCKET" --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$DATA_BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  log_success "Data bucket created: $DATA_BUCKET"
fi
echo ""

# 3. Upload documents to S3
log_info "Step 3/8: Uploading documents to S3..."
if [ -d "./data/kb-documents/dental" ]; then
  aws s3 sync ./data/kb-documents/dental/ "s3://$DATA_BUCKET/dental/" --region "$REGION"
  FILE_COUNT=$(aws s3 ls "s3://$DATA_BUCKET/dental/" --recursive | wc -l)
  log_success "Uploaded documents: $FILE_COUNT files"
else
  log_error "Directory ./data/kb-documents/dental not found!"
  exit 1
fi
echo ""

# 4. Creează S3 Vector Index
log_info "Step 4/8: Creating S3 Vector Index..."
INDEX_EXISTS=$(aws s3vectors describe-index \
  --bucket-arn "arn:aws:s3:::$VECTOR_BUCKET" \
  --index-name "$INDEX_NAME" \
  --region "$REGION" 2>/dev/null || echo "not_found")

if [ "$INDEX_EXISTS" = "not_found" ]; then
  aws s3vectors create-index \
    --bucket-arn "arn:aws:s3:::$VECTOR_BUCKET" \
    --index-name "$INDEX_NAME" \
    --dimensions "$VECTOR_DIMENSIONS" \
    --embedding-data-type FLOAT32 \
    --region "$REGION"
  log_success "Vector index created: $INDEX_NAME"
else
  log_warning "Vector index $INDEX_NAME already exists"
fi
echo ""

# 5. Creează IAM Role
log_info "Step 5/8: Creating IAM Role..."

# Trust policy
cat > /tmp/trust-policy.json <<EOF
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

# Role policy
cat > /tmp/bedrock-s3vectors-policy.json <<EOF
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
        "arn:aws:s3:::$DATA_BUCKET",
        "arn:aws:s3:::$DATA_BUCKET/*"
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
        "arn:aws:s3vectors:$REGION:$ACCOUNT_ID:bucket/$VECTOR_BUCKET/index/$INDEX_NAME"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:$REGION::foundation-model/$EMBEDDING_MODEL"
      ]
    }
  ]
}
EOF

# Check if role exists
ROLE_EXISTS=$(aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null || echo "not_found")

if [ "$ROLE_EXISTS" = "not_found" ]; then
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/trust-policy.json
  
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name BedrockS3VectorsPolicy \
    --policy-document file:///tmp/bedrock-s3vectors-policy.json
  
  log_success "IAM Role created: $ROLE_NAME"
  log_warning "Waiting 10 seconds for IAM role propagation..."
  sleep 10
else
  log_warning "IAM Role $ROLE_NAME already exists, updating policy..."
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name BedrockS3VectorsPolicy \
    --policy-document file:///tmp/bedrock-s3vectors-policy.json
fi
echo ""

# 6. Creează Knowledge Base
log_info "Step 6/8: Creating Knowledge Base..."
KB_RESPONSE=$(aws bedrock-agent create-knowledge-base \
  --name "$KB_NAME" \
  --description "Dental clinic knowledge base using S3 Vectors" \
  --role-arn "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME" \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:'$REGION'::foundation-model/'$EMBEDDING_MODEL'"
    }
  }' \
  --storage-configuration '{
    "type": "S3_VECTORS",
    "s3VectorsConfiguration": {
      "vectorBucketArn": "arn:aws:s3:::'$VECTOR_BUCKET'",
      "indexName": "'$INDEX_NAME'"
    }
  }' \
  --region "$REGION" 2>&1)

if echo "$KB_RESPONSE" | grep -q "error"; then
  log_error "Failed to create Knowledge Base:"
  echo "$KB_RESPONSE"
  exit 1
fi

KB_ID=$(echo "$KB_RESPONSE" | jq -r '.knowledgeBase.knowledgeBaseId')
log_success "Knowledge Base created: $KB_ID"
echo ""

# 7. Creează Data Source
log_info "Step 7/8: Creating Data Source..."
DS_RESPONSE=$(aws bedrock-agent create-data-source \
  --name "$DATA_SOURCE_NAME" \
  --description "Dental knowledge base documents from S3" \
  --knowledge-base-id "$KB_ID" \
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
  --region "$REGION" 2>&1)

if echo "$DS_RESPONSE" | grep -q "error"; then
  log_error "Failed to create Data Source:"
  echo "$DS_RESPONSE"
  exit 1
fi

DS_ID=$(echo "$DS_RESPONSE" | jq -r '.dataSource.dataSourceId')
log_success "Data Source created: $DS_ID"
echo ""

# 8. Start Ingestion Job
log_info "Step 8/8: Starting ingestion job..."
INGESTION_RESPONSE=$(aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --region "$REGION" 2>&1)

if echo "$INGESTION_RESPONSE" | grep -q "error"; then
  log_error "Failed to start ingestion job:"
  echo "$INGESTION_RESPONSE"
  exit 1
fi

INGESTION_JOB_ID=$(echo "$INGESTION_RESPONSE" | jq -r '.ingestionJob.ingestionJobId')
log_success "Ingestion job started: $INGESTION_JOB_ID"
echo ""

# Cleanup temp files
rm -f /tmp/trust-policy.json /tmp/bedrock-s3vectors-policy.json

# Summary
echo ""
echo "=========================================="
log_success "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Configuration Details:"
echo "  Knowledge Base ID: $KB_ID"
echo "  Data Source ID: $DS_ID"
echo "  Ingestion Job ID: $INGESTION_JOB_ID"
echo "  Region: $REGION"
echo ""
echo "📝 Add to your .env file:"
echo ""
echo "BEDROCK_KNOWLEDGE_BASE_ID=$KB_ID"
echo "BEDROCK_REGION=$REGION"
echo "BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0"
echo "BEDROCK_EMBEDDING_MODEL_ID=$EMBEDDING_MODEL"
echo ""
echo "🔍 Monitor ingestion job:"
echo "aws bedrock-agent get-ingestion-job \\"
echo "  --knowledge-base-id $KB_ID \\"
echo "  --data-source-id $DS_ID \\"
echo "  --ingestion-job-id $INGESTION_JOB_ID \\"
echo "  --region $REGION"
echo ""
echo "✅ Ingestion typically takes 2-5 minutes"
echo ""

