#!/bin/bash

# Script pentru verificarea statusului ingestion job-ului

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
  echo "Usage: $0 <knowledge-base-id> <data-source-id> [ingestion-job-id]"
  echo ""
  echo "Examples:"
  echo "  # Check latest ingestion job"
  echo "  $0 KB123456 DS123456"
  echo ""
  echo "  # Check specific ingestion job"
  echo "  $0 KB123456 DS123456 IJ123456"
  exit 1
fi

KB_ID=$1
DS_ID=$2
INGESTION_JOB_ID=${3:-""}
REGION="${AWS_REGION:-us-east-1}"

log_info "Checking ingestion status..."
echo "  Knowledge Base: $KB_ID"
echo "  Data Source: $DS_ID"
echo "  Region: $REGION"
echo ""

# Dacă nu e specificat job ID, ia cel mai recent
if [ -z "$INGESTION_JOB_ID" ]; then
  log_info "Getting latest ingestion job..."
  JOBS_RESPONSE=$(aws bedrock-agent list-ingestion-jobs \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --max-results 1 \
    --region "$REGION")
  
  INGESTION_JOB_ID=$(echo "$JOBS_RESPONSE" | jq -r '.ingestionJobSummaries[0].ingestionJobId')
  
  if [ "$INGESTION_JOB_ID" = "null" ] || [ -z "$INGESTION_JOB_ID" ]; then
    log_error "No ingestion jobs found"
    exit 1
  fi
  
  log_info "Latest job ID: $INGESTION_JOB_ID"
  echo ""
fi

# Get job details
JOB_RESPONSE=$(aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --ingestion-job-id "$INGESTION_JOB_ID" \
  --region "$REGION")

STATUS=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.status')
STARTED_AT=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.startedAt')
UPDATED_AT=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.updatedAt')

# Statistics
DOCUMENTS_SCANNED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsScanned // 0')
DOCUMENTS_MODIFIED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfModifiedDocumentsIndexed // 0')
DOCUMENTS_DELETED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsDeleted // 0')
DOCUMENTS_FAILED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfDocumentsFailed // 0')

# Failure reasons (if any)
FAILURE_REASONS=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.failureReasons[]? // empty')

echo "=========================================="
echo "📊 Ingestion Job Status"
echo "=========================================="
echo ""
echo "Job ID: $INGESTION_JOB_ID"
echo "Status: $STATUS"
echo "Started: $STARTED_AT"
echo "Updated: $UPDATED_AT"
echo ""
echo "📈 Statistics:"
echo "  Documents Scanned: $DOCUMENTS_SCANNED"
echo "  Documents Indexed: $DOCUMENTS_MODIFIED"
echo "  Documents Deleted: $DOCUMENTS_DELETED"
echo "  Documents Failed: $DOCUMENTS_FAILED"
echo ""

# Status based message
case "$STATUS" in
  "IN_PROGRESS")
    log_warning "Ingestion is still in progress..."
    echo ""
    echo "💡 Tip: Re-run this script to check again"
    echo "   $0 $KB_ID $DS_ID $INGESTION_JOB_ID"
    ;;
  "COMPLETE")
    log_success "Ingestion completed successfully!"
    echo ""
    echo "✅ Knowledge Base is ready to use!"
    echo ""
    echo "🔍 Test with:"
    echo "aws bedrock-agent-runtime retrieve \\"
    echo "  --knowledge-base-id $KB_ID \\"
    echo "  --retrieval-query '{\"text\": \"What are the working hours?\"}' \\"
    echo "  --region $REGION"
    ;;
  "FAILED")
    log_error "Ingestion failed!"
    if [ -n "$FAILURE_REASONS" ]; then
      echo ""
      echo "Failure Reasons:"
      echo "$FAILURE_REASONS"
    fi
    echo ""
    echo "🔍 Check CloudWatch logs for more details"
    exit 1
    ;;
  "STARTING")
    log_info "Ingestion is starting..."
    ;;
  *)
    log_warning "Unknown status: $STATUS"
    ;;
esac

echo ""

# Monitor in real-time option
if [ "$STATUS" = "IN_PROGRESS" ] || [ "$STATUS" = "STARTING" ]; then
  echo ""
  read -p "Monitor in real-time? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Monitoring... (Press Ctrl+C to stop)"
    while true; do
      sleep 5
      JOB_RESPONSE=$(aws bedrock-agent get-ingestion-job \
        --knowledge-base-id "$KB_ID" \
        --data-source-id "$DS_ID" \
        --ingestion-job-id "$INGESTION_JOB_ID" \
        --region "$REGION")
      
      STATUS=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.status')
      DOCUMENTS_MODIFIED=$(echo "$JOB_RESPONSE" | jq -r '.ingestionJob.statistics.numberOfModifiedDocumentsIndexed // 0')
      
      echo -ne "\r⏳ Status: $STATUS | Indexed: $DOCUMENTS_MODIFIED documents     "
      
      if [ "$STATUS" = "COMPLETE" ]; then
        echo ""
        log_success "Ingestion completed!"
        break
      elif [ "$STATUS" = "FAILED" ]; then
        echo ""
        log_error "Ingestion failed!"
        break
      fi
    done
  fi
fi

echo ""

