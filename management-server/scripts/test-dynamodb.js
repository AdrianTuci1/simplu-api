require('dotenv/config');

/*
Usage:
 node scripts/test-dynamodb.js list-tables
 node scripts/test-dynamodb.js scan-table --table business-info
 node scripts/test-dynamodb.js get-item --table business-info --key 062d36c4-85c8-4dfa-8280-a57728df20ec
*/

const { DynamoDBClient, ListTablesCommand, ScanCommand, GetCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKey || !secretKey) {
    console.error('Missing AWS credentials');
    process.exit(1);
  }

  const client = new DynamoDBClient({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
  });
  const docClient = DynamoDBDocumentClient.from(client);

  const arg = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };

  if (cmd === 'list-tables') {
    const res = await docClient.send(new ListTablesCommand({}));
    console.log('Tables:', res.TableNames);
    return;
  }

  if (cmd === 'scan-table') {
    const table = arg('table');
    if (!table) throw new Error('--table required');
    const res = await docClient.send(new ScanCommand({ TableName: table }));
    console.log(`Items in ${table}:`, res.Items?.length || 0);
    console.log('Items:', JSON.stringify(res.Items, null, 2));
    return;
  }

  if (cmd === 'get-item') {
    const table = arg('table');
    const key = arg('key');
    if (!table || !key) throw new Error('--table and --key required');
    const res = await docClient.send(new GetCommand({ 
      TableName: table, 
      Key: { businessId: key } 
    }));
    console.log('Item:', JSON.stringify(res.Item, null, 2));
    return;
  }

  console.log('Unknown command');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 