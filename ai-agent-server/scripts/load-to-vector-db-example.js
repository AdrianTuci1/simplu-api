#!/usr/bin/env node

/**
 * Exemplu de script pentru încărcarea documentelor din knowledge base
 * în baza de date vectorială
 * 
 * Acest script este un exemplu - adaptează-l pentru vector DB-ul tău specific
 * (Pinecone, Weaviate, Chroma, AWS Bedrock Knowledge Base, etc.)
 */

const fs = require('fs');
const path = require('path');

const KB_DIR = path.join(__dirname, '../data/kb-documents/dental');

// ============================================================================
// GENERIC VECTOR DB LOADER
// ============================================================================

class VectorDBLoader {
  constructor() {
    this.documents = [];
  }

  /**
   * Încarcă toate documentele din consolidated file
   */
  async loadFromConsolidated() {
    const consolidatedPath = path.join(KB_DIR, 'consolidated-knowledge-base.json');
    const data = JSON.parse(fs.readFileSync(consolidatedPath, 'utf-8'));
    
    console.log(`\n📦 Loaded ${data.documents.length} documents from consolidated file`);
    console.log(`   Business Type: ${data.businessType}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Generated: ${data.generatedAt}\n`);
    
    this.documents = data.documents;
    return this.documents;
  }

  /**
   * Încarcă documente individual pe baza index.json
   */
  async loadFromIndex() {
    const indexPath = path.join(KB_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    console.log(`\n📋 Loading ${index.totalDocuments} documents from index...\n`);
    
    this.documents = index.documents.map(docRef => {
      const filePath = path.join(KB_DIR, docRef.file);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
    
    console.log(`✅ Loaded ${this.documents.length} documents\n`);
    return this.documents;
  }

  /**
   * Filtrează documentele după tip
   */
  filterByType(type) {
    return this.documents.filter(doc => doc.metadata.type === type);
  }

  /**
   * Filtrează documentele după role
   */
  filterByRole(role) {
    return this.documents.filter(doc => doc.metadata.role === role);
  }

  /**
   * Filtrează documentele după resourceType
   */
  filterByResourceType(resourceType) {
    return this.documents.filter(doc => doc.metadata.resourceType === resourceType);
  }

  /**
   * Generează statistici despre documente
   */
  getStats() {
    const stats = {
      total: this.documents.length,
      byType: {},
      byRole: {},
      byResourceType: {}
    };

    this.documents.forEach(doc => {
      // Count by type
      const type = doc.metadata.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by role
      if (doc.metadata.role) {
        const role = doc.metadata.role;
        stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      }

      // Count by resourceType
      if (doc.metadata.resourceType) {
        const rt = doc.metadata.resourceType;
        stats.byResourceType[rt] = (stats.byResourceType[rt] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Afișează statistici
   */
  printStats() {
    const stats = this.getStats();
    
    console.log('📊 Statistici Documente:');
    console.log(`   Total: ${stats.total}\n`);
    
    console.log('   Pe tip:');
    Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
    
    if (Object.keys(stats.byRole).length > 0) {
      console.log('\n   Pe rol:');
      Object.entries(stats.byRole).forEach(([role, count]) => {
        console.log(`     - ${role}: ${count}`);
      });
    }
    
    if (Object.keys(stats.byResourceType).length > 0) {
      console.log('\n   Pe tip resursă:');
      Object.entries(stats.byResourceType).forEach(([rt, count]) => {
        console.log(`     - ${rt}: ${count}`);
      });
    }
    console.log('');
  }
}

// ============================================================================
// MOCK EMBEDDING FUNCTION
// ============================================================================

/**
 * Mock function pentru generarea embeddings
 * În producție, înlocuiește cu OpenAI, Cohere, AWS Bedrock, etc.
 */
async function generateEmbedding(text) {
  // MOCK: returnează un vector random de 1536 dimensiuni (dimensiunea OpenAI)
  // În producție: 
  // - OpenAI: const response = await openai.embeddings.create({model: "text-embedding-3-small", input: text})
  // - AWS Bedrock: const response = await bedrock.invokeModel({modelId: "amazon.titan-embed-text-v1", body: {inputText: text}})
  // - Cohere: const response = await cohere.embed({texts: [text], model: 'embed-english-v3.0'})
  
  return Array.from({length: 1536}, () => Math.random());
}

// ============================================================================
// VECTOR DB INTEGRATIONS
// ============================================================================

/**
 * Exemplu: Încărcare în Pinecone
 */
async function loadToPinecone(documents) {
  console.log('📍 Pinecone Integration Example:\n');
  console.log('const { Pinecone } = require("@pinecone-database/pinecone");\n');
  console.log('const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });');
  console.log('const index = pinecone.index("dental-knowledge");\n');
  
  console.log('const vectors = await Promise.all(');
  console.log('  documents.map(async (doc) => ({');
  console.log('    id: doc.id,');
  console.log('    values: await generateEmbedding(doc.content),');
  console.log('    metadata: {');
  console.log('      title: doc.title,');
  console.log('      type: doc.metadata.type,');
  console.log('      businessType: doc.metadata.businessType,');
  console.log('      content: doc.content.substring(0, 1000) // Pinecone metadata limit');
  console.log('    }');
  console.log('  }))');
  console.log(');\n');
  console.log('await index.upsert(vectors);\n');
  
  console.log(`✅ Would upload ${documents.length} vectors to Pinecone\n`);
}

/**
 * Exemplu: Încărcare în AWS Bedrock Knowledge Base
 */
async function loadToBedrockKB(documents) {
  console.log('☁️  AWS Bedrock Knowledge Base Integration Example:\n');
  console.log('// 1. Pregătește documentele în format S3');
  console.log('const s3Docs = documents.map(doc => ({');
  console.log('  key: `dental-kb/${doc.id}.json`,');
  console.log('  body: JSON.stringify({');
  console.log('    title: doc.title,');
  console.log('    content: doc.content,');
  console.log('    metadata: doc.metadata');
  console.log('  })');
  console.log('}));\n');
  
  console.log('// 2. Upload la S3');
  console.log('for (const doc of s3Docs) {');
  console.log('  await s3.putObject({');
  console.log('    Bucket: "your-kb-bucket",');
  console.log('    Key: doc.key,');
  console.log('    Body: doc.body,');
  console.log('    ContentType: "application/json"');
  console.log('  });');
  console.log('}\n');
  
  console.log('// 3. Sincronizează Knowledge Base');
  console.log('await bedrock.startIngestionJob({');
  console.log('  knowledgeBaseId: "your-kb-id",');
  console.log('  dataSourceId: "your-datasource-id"');
  console.log('});\n');
  
  console.log(`✅ Would upload ${documents.length} documents to AWS Bedrock KB\n`);
}

/**
 * Exemplu: Încărcare în Weaviate
 */
async function loadToWeaviate(documents) {
  console.log('🔷 Weaviate Integration Example:\n');
  console.log('const weaviate = require("weaviate-ts-client");\n');
  console.log('const client = weaviate.client({');
  console.log('  scheme: "https",');
  console.log('  host: "your-weaviate-instance.weaviate.network"');
  console.log('});\n');
  
  console.log('for (const doc of documents) {');
  console.log('  await client.data.creator()');
  console.log('    .withClassName("DentalKnowledge")');
  console.log('    .withProperties({');
  console.log('      documentId: doc.id,');
  console.log('      title: doc.title,');
  console.log('      content: doc.content,');
  console.log('      type: doc.metadata.type,');
  console.log('      businessType: doc.metadata.businessType,');
  console.log('      version: doc.metadata.version');
  console.log('    })');
  console.log('    .do();');
  console.log('}\n');
  
  console.log(`✅ Would upload ${documents.length} documents to Weaviate\n`);
}

/**
 * Exemplu: Încărcare în Chroma
 */
async function loadToChroma(documents) {
  console.log('🎨 Chroma Integration Example:\n');
  console.log('const { ChromaClient } = require("chromadb");\n');
  console.log('const client = new ChromaClient();');
  console.log('const collection = await client.getOrCreateCollection({');
  console.log('  name: "dental-knowledge"');
  console.log('});\n');
  
  console.log('const ids = documents.map(d => d.id);');
  console.log('const embeddings = await Promise.all(');
  console.log('  documents.map(d => generateEmbedding(d.content))');
  console.log(');\n');
  console.log('const metadatas = documents.map(d => d.metadata);');
  console.log('const documents_content = documents.map(d => d.content);\n');
  
  console.log('await collection.add({');
  console.log('  ids,');
  console.log('  embeddings,');
  console.log('  metadatas,');
  console.log('  documents: documents_content');
  console.log('});\n');
  
  console.log(`✅ Would upload ${documents.length} documents to Chroma\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Dental Knowledge Base - Vector DB Loader Example            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const loader = new VectorDBLoader();
  
  // Opțiunea 1: Încarcă din consolidated file (mai rapid)
  console.log('Option 1: Loading from consolidated file...');
  await loader.loadFromConsolidated();
  
  // Sau Opțiunea 2: Încarcă din index (mai flexibil)
  // console.log('Option 2: Loading from index...');
  // await loader.loadFromIndex();
  
  // Afișează statistici
  loader.printStats();
  
  // Exemple de filtrare
  console.log('🔍 Exemple de Filtrare:\n');
  
  const resourceDocs = loader.filterByType('resource-type');
  console.log(`   Resource Types: ${resourceDocs.length} documente`);
  resourceDocs.forEach(doc => {
    console.log(`     - ${doc.title}`);
  });
  
  console.log('');
  const operatorDocs = loader.filterByRole('operator');
  console.log(`   Operator Docs: ${operatorDocs.length} documente\n`);
  
  const dentalChartDocs = loader.filterByResourceType('dental-chart');
  console.log(`   Dental Chart Docs: ${dentalChartDocs.length} documente\n`);
  
  // Exemple de integrare
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📤 Exemple de Integrare Vector DB:\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  await loadToPinecone(loader.documents);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  await loadToBedrockKB(loader.documents);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  await loadToWeaviate(loader.documents);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  await loadToChroma(loader.documents);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  console.log('💡 Pentru a implementa în producție:');
  console.log('   1. Alege vector DB-ul potrivit pentru proiectul tău');
  console.log('   2. Instalează librăria corespunzătoare');
  console.log('   3. Configurează API keys și credentials');
  console.log('   4. Implementează funcția de generare embeddings');
  console.log('   5. Adaptează exemplul de mai sus pentru DB-ul ales');
  console.log('   6. Rulează script-ul pentru a încărca documentele\n');
  
  console.log('✅ Done!\n');
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { VectorDBLoader, generateEmbedding };

