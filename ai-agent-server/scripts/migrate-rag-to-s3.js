/**
 * Script pentru migrarea datelor RAG din DynamoDB în S3
 * pentru folosire cu AWS Bedrock Knowledge Bases
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const DYNAMODB_RAG_TABLE = process.env.DYNAMODB_RAG_TABLE || 'rag-instructions';
const S3_BUCKET_NAME = process.env.RAG_S3_BUCKET || 'simplu-ai-rag-embeddings';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const OUTPUT_DIR = path.join(__dirname, '../data/rag-export');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: AWS_REGION });

/**
 * Fetch all RAG data from DynamoDB
 */
async function fetchRagDataFromDynamoDB() {
  console.log(`📥 Fetching RAG data from DynamoDB table: ${DYNAMODB_RAG_TABLE}`);

  try {
    const command = new ScanCommand({
      TableName: DYNAMODB_RAG_TABLE,
    });

    const response = await docClient.send(command);
    console.log(`✅ Fetched ${response.Items?.length || 0} RAG entries from DynamoDB`);

    return response.Items || [];
  } catch (error) {
    console.error('❌ Error fetching RAG data from DynamoDB:', error);
    throw error;
  }
}

/**
 * Transform RAG data to Knowledge Base format
 */
function transformRagDataToKBFormat(ragItems) {
  console.log('🔄 Transforming RAG data to Knowledge Base format...');

  const transformed = [];

  for (const item of ragItems) {
    // Extract metadata
    const metadata = {
      businessType: item.businessType || 'general',
      role: item.role || 'general',
      category: item.category || 'general',
      ragKey: item.ragKey || 'unknown',
      lastUpdated: item.updatedAt || new Date().toISOString(),
    };

    // Create content from different fields
    let content = '';

    if (item.response) {
      content += `Response: ${item.response}\n\n`;
    }

    if (item.systemInstructions) {
      content += `System Instructions:\n${item.systemInstructions}\n\n`;
    }

    if (item.context) {
      if (typeof item.context === 'string') {
        content += `Context: ${item.context}\n\n`;
      } else {
        content += `Context: ${JSON.stringify(item.context, null, 2)}\n\n`;
      }
    }

    if (item.examples && Array.isArray(item.examples)) {
      content += 'Examples:\n';
      item.examples.forEach((example, idx) => {
        content += `${idx + 1}. ${JSON.stringify(example)}\n`;
      });
      content += '\n';
    }

    if (item.actions && Array.isArray(item.actions)) {
      content += 'Available Actions:\n';
      item.actions.forEach((action, idx) => {
        content += `${idx + 1}. ${JSON.stringify(action)}\n`;
      });
      content += '\n';
    }

    if (content.trim()) {
      transformed.push({
        id: item.ragKey || `${item.businessType}_${item.role}_${Date.now()}`,
        content: content.trim(),
        metadata,
      });
    }
  }

  console.log(`✅ Transformed ${transformed.length} documents for Knowledge Base`);
  return transformed;
}

/**
 * Create S3 bucket if it doesn't exist
 */
async function ensureS3BucketExists() {
  console.log(`🪣 Ensuring S3 bucket exists: ${S3_BUCKET_NAME}`);

  try {
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: S3_BUCKET_NAME,
      })
    );
    console.log(`✅ Created S3 bucket: ${S3_BUCKET_NAME}`);
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou' || error.name === 'BucketAlreadyExists') {
      console.log(`✅ S3 bucket already exists: ${S3_BUCKET_NAME}`);
    } else {
      console.error('❌ Error creating S3 bucket:', error);
      throw error;
    }
  }
}

/**
 * Upload documents to S3
 */
async function uploadDocumentsToS3(documents) {
  console.log(`📤 Uploading ${documents.length} documents to S3...`);

  const uploadPromises = documents.map(async (doc, index) => {
    const key = `rag-documents/${doc.id}.json`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: key,
          Body: JSON.stringify(doc, null, 2),
          ContentType: 'application/json',
          Metadata: {
            ...doc.metadata,
            documentId: doc.id,
          },
        })
      );

      console.log(`  ✓ Uploaded ${index + 1}/${documents.length}: ${key}`);
    } catch (error) {
      console.error(`  ✗ Failed to upload ${key}:`, error.message);
      throw error;
    }
  });

  await Promise.all(uploadPromises);
  console.log(`✅ Successfully uploaded all ${documents.length} documents to S3`);
}

/**
 * Save documents locally as backup
 */
async function saveDocumentsLocally(documents) {
  console.log(`💾 Saving documents locally to: ${OUTPUT_DIR}`);

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Save individual documents
    for (const doc of documents) {
      const filePath = path.join(OUTPUT_DIR, `${doc.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
    }

    // Save all documents in a single file
    const allDocsPath = path.join(OUTPUT_DIR, 'all-documents.json');
    await fs.writeFile(allDocsPath, JSON.stringify(documents, null, 2));

    // Save metadata summary
    const summary = {
      totalDocuments: documents.length,
      businessTypes: [...new Set(documents.map((d) => d.metadata.businessType))],
      roles: [...new Set(documents.map((d) => d.metadata.role))],
      categories: [...new Set(documents.map((d) => d.metadata.category))],
      exportDate: new Date().toISOString(),
    };
    const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ Saved ${documents.length} documents locally`);
    console.log(`   - Individual files: ${OUTPUT_DIR}/`);
    console.log(`   - All documents: ${allDocsPath}`);
    console.log(`   - Summary: ${summaryPath}`);
  } catch (error) {
    console.error('❌ Error saving documents locally:', error);
    throw error;
  }
}

/**
 * Generate Knowledge Base setup instructions
 */
async function generateSetupInstructions(documents) {
  const instructions = `
# Knowledge Base Setup Instructions

## Overview
Migrated ${documents.length} RAG documents from DynamoDB to S3.

## S3 Configuration
- **Bucket**: ${S3_BUCKET_NAME}
- **Region**: ${AWS_REGION}
- **Path**: s3://${S3_BUCKET_NAME}/rag-documents/

## Next Steps

### 1. Create Knowledge Base in AWS Console

\`\`\`bash
aws bedrock-agent create-knowledge-base \\
  --name "simplu-ai-knowledge-base" \\
  --description "RAG knowledge base for Simplu AI Agent" \\
  --role-arn "arn:aws:iam::ACCOUNT_ID:role/AmazonBedrockExecutionRoleForKnowledgeBase" \\
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:${AWS_REGION}::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \\
  --storage-configuration '{
    "type": "OPENSEARCH_SERVERLESS",
    "opensearchServerlessConfiguration": {
      "collectionArn": "arn:aws:aoss:${AWS_REGION}:ACCOUNT_ID:collection/COLLECTION_ID",
      "vectorIndexName": "simplu-ai-rag-index",
      "fieldMapping": {
        "vectorField": "embedding",
        "textField": "content",
        "metadataField": "metadata"
      }
    }
  }'
\`\`\`

### 2. Create Data Source

\`\`\`bash
aws bedrock-agent create-data-source \\
  --knowledge-base-id "KNOWLEDGE_BASE_ID" \\
  --name "rag-s3-source" \\
  --data-source-configuration '{
    "type": "S3",
    "s3Configuration": {
      "bucketArn": "arn:aws:s3:::${S3_BUCKET_NAME}",
      "inclusionPrefixes": ["rag-documents/"]
    }
  }'
\`\`\`

### 3. Sync Data Source

\`\`\`bash
aws bedrock-agent start-ingestion-job \\
  --knowledge-base-id "KNOWLEDGE_BASE_ID" \\
  --data-source-id "DATA_SOURCE_ID"
\`\`\`

### 4. Update Environment Variables

Add to your \`.env\` file:

\`\`\`bash
BEDROCK_KNOWLEDGE_BASE_ID=your_knowledge_base_id
RAG_S3_BUCKET=${S3_BUCKET_NAME}
\`\`\`

## Document Statistics

${JSON.stringify(
  {
    totalDocuments: documents.length,
    businessTypes: [...new Set(documents.map((d) => d.metadata.businessType))],
    roles: [...new Set(documents.map((d) => d.metadata.role))],
    categories: [...new Set(documents.map((d) => d.metadata.category))],
  },
  null,
  2
)}

## Testing

Test Knowledge Base retrieval:

\`\`\`bash
aws bedrock-agent-runtime retrieve \\
  --knowledge-base-id "KNOWLEDGE_BASE_ID" \\
  --retrieval-query "text=Lista de pacienți" \\
  --retrieval-configuration "vectorSearchConfiguration={numberOfResults=5}"
\`\`\`
`;

  const instructionsPath = path.join(OUTPUT_DIR, 'SETUP_INSTRUCTIONS.md');
  await fs.writeFile(instructionsPath, instructions);
  console.log(`📝 Generated setup instructions: ${instructionsPath}`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting RAG migration from DynamoDB to S3...\n');

  try {
    // Step 1: Fetch data from DynamoDB
    const ragItems = await fetchRagDataFromDynamoDB();

    if (ragItems.length === 0) {
      console.log('⚠️ No RAG data found in DynamoDB. Nothing to migrate.');
      return;
    }

    // Step 2: Transform data
    const documents = transformRagDataToKBFormat(ragItems);

    if (documents.length === 0) {
      console.log('⚠️ No valid documents after transformation. Nothing to migrate.');
      return;
    }

    // Step 3: Save locally as backup
    await saveDocumentsLocally(documents);

    // Step 4: Ensure S3 bucket exists
    await ensureS3BucketExists();

    // Step 5: Upload to S3
    await uploadDocumentsToS3(documents);

    // Step 6: Generate setup instructions
    await generateSetupInstructions(documents);

    console.log('\n✅ Migration completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Source: DynamoDB table "${DYNAMODB_RAG_TABLE}"`);
    console.log(`   - Destination: S3 bucket "${S3_BUCKET_NAME}"`);
    console.log(`   - Documents migrated: ${documents.length}`);
    console.log(`   - Local backup: ${OUTPUT_DIR}`);
    console.log(`\n📖 Next steps: Check ${path.join(OUTPUT_DIR, 'SETUP_INSTRUCTIONS.md')}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();

