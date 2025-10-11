#!/bin/bash

# Script pentru sincronizarea documentelor și reprocesarea Knowledge Base

set -e

# Culori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verifică parametri
if [ $# -lt 2 ]; then
  echo "Usage: $0 <knowledge-base-id> <data-source-id> [options]"
  echo ""
  echo "Options:"
  echo "  --skip-sync    Skip S3 sync, only trigger ingestion"
  echo ""
  echo "Example:"
  echo "  $0 KB123456 DS123456"
  echo "  $0 KB123456 DS123456 --skip-sync"
  exit 1
fi

KB_ID=$1
DS_ID=$2
SKIP_SYNC=${3:-""}
REGION="${AWS_REGION:-us-east-1}"
DATA_BUCKET="${DATA_BUCKET:-simplu-ai-rag-embeddings}"

log_info "📦 Knowledge Base Document Sync"
echo ""
echo "  Knowledge Base: $KB_ID"
echo "  Data Source: $DS_ID"
echo "  Region: $REGION"
echo "  Data Bucket: $DATA_BUCKET"
echo ""

# Step 1: Regenerate documents
log_info "Step 1/4: Regenerating knowledge base documents..."
if [ -f "./scripts/prepare-dental-kb.js" ]; then
  node ./scripts/prepare-dental-kb.js
  log_success "Documents regenerated"
else
  log_error "Script prepare-dental-kb.js not found!"
  exit 1
fi
echo ""

# Step 2: Sync to S3 (unless skipped)
if [ "$SKIP_SYNC" != "--skip-sync" ]; then
  log_info "Step 2/4: Syncing documents to S3..."
  if [ -d "./data/kb-documents/dental" ]; then
    FILE_COUNT_BEFORE=$(aws s3 ls "s3://$DATA_BUCKET/dental/" --recursive 2>/dev/null | wc -l || echo "0")
    
    aws s3 sync ./data/kb-documents/dental/ "s3://$DATA_BUCKET/dental/" \
      --region "$REGION" \
      --delete
    
    FILE_COUNT_AFTER=$(aws s3 ls "s3://$DATA_BUCKET/dental/" --recursive | wc -l)
    
    log_success "S3 sync complete"
    echo "  Files before: $FILE_COUNT_BEFORE"
    echo "  Files after: $FILE_COUNT_AFTER"
  else
    log_error "Directory ./data/kb-documents/dental not found!"
    exit 1
  fi
else
  log_warning "Step 2/4: Skipping S3 sync (--skip-sync flag)"
fi
echo ""

# Step 3: Start ingestion job
log_info "Step 3/4: Starting ingestion job..."
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

# Step 4: Monitor status
log_info "Step 4/4: Monitoring ingestion status..."
echo ""

WAIT_TIME=0
MAX_WAIT=300  # 5 minutes

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  JOB_RESPONSE=$(aws bedrock-agent get-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --ingestion-job-id "$INGESTION_JOB_ID" \
    --region "$REGION")
  
  STATUS=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.status')
  DOCUMENTS_MODIFIED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfModifiedDocumentsIndexed // 0')
  DOCUMENTS_SCANNED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsScanned // 0')
  
  echo -ne "\r⏳ Status: $STATUS | Scanned: $DOCUMENTS_SCANNED | Indexed: $DOCUMENTS_MODIFIED     "
  
  if [ "$STATUS" = "COMPLETE" ]; then
    echo ""
    log_success "Ingestion completed successfully!"
    
    DOCUMENTS_DELETED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsDeleted // 0')
    DOCUMENTS_FAILED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsFailed // 0')
    
    echo ""
    echo "📊 Final Statistics:"
    echo "  Documents Scanned: $DOCUMENTS_SCANNED"
    echo "  Documents Indexed: $DOCUMENTS_MODIFIED"
    echo "  Documents Deleted: $DOCUMENTS_DELETED"
    echo "  Documents Failed: $DOCUMENTS_FAILED"
    echo ""
    
    if [ "$DOCUMENTS_FAILED" -gt 0 ]; then
      log_warning "Some documents failed to index. Check CloudWatch logs for details."
    fi
    
    log_success "✅ Knowledge Base is now updated and ready to use!"
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    log_error "Ingestion failed!"
    
    FAILURE_REASONS=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.failureReasons[]? // empty')
    if [ -n "$FAILURE_REASONS" ]; then
      echo ""
      echo "Failure Reasons:"
      echo "$FAILURE_REASONS"
    fi
    exit 1
  fi
  
  sleep 5
  WAIT_TIME=$((WAIT_TIME + 5))
done

echo ""
log_warning "Ingestion is taking longer than expected (>5 minutes)"
echo ""
echo "Check status manually:"
echo "./scripts/check-ingestion-status.sh $KB_ID $DS_ID $INGESTION_JOB_ID"
echo ""

