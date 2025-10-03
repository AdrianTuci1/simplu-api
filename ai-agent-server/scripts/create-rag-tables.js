const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, CreateTableCommand } = require('@aws-sdk/lib-dynamodb');

// Configure DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// RAG Tables Configuration
const RAG_TABLES = {
  // Tabel pentru instrucțiuni generale (role + businessType)
  ragInstructions: {
    TableName: 'rag-instructions',
    KeySchema: [
      { AttributeName: 'ragKey', KeyType: 'HASH' }, // operator.dental.general
      { AttributeName: 'version', KeyType: 'RANGE' } // v1, v2, etc.
    ],
    AttributeDefinitions: [
      { AttributeName: 'ragKey', AttributeType: 'S' },
      { AttributeName: 'version', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'businessType-index',
        KeySchema: [
          { AttributeName: 'businessType', KeyType: 'HASH' },
          { AttributeName: 'role', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },

  // Tabel pentru resurse specifice (businessType + resourceType)
  ragResources: {
    TableName: 'rag-resources',
    KeySchema: [
      { AttributeName: 'resourceKey', KeyType: 'HASH' }, // dental.appointment
      { AttributeName: 'version', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'resourceKey', AttributeType: 'S' },
      { AttributeName: 'version', AttributeType: 'S' },
      { AttributeName: 'businessType', AttributeType: 'S' },
      { AttributeName: 'resourceType', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'businessType-resourceType-index',
        KeySchema: [
          { AttributeName: 'businessType', KeyType: 'HASH' },
          { AttributeName: 'resourceType', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },

  // Tabel pentru datele resurselor (mock data)
  ragResourceData: {
    TableName: 'rag-resource-data',
    KeySchema: [
      { AttributeName: 'resourceKey', KeyType: 'HASH' }, // dental.appointment
      { AttributeName: 'dataType', KeyType: 'RANGE' } // mock, real, template
    ],
    AttributeDefinitions: [
      { AttributeName: 'resourceKey', AttributeType: 'S' },
      { AttributeName: 'dataType', AttributeType: 'S' },
      { AttributeName: 'businessType', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'businessType-index',
        KeySchema: [
          { AttributeName: 'businessType', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
};

async function createTable(tableConfig) {
  try {
    console.log(`Creating table: ${tableConfig.TableName}`);
    
    const command = new CreateTableCommand(tableConfig);
    await docClient.send(command);
    
    console.log(`✅ Table ${tableConfig.TableName} created successfully`);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${tableConfig.TableName} already exists`);
    } else {
      console.error(`❌ Error creating table ${tableConfig.TableName}:`, error.message);
      throw error;
    }
  }
}

async function createAllTables() {
  console.log('🚀 Creating RAG tables...');
  
  try {
    // Create all tables
    for (const [tableName, tableConfig] of Object.entries(RAG_TABLES)) {
      await createTable(tableConfig);
    }
    
    console.log('✅ All RAG tables created successfully!');
    console.log('\n📋 Created tables:');
    console.log('- rag-instructions: General RAG instructions (role + businessType)');
    console.log('- rag-resources: Resource-specific RAG instructions');
    console.log('- rag-resource-data: Mock data for resources');
    
  } catch (error) {
    console.error('❌ Error creating RAG tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAllTables();
}

module.exports = {
  createAllTables,
  RAG_TABLES
};
