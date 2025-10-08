import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

export const handler = async (event) => {
  const queueUrl = process.env.SQS_SHARD_CREATION_QUEUE_URL;
  if (!queueUrl) throw new Error('SQS_SHARD_CREATION_QUEUE_URL is not set');

  // Extract data from event.detail or fallback to root event
  const businessId = event.detail?.businessId || event.businessId;
  const businessType = event.detail?.businessType || event.businessType;
  const domainLabel = event.detail?.domainLabel || event.domainLabel;
  const ownerEmail = event.detail?.ownerEmail || event.ownerEmail;
  const ownerUserId = event.detail?.ownerUserId || event.ownerUserId;
  const locations = (event.detail?.locations || event.locations || []).filter((l) => l.active !== false);
  
  let enqueued = 0;

  for (const location of locations) {
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        businessId,
        locationId: location.id,
        adminEmail: ownerEmail,
        adminUserId: ownerUserId,
        businessType,
        domainLabel,
        timestamp: new Date().toISOString(),
      }),
      MessageAttributes: {
        MessageType: { DataType: 'String', StringValue: 'ADMIN_ACCOUNT_CREATION' },
        BusinessId: { DataType: 'String', StringValue: businessId },
        LocationId: { DataType: 'String', StringValue: location.id },
        AdminEmail: { DataType: 'String', StringValue: ownerEmail || '' },
      },
    }));
    enqueued += 1;
  }

  return { enqueued };
};


