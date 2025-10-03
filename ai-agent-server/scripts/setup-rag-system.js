#!/usr/bin/env node

const { createAllTables } = require('./create-rag-tables');
const { populateAllTables } = require('./populate-rag-tables');

async function setupRagSystem() {
  console.log('🚀 Setting up RAG system...');
  console.log('=====================================');
  
  try {
    // Step 1: Create tables
    console.log('\n📋 Step 1: Creating RAG tables...');
    await createAllTables();
    
    // Step 2: Populate tables
    console.log('\n💾 Step 2: Populating RAG tables...');
    await populateAllTables();
    
    console.log('\n🎉 RAG system setup completed successfully!');
    console.log('\n📋 What was created:');
    console.log('- rag-instructions: General RAG instructions (role + businessType)');
    console.log('- rag-resources: Resource-specific RAG instructions');
    console.log('- rag-resource-data: Mock data for resources');
    console.log('\n🔧 Next steps:');
    console.log('1. Update your RAG services to use the new tables');
    console.log('2. Test the system with sample queries');
    console.log('3. Customize the data in data/rag-data.json as needed');
    
  } catch (error) {
    console.error('❌ Error setting up RAG system:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupRagSystem();
}

module.exports = { setupRagSystem };
