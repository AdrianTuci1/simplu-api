import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) throw new Error('DYNAMODB_TABLE_NAME is not set');

  const now = new Date().toISOString();
  const businessId = event.detail?.businessId || event.businessId;

  await dynamo.send(new UpdateCommand({
    TableName: tableName,
    Key: { businessId },
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
  }));

  return { updated: true };
};


