import { DynamoDB } from 'aws-sdk';

interface UpdateInput {
  businessId: string;
}

const dynamo = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const handler = async (event: UpdateInput): Promise<{ updated: boolean }> => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) throw new Error('DYNAMODB_TABLE_NAME is not set');

  const now = new Date().toISOString();

  await dynamo
    .update({
      TableName: tableName,
      Key: { businessId: event.businessId },
      UpdateExpression: 'SET #status = :active, #active = :true, #paymentStatus = :payment, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#active': 'active',
        '#paymentStatus': 'paymentStatus',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':active': 'active',
        ':true': true,
        ':payment': 'active',
        ':now': now,
      },
    })
    .promise();

  return { updated: true };
};


