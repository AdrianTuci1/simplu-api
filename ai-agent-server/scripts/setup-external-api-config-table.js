const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configurare DynamoDB
const dynamoDBConfig = {
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
};

const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

const tableName = process.env.DYNAMODB_EXTERNAL_API_CONFIG_TABLE || 'business-external-api-config';

// Configurația pentru tabelul external API config
const tableConfiguration = {
  TableName: tableName,
  KeySchema: [
    {
      AttributeName: 'businessId',
      KeyType: 'HASH'
    },
    {
      AttributeName: 'locationId',
      KeyType: 'RANGE'
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'businessId',
      AttributeType: 'S'
    },
    {
      AttributeName: 'locationId',
      AttributeType: 'S'
    }
  ],
  BillingMode: 'PAY_PER_REQUEST',
  TableClass: 'STANDARD'
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

async function setupExternalApiConfigTable() {
  console.log('🚀 Starting External API Config Table Setup');
  console.log('==========================================');
  console.log(`🌍 AWS Region: ${process.env.AWS_REGION || 'eu-central-1'}`);
  console.log(`📊 Table to setup: ${tableName}`);
  console.log('');

  try {
    const exists = await checkTableExists(tableName);
    
    if (exists) {
      console.log(`✅ Table ${tableName} already exists - skipping`);
      console.log('\n🎉 External API Config table is ready!');
      return;
    }

    const success = await createTable(tableName, tableConfiguration);
    if (success) {
      console.log('\n🎉 External API Config table created successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Configure your external API credentials');
      console.log('2. Set up SMS and Email templates');
      console.log('3. Test the external API configuration endpoints');
    } else {
      console.log('\n❌ Failed to create External API Config table');
    }
  } catch (error) {
    console.error(`❌ Unexpected error:`, error.message);
  }
}

// Rulare script
setupExternalApiConfigTable()
  .then(() => {
    console.log('\n🏁 External API Config table setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during setup:', error);
    process.exit(1);
  });
