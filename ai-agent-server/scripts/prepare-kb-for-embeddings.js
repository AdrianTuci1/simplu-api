#!/usr/bin/env node

/**
 * Script pentru pregătirea Knowledge Base-ului pentru embeddings AWS Bedrock
 * 
 * Convertește documentele JSON în format text optimizat pentru embeddings semantice
 * și salvează LOCAL pentru a fi folosite ulterior la orice vector DB / Bedrock
 * 
 * Usage: 
 *   node scripts/prepare-kb-for-embeddings.js
 *
 * Output:
 *   - Creează directorul data/kb-documents-embeddings cu fișiere JSON optimizate
 */

const fs = require('fs');
const path = require('path');
// (Fără dependențe AWS - doar pregătire locală)

// Configurare
const DENTAL_DIR = path.join(__dirname, '../data/kb-documents/dental');
const OUTPUT_DIR = path.join(__dirname, '../data/kb-documents-embeddings');
// Doar local

console.log('🔧 Configurare:');
console.log(`  Input Dir: ${DENTAL_DIR}`);
console.log(`  Output Dir: ${OUTPUT_DIR}\n`);

// Asigură-te că directorul de output există
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convertește un document JSON în format text optimizat pentru embeddings
 */
function convertToEmbeddingFormat(doc) {
  const { id, title, content, metadata } = doc;
  
  // Parse content dacă e string JSON
  let parsedContent = content;
  if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // Keep as string if parsing fails
    }
  }

  // Build text content optimizat pentru semantic search
  let textContent = `# ${title}\n\n`;
  
  // Add metadata ca context
  textContent += `**Document Type:** ${metadata.type}\n`;
  if (metadata.role) textContent += `**Role:** ${metadata.role}\n`;
  if (metadata.resourceType) textContent += `**Resource Type:** ${metadata.resourceType}\n`;
  if (metadata.category) textContent += `**Category:** ${metadata.category}\n`;
  textContent += `**Business Type:** ${metadata.businessType}\n\n`;
  textContent += `---\n\n`;

  // Convert content to readable text
  if (typeof parsedContent === 'string') {
    textContent += parsedContent;
  } else if (typeof parsedContent === 'object') {
    textContent += formatObjectAsText(parsedContent);
  }

  return {
    id,
    title,
    text: textContent,
    metadata: {
      ...metadata,
      documentId: id,
      source: 'dental-knowledge-base'
    }
  };
}

/**
 * Formatează un object JSON ca text readable pentru embeddings
 */
function formatObjectAsText(obj, indent = 0) {
  let result = '';
  const spaces = '  '.repeat(indent);

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'object') {
        result += `${spaces}${index + 1}. ${formatObjectAsText(item, indent + 1)}\n`;
      } else {
        result += `${spaces}- ${item}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      // Format key as readable header
      const readableKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();

      if (typeof value === 'object' && value !== null) {
        result += `\n${spaces}**${readableKey}:**\n`;
        result += formatObjectAsText(value, indent + 1);
      } else if (Array.isArray(value)) {
        result += `\n${spaces}**${readableKey}:**\n`;
        result += formatObjectAsText(value, indent + 1);
      } else {
        result += `${spaces}**${readableKey}:** ${value}\n`;
      }
    }
  }

  return result;
}

// (Fără funcții de upload sau verificări S3)

/**
 * Main function
 */
async function main() {
  console.log('📖 Step 1: Reading documents from dental directory...\n');

  // Read index file
  const indexPath = path.join(DENTAL_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Error: index.json not found!');
    console.error('   Run: node scripts/split-knowledge-base.js first\n');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  console.log(`Found ${index.totalDocuments} documents\n`);

  console.log('🔄 Step 2: Converting documents to embedding format...\n');

  const convertedDocs = [];
  let successCount = 0;
  let errorCount = 0;

  for (const docRef of index.documents) {
    try {
      const docPath = path.join(DENTAL_DIR, docRef.file);
      const doc = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
      
      const converted = convertToEmbeddingFormat(doc);
      convertedDocs.push(converted);
      
      // Save locally
      const outputFile = path.join(OUTPUT_DIR, docRef.file);
      fs.writeFileSync(outputFile, JSON.stringify(converted, null, 2), 'utf-8');
      
      console.log(`  ✓ ${docRef.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ ${docRef.id}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Converted ${successCount} documents (${errorCount} errors)\n`);

  // Create master index
  const masterIndex = {
    version: index.version,
    businessType: index.businessType,
    lastUpdated: index.lastUpdated,
    preparedAt: new Date().toISOString(),
    totalDocuments: convertedDocs.length,
    documents: convertedDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      metadata: doc.metadata
    }))
  };

  const masterIndexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(masterIndexPath, JSON.stringify(masterIndex, null, 2), 'utf-8');
  console.log(`✓ Created master index: ${masterIndexPath}\n`);

  console.log('\n✅ Done! Local documents are ready for embeddings.\n');

  // Print statistics
  console.log('📊 Statistics:');
  console.log(`  Total documents: ${convertedDocs.length}`);
  console.log(`  Local output: ${OUTPUT_DIR}\n`);

  // Document types breakdown
  const typeStats = {};
  convertedDocs.forEach(doc => {
    const type = doc.metadata.type;
    typeStats[type] = (typeStats[type] || 0) + 1;
  });

  console.log('Documents by type:');
  Object.entries(typeStats).sort().forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  // Next steps (local): poți folosi fișierele din OUTPUT_DIR pentru orice vector DB
  console.log('\n📋 Next Steps (Local):');
  console.log('1. Importă JSON-urile din directorul de output în vector DB-ul ales.');
  console.log('2. Folosește câmpul "text" pentru generarea embeddings și "metadata" pentru filtre.');
  console.log('3. Păstrează index.json pentru analytics și verificări.');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

