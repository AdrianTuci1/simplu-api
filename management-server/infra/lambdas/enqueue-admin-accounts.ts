import { SQS } from 'aws-sdk';

interface EnqueueInput {
  businessId: string;
  businessType: string;
  domainLabel?: string;
  ownerEmail?: string;
  ownerUserId?: string | null;
  locations?: Array<{ id: string; active?: boolean }>;
}

const sqs = new SQS({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const handler = async (event: EnqueueInput): Promise<{ enqueued: number }> => {
  const queueUrl = process.env.SQS_SHARD_CREATION_QUEUE_URL;
  if (!queueUrl) throw new Error('SQS_SHARD_CREATION_QUEUE_URL is not set');

  const locations = (event.locations || []).filter((l) => l.active !== false);
  let enqueued = 0;

  for (const location of locations) {
    await sqs
      .sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          businessId: event.businessId,
          locationId: location.id,
          adminEmail: event.ownerEmail,
          adminUserId: event.ownerUserId,
          businessType: event.businessType,
          domainLabel: event.domainLabel,
          timestamp: new Date().toISOString(),
        }),
        MessageAttributes: {
          MessageType: { DataType: 'String', StringValue: 'ADMIN_ACCOUNT_CREATION' },
          BusinessId: { DataType: 'String', StringValue: event.businessId },
          LocationId: { DataType: 'String', StringValue: location.id },
          AdminEmail: { DataType: 'String', StringValue: event.ownerEmail || '' },
        },
      })
      .promise();
    enqueued += 1;
  }

  return { enqueued };
};


