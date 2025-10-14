#!/usr/bin/env node

/**
 * Script pentru împărțirea dental-knowledge-base.json în multiple fișiere JSON
 * pentru indexare în baza de date vectorială
 * 
 * Usage: node scripts/split-knowledge-base.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../data/dental-knowledge-base.json');
const OUTPUT_DIR = path.join(__dirname, '../data/kb-documents/dental');

// Asigură-te că directorul de output există
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📖 Citesc dental-knowledge-base.json...');
const knowledgeBase = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

const documents = [];

// Helper function pentru salvarea documentelor
function createDocument(id, title, content, metadata = {}) {
  return {
    id,
    title,
    content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    metadata: {
      businessType: knowledgeBase.businessType,
      version: knowledgeBase.version,
      lastUpdated: knowledgeBase.lastUpdated,
      ...metadata
    }
  };
}

console.log('📋 Procesez secțiunile...\n');

// 1. System Instructions - Operator
console.log('  ✓ System Instructions - Operator');
documents.push(createDocument(
  'dental-system-instructions-operator',
  'System Instructions - Operator',
  knowledgeBase.systemInstructions.operator.instructions,
  {
    type: 'system-instructions',
    role: 'operator',
    capabilities: knowledgeBase.systemInstructions.operator.capabilities,
    communicationStyle: knowledgeBase.systemInstructions.operator.communicationStyle
  }
));

// 2. System Instructions - Customer
console.log('  ✓ System Instructions - Customer');
documents.push(createDocument(
  'dental-system-instructions-customer',
  'System Instructions - Customer',
  knowledgeBase.systemInstructions.customer.instructions,
  {
    type: 'system-instructions',
    role: 'customer',
    capabilities: knowledgeBase.systemInstructions.customer.capabilities,
    communicationStyle: knowledgeBase.systemInstructions.customer.communicationStyle
  }
));

// 3. Resource Structure
console.log('  ✓ Resource Structure');
documents.push(createDocument(
  'dental-resource-structure',
  'Resource Structure - Base Resource',
  knowledgeBase.resourceStructure.baseResource,
  {
    type: 'resource-structure'
  }
));

// 4. Resource Types - fiecare tip de resursă separat
const resourceTypes = Object.keys(knowledgeBase.resourceTypes);
console.log(`  ✓ Resource Types (${resourceTypes.length} types)`);

resourceTypes.forEach(resourceType => {
  const resource = knowledgeBase.resourceTypes[resourceType];
  documents.push(createDocument(
    `dental-resource-${resourceType}`,
    `Resource Type: ${resource.displayName || resourceType}`,
    resource,
    {
      type: 'resource-type',
      resourceType: resourceType,
      displayName: resource.displayName
    }
  ));
});

// 5. Context Usage
console.log('  ✓ Context Usage');
documents.push(createDocument(
  'dental-context-usage',
  'Context Usage - userId and Frontend Context',
  knowledgeBase.contextUsage,
  {
    type: 'context-usage'
  }
));

// 6. Query Examples - fiecare exemplu separat
const queryExamples = Object.keys(knowledgeBase.queryExamples);
console.log(`  ✓ Query Examples (${queryExamples.length} examples)`);

queryExamples.forEach(exampleKey => {
  const example = knowledgeBase.queryExamples[exampleKey];
  documents.push(createDocument(
    `dental-query-example-${exampleKey}`,
    `Query Example: ${example.description}`,
    example,
    {
      type: 'query-example',
      exampleKey: exampleKey
    }
  ));
});

// 7. Conversation Patterns - fiecare pattern separat
const conversationPatterns = Object.keys(knowledgeBase.conversationPatterns);
console.log(`  ✓ Conversation Patterns (${conversationPatterns.length} patterns)`);

conversationPatterns.forEach(patternKey => {
  const pattern = knowledgeBase.conversationPatterns[patternKey];
  documents.push(createDocument(
    `dental-conversation-pattern-${patternKey}`,
    `Conversation Pattern: ${pattern.scenario}`,
    pattern,
    {
      type: 'conversation-pattern',
      patternKey: patternKey,
      scenario: pattern.scenario
    }
  ));
});

// 8. Terminology
console.log('  ✓ Terminology');
documents.push(createDocument(
  'dental-terminology-medical',
  'Terminology - Medical Terms',
  knowledgeBase.terminology.medical,
  {
    type: 'terminology',
    category: 'medical'
  }
));

documents.push(createDocument(
  'dental-terminology-status',
  'Terminology - Status Terms',
  knowledgeBase.terminology.status,
  {
    type: 'terminology',
    category: 'status'
  }
));

// 9. Data Field Structure
console.log('  ✓ Data Field Structure');
documents.push(createDocument(
  'dental-data-field-structure',
  'Data Field Structure',
  knowledgeBase.dataFieldStructure,
  {
    type: 'data-field-structure'
  }
));

// 10. Best Practices - fiecare categorie separat
const bestPracticesCategories = Object.keys(knowledgeBase.bestPractices);
console.log(`  ✓ Best Practices (${bestPracticesCategories.length} categories)`);

bestPracticesCategories.forEach(category => {
  const practices = knowledgeBase.bestPractices[category];
  documents.push(createDocument(
    `dental-best-practices-${category}`,
    `Best Practices: ${category}`,
    practices,
    {
      type: 'best-practices',
      category: category
    }
  ));
});

console.log(`\n📦 Total documente create: ${documents.length}\n`);

// Salvează fiecare document ca fișier JSON separat
console.log('💾 Salvez documentele...\n');

documents.forEach(doc => {
  const filename = `${doc.id}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(doc, null, 2), 'utf-8');
  console.log(`  ✓ ${filename}`);
});

// Creează și un index cu toate documentele
const indexFile = {
  totalDocuments: documents.length,
  businessType: knowledgeBase.businessType,
  version: knowledgeBase.version,
  lastUpdated: knowledgeBase.lastUpdated,
  generatedAt: new Date().toISOString(),
  documents: documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    file: `${doc.id}.json`,
    metadata: doc.metadata
  }))
};

const indexPath = path.join(OUTPUT_DIR, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(indexFile, null, 2), 'utf-8');
console.log(`\n  ✓ index.json (catalog)\n`);

// Creează un fișier consolidated pentru import rapid în vector DB
const consolidatedFile = {
  businessType: knowledgeBase.businessType,
  version: knowledgeBase.version,
  lastUpdated: knowledgeBase.lastUpdated,
  generatedAt: new Date().toISOString(),
  documents: documents
};

const consolidatedPath = path.join(OUTPUT_DIR, 'consolidated-knowledge-base.json');
fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedFile, null, 2), 'utf-8');
console.log(`  ✓ consolidated-knowledge-base.json (toate documentele)\n`);

console.log('✅ Gata! Fișierele au fost generate în:', OUTPUT_DIR);
console.log('\nStatistici:');
console.log(`  - Documente individuale: ${documents.length}`);
console.log(`  - Resource types: ${resourceTypes.length}`);
console.log(`  - Query examples: ${queryExamples.length}`);
console.log(`  - Conversation patterns: ${conversationPatterns.length}`);
console.log(`  - Best practices categories: ${bestPracticesCategories.length}`);

// Statistici pe tipuri de documente
const typeStats = {};
documents.forEach(doc => {
  const type = doc.metadata.type;
  typeStats[type] = (typeStats[type] || 0) + 1;
});

console.log('\nDocumente pe tip:');
Object.keys(typeStats).sort().forEach(type => {
  console.log(`  - ${type}: ${typeStats[type]}`);
});

console.log('\n📌 Fișiere generate:');
console.log(`  1. ${documents.length} fișiere JSON individuale (*.json)`);
console.log(`  2. index.json - catalog cu toate documentele`);
console.log(`  3. consolidated-knowledge-base.json - toate documentele într-un singur fișier`);

console.log('\n💡 Următorii pași:');
console.log('  1. Folosește fișierele individuale pentru indexare granulară în vector DB');
console.log('  2. Sau folosește consolidated-knowledge-base.json pentru import rapid');
console.log('  3. Verifică index.json pentru a vedea structura completă');

