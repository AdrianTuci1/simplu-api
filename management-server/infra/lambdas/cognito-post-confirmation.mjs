/**
 * Cognito Post-Confirmation Trigger Lambda (Simple Version - No Dependencies!)
 * 
 * This Lambda is triggered automatically by AWS Cognito after a user confirms their account.
 * It sends a message to SQS to update the medic resource_id from email to Cognito user ID.
 * 
 * Trigger: Cognito User Pool Post-Confirmation
 * Runtime: Node.js 20.x
 * 
 * Environment Variables:
 * - SQS_QUEUE_URL: URL of the SQS queue (resources-server queue)
 * - AWS_REGION: AWS region (optional, defaults to eu-central-1)
 * 
 * IAM Permissions Required:
 * - sqs:SendMessage on the queue
 * - logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
 * 
 * NO EXTERNAL DEPENDENCIES NEEDED! AWS SDK is included in Lambda runtime.
 */

// AWS SDK v3 is available in Lambda runtime (Node.js 20.x)
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const queueUrl = process.env.SQS_QUEUE_URL;

export const handler = async (event) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('Cognito Post-Confirmation Trigger');
  console.log('═══════════════════════════════════════════════════');
  console.log('Event:', JSON.stringify(event, null, 2));

  const cognitoUserId = event.userName; // The Cognito user ID (sub)
  const email = event.request.userAttributes.email;
  
  console.log(`User confirmed: ${cognitoUserId}`);
  console.log(`Email: ${email}`);

  // Get invitation details from clientMetadata
  const invitationId = event.request.clientMetadata?.invitationId;
  const businessId = event.request.clientMetadata?.businessId;
  const locationId = event.request.clientMetadata?.locationId;

  console.log('Client metadata:', {
    invitationId,
    businessId,
    locationId,
  });

  // If user signed up via invitation, update the medic resource
  if (invitationId && businessId && locationId) {
    try {
      console.log('Processing invitation acceptance...');

      if (!queueUrl) {
        console.error('❌ SQS_QUEUE_URL not configured');
        return event; // Don't block user registration
      }

      // Create SQS message to update resource_id
      const sqsMessage = {
        messageType: 'UPDATE_RESOURCE_ID',
        businessId,
        locationId,
        resourceType: 'medic',
        oldResourceId: email, // Medic has resource_id = email
        newResourceId: cognitoUserId, // Change to Cognito user ID
        additionalData: {
          invitationId,
          invitationStatus: 'accepted',
          invitationAcceptedAt: new Date().toISOString(),
          cognitoUserId,
        },
        timestamp: new Date().toISOString(),
      };

      console.log('Sending message to SQS:', JSON.stringify(sqsMessage, null, 2));

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(sqsMessage),
        MessageAttributes: {
          MessageType: {
            DataType: 'String',
            StringValue: 'UPDATE_RESOURCE_ID',
          },
        },
      });

      const result = await sqsClient.send(command);
      
      console.log('SQS SendMessage result:', {
        MessageId: result.MessageId,
        SequenceNumber: result.SequenceNumber,
      });

      console.log(`✅ Successfully sent update request for medic`);
      console.log(`   From: ${email}`);
      console.log(`   To: ${cognitoUserId}`);
    } catch (error) {
      console.error('❌ Error processing invitation:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      // Don't throw - we don't want to block user registration
    }
  } else {
    console.log('ℹ️  No invitation metadata found - regular signup');
    console.log('   User can be added to a business later by admin');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('Cognito confirmation completed successfully');
  console.log('═══════════════════════════════════════════════════');

  // Always return the event to allow Cognito to continue
  return event;
};

