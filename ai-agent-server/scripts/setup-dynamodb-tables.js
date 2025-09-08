const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

// Configurare DynamoDB
const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

const tableNames = {
  sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
  messages: process.env.DYNAMODB_MESSIONS_TABLE || 'ai-agent-messages',
  businessInfo: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
  ragSystemInstructions: process.env.DYNAMODB_RAG_SYSTEM_TABLE || 'rag-system-instructions',
  ragDynamicBusiness: process.env.DYNAMODB_RAG_DYNAMIC_BUSINESS_TABLE || 'rag-dynamic-business',
  ragDynamicUser: process.env.DYNAMODB_RAG_DYNAMIC_USER_TABLE || 'rag-dynamic-user',
  externalCredentials: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
};

// Configurații pentru tabele
const tableConfigurations = {
  sessions: {
    TableName: tableNames.sessions,
    KeySchema: [
      {
        AttributeName: 'sessionId',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'sessionId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'businessId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'userId',
        AttributeType: 'S'
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'businessId-userId-index',
        KeySchema: [
          {
            AttributeName: 'businessId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'userId',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  
  messages: {
    TableName: tableNames.messages,
    KeySchema: [
      {
        AttributeName: 'messageId',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'sessionId',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'messageId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'sessionId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'businessId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'timestamp',
        AttributeType: 'S'
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'sessionId-timestamp-index',
        KeySchema: [
          {
            AttributeName: 'sessionId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'timestamp',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      },
      {
        IndexName: 'businessId-timestamp-index',
        KeySchema: [
          {
            AttributeName: 'businessId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'timestamp',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  businessInfo: {
    TableName: tableNames.businessInfo,
    KeySchema: [
      {
        AttributeName: 'businessId',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'businessId',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  ragSystemInstructions: {
    TableName: tableNames.ragSystemInstructions,
    KeySchema: [
      {
        AttributeName: 'businessType',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'key',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'businessType',
        AttributeType: 'S'
      },
      {
        AttributeName: 'key',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  ragDynamicBusiness: {
    TableName: tableNames.ragDynamicBusiness,
    KeySchema: [
      {
        AttributeName: 'memoryKey',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'memoryKey',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  ragDynamicUser: {
    TableName: tableNames.ragDynamicUser,
    KeySchema: [
      {
        AttributeName: 'memoryKey',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'memoryKey',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  externalCredentials: {
    TableName: tableNames.externalCredentials,
    KeySchema: [
      {
        AttributeName: 'businessId',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'serviceType',
        KeyType: 'RANGE'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'businessId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'serviceType',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
};

async function checkTableExists(tableName) {
  try {
    await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(tableName, config) {
  try {
    console.log(`🔨 Creating table: ${tableName}...`);
    await dynamoDBClient.send(new CreateTableCommand(config));
    console.log(`✅ Table ${tableName} created successfully!`);
    return true;
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${tableName} already exists.`);
      return true;
    }
    console.error(`❌ Error creating table ${tableName}:`, error.message);
    return false;
  }
}

async function setupDynamoDBTables() {
  console.log('🚀 Starting DynamoDB Tables Setup');
  console.log('==================================');
  console.log(`🌍 AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`📊 Tables to setup: ${Object.keys(tableConfigurations).length}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const [tableKey, config] of Object.entries(tableConfigurations)) {
    const tableName = config.TableName;
    
    try {
      const exists = await checkTableExists(tableName);
      
      if (exists) {
        console.log(`✅ Table ${tableName} already exists - skipping`);
        skippedCount++;
        continue;
      }

      const success = await createTable(tableName, config);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Unexpected error with table ${tableName}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Setup Summary:');
  console.log(`✅ Successfully created: ${successCount} tables`);
  console.log(`⚠️  Already existed: ${skippedCount} tables`);
  console.log(`❌ Failed to create: ${errorCount} tables`);
  console.log(`📋 Total processed: ${Object.keys(tableConfigurations).length} tables`);

  if (errorCount === 0) {
    console.log('\n🎉 All DynamoDB tables are ready!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: node scripts/populate-system-instructions.js');
    console.log('2. Run: node scripts/populate-rag.js');
    console.log('3. Test your AI agent server!');
  } else {
    console.log(`\n⚠️  ${errorCount} tables failed to create. Check the errors above.`);
  }
}

// Rulare script
setupDynamoDBTables()
  .then(() => {
    console.log('\n🏁 DynamoDB setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during setup:', error);
    process.exit(1);
  });
