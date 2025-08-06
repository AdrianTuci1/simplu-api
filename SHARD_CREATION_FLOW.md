# Shard Creation Flow Documentation

## Overview

This document describes the automated shard creation flow that occurs when a business is created in the management server. The system uses a combination of Citrus sharding service and SQS messaging to coordinate shard creation across multiple services.

## Architecture

```
Management Server → SQS Queue → Resources Server → Citrus Sharding Service
```

1. **Management Server**: Creates business and sends SQS messages for shard creation
2. **SQS Queue**: Asynchronous messaging between services
3. **Resources Server**: Consumes messages and handles Citrus integration
4. **Citrus Sharding Service**: Manages shard assignment and provides connection details

## Flow Details

### 1. Business Creation (Management Server)

When a business is created via the `POST /businesses` endpoint:

1. Business entity is created in the database
2. Stripe customer and subscription are created
3. Infrastructure (React app) is provisioned
4. **NEW**: For each location in the business, a shard is registered with Citrus

```typescript
// In BusinessService.createBusiness()
const locationRegistrations = locations.map(location => ({
  id: location.id,
  businessType: createBusinessDto.businessType,
}));

await this.shardManagementService.registerMultipleBusinessLocations(
  businessId,
  locationRegistrations,
);
```

### 2. SQS Message Processing (Resources Server)

The `SqsConsumerService` in the resources server:

1. **Receives SQS Message**: Gets shard creation request from management server
2. **Registers with Citrus**: Sends business-location data to Citrus sharding service
3. **Gets Shard Details**: Receives shard assignment and connection details from Citrus
4. **Initializes Shard**: Sets up database connection and schemas

```typescript
// In SqsConsumerService.handleShardCreationMessage()
const shardData: ShardCreationMessage = JSON.parse(message.Body);

// Register with Citrus
const citrusShardData = await this.registerWithCitrus(shardData);

// Initialize shard with Citrus-provided details
await this.initializeShard({
  ...shardData,
  shardId: citrusShardData.shardId,
  connectionString: citrusShardData.connectionString,
});
```

### 3. Shard Initialization

The resources server handles the actual shard initialization:

1. **Database Connection**: Uses connection string provided by Citrus
2. **Schema Setup**: Creates necessary tables for the business type
3. **Index Creation**: Sets up required indexes and constraints
4. **Data Initialization**: Prepares business-specific data structures

## Configuration

### SQS Queue Setup

The SQS queue for shard creation notifications must be created manually or through your preferred infrastructure management process. The queue should be configured with:

- **Queue Type**: Standard Queue (for at-least-once delivery)
- **Message Retention**: 14 days (default)
- **Visibility Timeout**: 30 seconds (adjust based on processing time)
- **Dead Letter Queue**: Recommended for failed message handling

### Management Server Environment Variables

```bash
# SQS Configuration
SQS_SHARD_CREATION_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/shard-creation-queue
```

### Resources Server Environment Variables

```bash
# SQS Configuration
SQS_SHARD_CREATION_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/shard-creation-queue

# Citrus Sharding Configuration
CITRUS_SERVER_URL=http://citrus.server.com:8080
CITRUS_API_KEY=your_citrus_api_key_here
CITRUS_TIMEOUT=5000
CITRUS_RETRY_ATTEMPTS=3
```

## API Endpoints

### Management Server

- `POST /businesses` - Create business (automatically triggers shard creation)
- `POST /businesses/:id/register-shards` - Manually trigger shard registration for existing business

### Citrus Sharding Service

- `POST /api/register` - Register business-location combination
- `GET /api/shard/:shardKey` - Get shard details for business-location
- `GET /api/shards/health` - Get health status of all shards

## Error Handling

### Graceful Degradation

- If shard registration fails during business creation, the business is still created
- Failed shard registrations can be retried using the manual endpoint
- SQS messages are not deleted on processing errors, allowing for retry

### Logging

- All shard operations are logged with appropriate levels
- Errors include context about business and location IDs
- SQS message processing errors are logged but don't stop the consumer

## Manual Operations

### Retry Failed Shard Registrations

```bash
# For a specific business
curl -X POST http://management-server:3001/businesses/{businessId}/register-shards
```

### Monitor Shard Health

```bash
# Check all shards health
curl -H "Authorization: Bearer {api_key}" http://citrus.server.com:8080/api/shards/health
```

## Dependencies

### Management Server
- `@aws-sdk/client-sqs` - SQS client for sending messages
- `fetch` - HTTP client for Citrus API calls

### Resources Server
- `@aws-sdk/client-sqs` - SQS client for receiving messages

## Infrastructure Setup

### SQS Queue Creation

Create the SQS queue manually or through your infrastructure management process:

```bash
# AWS CLI example
aws sqs create-queue \
  --queue-name shard-creation-queue \
  --attributes '{
    "VisibilityTimeout": "30",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20"
  }'
```

### IAM Permissions

Ensure the services have appropriate IAM permissions:

**Management Server** (for sending messages):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:shard-creation-queue"
    }
  ]
}
```

**Resources Server** (for receiving messages):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ChangeMessageVisibility"
      ],
      "Resource": "arn:aws:sqs:*:*:shard-creation-queue"
    }
  ]
}
```

## Future Enhancements

1. **Retry Mechanism**: Implement exponential backoff for failed shard registrations
2. **Monitoring**: Add metrics and alerts for shard creation failures
3. **Validation**: Add validation for shard connection strings and business types
4. **Rollback**: Implement rollback mechanism for failed shard initializations
5. **Batch Processing**: Optimize for handling multiple business creations simultaneously
6. **Dead Letter Queue**: Configure DLQ for failed message handling
7. **CloudWatch Alarms**: Set up alarms for queue depth and processing errors 