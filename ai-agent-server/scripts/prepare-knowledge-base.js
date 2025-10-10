/**
 * Script pentru pregătirea datelor Knowledge Base
 * Transformă knowledge-base-data.json în documente individuale
 * optimizate pentru embeddings în AWS Bedrock
 */

const fs = require('fs').promises;
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../data/knowledge-base-data.json');
const OUTPUT_DIR = path.join(__dirname, '../data/kb-documents');

/**
 * Main function
 */
async function prepareKnowledgeBase() {
  console.log('🚀 Starting Knowledge Base preparation...\n');

  try {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);

    // Read input data
    const rawData = await fs.readFile(INPUT_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    let totalDocs = 0;

    // Process each category
    const categories = [
      { key: 'systemInstructions', name: 'System Instructions' },
      { key: 'toolGuidance', name: 'Tool Guidance' },
      { key: 'conversationPatterns', name: 'Conversation Patterns' },
      { key: 'domainKnowledge', name: 'Domain Knowledge' },
    ];

    for (const category of categories) {
      if (data[category.key] && Array.isArray(data[category.key])) {
        console.log(`\n📝 Processing ${category.name}...`);
        const count = await processCategory(data[category.key], category.key);
        totalDocs += count;
        console.log(`✅ Created ${count} documents for ${category.name}`);
      }
    }

    // Create metadata file
    await createMetadataFile(data);

    console.log(`\n\n🎉 SUCCESS! Created ${totalDocs} documents`);
    console.log(`📦 Documents are ready in: ${OUTPUT_DIR}`);
    console.log(`\n📋 Next steps:`);
    console.log(`1. Upload documents to S3:`);
    console.log(`   aws s3 sync ${OUTPUT_DIR} s3://simplu-ai-rag-embeddings/documents/`);
    console.log(`\n2. Create Knowledge Base in AWS Console`);
    console.log(`3. Sync the data source`);
    console.log(`4. Copy Knowledge Base ID to .env`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Process a category of documents
 */
async function processCategory(items, categoryKey) {
  let count = 0;

  for (const item of items) {
    const document = {
      id: item.id,
      content: item.content,
      metadata: {
        category: categoryKey,
        businessType: item.businessType || 'general',
        role: item.role || 'all',
        keywords: (item.keywords || []).join(', '),
        priority: item.priority || 'medium',
        toolName: item.toolName || null,
        scenario: item.scenario || null,
      },
    };

    // Create filename
    const filename = `${item.id}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Write document
    await fs.writeFile(
      filepath,
      JSON.stringify(document, null, 2),
      'utf-8'
    );

    count++;
  }

  return count;
}

/**
 * Create metadata file with all categories and structure
 */
async function createMetadataFile(data) {
  const metadata = {
    version: '1.0.0',
    created: new Date().toISOString(),
    totalDocuments: 0,
    categories: {},
    businessTypes: ['dental', 'gym', 'hotel', 'general'],
    roles: ['operator', 'customer', 'all'],
  };

  // Count documents per category
  const categories = ['systemInstructions', 'toolGuidance', 'conversationPatterns', 'domainKnowledge'];
  
  for (const cat of categories) {
    if (data[cat]) {
      metadata.categories[cat] = data[cat].length;
      metadata.totalDocuments += data[cat].length;
    }
  }

  // Add quick responses info
  if (data.quickResponses) {
    metadata.quickResponses = data.quickResponses.length;
  }

  const filepath = path.join(OUTPUT_DIR, '_metadata.json');
  await fs.writeFile(filepath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  console.log(`\n📊 Metadata created: ${filepath}`);
}

// Run script
prepareKnowledgeBase()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

