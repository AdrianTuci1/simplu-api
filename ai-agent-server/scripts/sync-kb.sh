#!/bin/bash

# Sync simplu pentru Knowledge Base existent
# Folosește când updatezi documente în S3

set -e

echo "🔄 Syncing Knowledge Base with S3..."

# ========== CONFIGURARE ==========
# ⚠️ Completează aceste valori:
KB_ID="${BEDROCK_KNOWLEDGE_BASE_ID:-}"  # Sau pune direct ID-ul aici
DS_ID=""  # Data Source ID (găsești cu list-data-sources)
REGION="us-east-1"

# ========== VERIFICARE ==========
if [ -z "$KB_ID" ]; then
    echo "❌ Error: Knowledge Base ID is required"
    echo "Set BEDROCK_KNOWLEDGE_BASE_ID in .env or edit this script"
    exit 1
fi

if [ -z "$DS_ID" ]; then
    echo "📋 Listing data sources to find DS_ID..."
    aws bedrock-agent list-data-sources \
      --knowledge-base-id "$KB_ID" \
      --region ${REGION}
    
    echo ""
    echo "⚠️  Copy Data Source ID from above and set DS_ID in this script"
    exit 1
fi

# ========== UPLOAD DOCUMENTE ==========
echo ""
echo "📤 Step 1: Generating and uploading documents to S3..."

# Generează documente fresh
npm run prepare-dental-kb

# Upload
aws s3 sync data/kb-documents/dental/ s3://simplu-ai-rag-embeddings/dental/ \
  --delete \
  --region ${REGION}

echo "✅ Documents uploaded"

# ========== START INGESTION ==========
echo ""
echo "🔄 Step 2: Starting ingestion job..."

INGESTION_RESPONSE=$(aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --region ${REGION} \
  --output json)

INGESTION_JOB_ID=$(echo $INGESTION_RESPONSE | jq -r '.ingestionJob.ingestionJobId')
echo "Ingestion Job ID: ${INGESTION_JOB_ID}"

# ========== WAIT FOR COMPLETION ==========
echo ""
echo "⏳ Waiting for ingestion to complete..."

while true; do
  STATUS=$(aws bedrock-agent get-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --ingestion-job-id "$INGESTION_JOB_ID" \
    --region ${REGION} \
    --output json | jq -r '.ingestionJob.status')
  
  echo "  Status: ${STATUS}"
  
  if [ "$STATUS" = "COMPLETE" ]; then
    echo "✅ Sync completed successfully!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ Sync failed!"
    aws bedrock-agent get-ingestion-job \
      --knowledge-base-id "$KB_ID" \
      --data-source-id "$DS_ID" \
      --ingestion-job-id "$INGESTION_JOB_ID" \
      --region ${REGION}
    exit 1
  fi
  
  sleep 10
done

# ========== VERIFICARE ==========
echo ""
echo "✅ Knowledge Base synced successfully!"
echo ""
echo "🧪 Test with:"
echo "aws bedrock-agent-runtime retrieve \\"
echo "  --knowledge-base-id ${KB_ID} \\"
echo "  --retrieval-query '{\"text\": \"La ce oră deschideți?\"}' \\"
echo "  --region ${REGION}"

