const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

// Configure DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Load RAG data from JSON file
function loadRagData() {
  const dataPath = path.join(__dirname, '../data/rag-data.json');
  
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading RAG data:', error.message);
    process.exit(1);
  }
}

// Populate rag-instructions table
async function populateRagInstructions(instructions) {
  console.log('📝 Populating rag-instructions table...');
  
  const items = instructions.map(instruction => ({
    TableName: 'rag-instructions',
    Item: {
      ...instruction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }));

  try {
    // Use BatchWrite for better performance
    const batchSize = 25; // DynamoDB batch limit
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchParams = {
        RequestItems: {
          'rag-instructions': batch.map(item => ({
            PutRequest: { Item: item.Item }
          }))
        }
      };

      await docClient.send(new BatchWriteCommand(batchParams));
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    }
    
    console.log(`✅ Successfully populated ${instructions.length} rag instructions`);
  } catch (error) {
    console.error('❌ Error populating rag-instructions:', error);
    throw error;
  }
}

// Populate rag-resources table
async function populateRagResources(resources) {
  console.log('📋 Populating rag-resources table...');
  
  const items = resources.map(resource => ({
    TableName: 'rag-resources',
    Item: {
      ...resource,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }));

  try {
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchParams = {
        RequestItems: {
          'rag-resources': batch.map(item => ({
            PutRequest: { Item: item.Item }
          }))
        }
      };

      await docClient.send(new BatchWriteCommand(batchParams));
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    }
    
    console.log(`✅ Successfully populated ${resources.length} rag resources`);
  } catch (error) {
    console.error('❌ Error populating rag-resources:', error);
    throw error;
  }
}

// Populate rag-resource-data table
async function populateRagResourceData(resourceData) {
  console.log('💾 Populating rag-resource-data table...');
  
  const items = resourceData.map(data => ({
    TableName: 'rag-resource-data',
    Item: {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }));

  try {
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchParams = {
        RequestItems: {
          'rag-resource-data': batch.map(item => ({
            PutRequest: { Item: item.Item }
          }))
        }
      };

      await docClient.send(new BatchWriteCommand(batchParams));
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    }
    
    console.log(`✅ Successfully populated ${resourceData.length} rag resource data entries`);
  } catch (error) {
    console.error('❌ Error populating rag-resource-data:', error);
    throw error;
  }
}

// Verify data was populated correctly
async function verifyPopulation() {
  console.log('🔍 Verifying data population...');
  
  try {
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    
    // Check rag-instructions
    const instructionsResult = await docClient.send(new ScanCommand({
      TableName: 'rag-instructions',
      Select: 'COUNT'
    }));
    console.log(`📊 rag-instructions: ${instructionsResult.Count} items`);
    
    // Check rag-resources
    const resourcesResult = await docClient.send(new ScanCommand({
      TableName: 'rag-resources',
      Select: 'COUNT'
    }));
    console.log(`📊 rag-resources: ${resourcesResult.Count} items`);
    
    // Check rag-resource-data
    const dataResult = await docClient.send(new ScanCommand({
      TableName: 'rag-resource-data',
      Select: 'COUNT'
    }));
    console.log(`📊 rag-resource-data: ${dataResult.Count} items`);
    
    console.log('✅ Data verification completed');
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  }
}

// Main function to populate all tables
async function populateAllTables() {
  console.log('🚀 Starting RAG tables population...');
  
  try {
    // Load data from JSON
    const ragData = loadRagData();
    console.log('📄 RAG data loaded successfully');
    
    // Populate each table
    await populateRagInstructions(ragData.ragInstructions);
    await populateRagResources(ragData.ragResources);
    await populateRagResourceData(ragData.ragResourceData);
    
    // Verify population
    await verifyPopulation();
    
    console.log('\n🎉 All RAG tables populated successfully!');
    console.log('\n📋 Summary:');
    console.log(`- rag-instructions: ${ragData.ragInstructions.length} entries`);
    console.log(`- rag-resources: ${ragData.ragResources.length} entries`);
    console.log(`- rag-resource-data: ${ragData.ragResourceData.length} entries`);
    
  } catch (error) {
    console.error('❌ Error populating RAG tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateAllTables();
}

module.exports = {
  populateAllTables,
  populateRagInstructions,
  populateRagResources,
  populateRagResourceData,
  verifyPopulation
};
