#!/bin/bash

# Script pentru crearea tabelului DynamoDB pentru Eleven Labs Agents
# Usage: ./scripts/create-elevenlabs-agents-table.sh

TABLE_NAME="${DYNAMODB_ELEVENLABS_AGENTS_TABLE:-elevenlabs-agents}"
AWS_REGION="${AWS_REGION:-eu-central-1}"

echo "🔧 Creating DynamoDB table: $TABLE_NAME in region: $AWS_REGION"

aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
    AttributeName=locationId,AttributeType=S \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
    AttributeName=locationId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" \
  --tags Key=Service,Value=ai-agent-server Key=Purpose,Value=elevenlabs-config

if [ $? -eq 0 ]; then
  echo "✅ Table $TABLE_NAME created successfully!"
  echo ""
  echo "📋 Table structure:"
  echo "  - Primary Key (HASH): businessId (String)"
  echo "  - Sort Key (RANGE): locationId (String)"
  echo "  - Billing Mode: PAY_PER_REQUEST"
  echo ""
  echo "📊 Schema:"
  echo "  {
    businessId: string,           // PK
    locationId: string,           // SK
    enabled: boolean,
    agentId: string,              // Eleven Labs agent ID
    voiceId: string,
    greeting: string,
    customPrompt?: string,
    phoneNumber?: string,
    conversationSettings: {
      maxDuration: number,
      recordCalls: boolean,
      sendTranscripts: boolean
    },
    createdAt: string,
    updatedAt: string
  }"
else
  echo "❌ Failed to create table $TABLE_NAME"
  exit 1
fi

