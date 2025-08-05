# Kinesis Integration for Resource Operations

This document describes the migration from Kafka to AWS Kinesis Data Streams for handling resource operations in the Simplu API.

## Overview

The app server now acts as an authorization gateway that:
1. Validates user permissions for resource operations
2. Sends authorized operations to AWS Kinesis Data Streams
3. Returns immediate responses to clients
4. Lets the resources-server handle actual CRUD operations by consuming from Kinesis

## Architecture Changes

### Before (Kafka)
```
Client → App Server → Direct Database Operations
                   → Kafka (for notifications)
```

### After (Kinesis)
```
Client → App Server (Auth + Validation) → Kinesis Data Streams → Resources Server → Database
                                       ↓
                                   Immediate Response
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# AWS Kinesis Configuration
KINESIS_STREAM_NAME=resources-operations
KINESIS_SHARD_COUNT=1

# AWS Credentials (if not using IAM roles)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Kinesis Stream Setup

The application will automatically create the Kinesis stream on startup if it doesn't exist. Alternatively, you can create it manually:

```bash
aws kinesis create-stream \
  --stream-name resources-operations \
  --shard-count 1
```

## Message Format

All resource operations sent to Kinesis follow this structure:

```typescript
interface ResourceOperation {
  operation: 'create' | 'update' | 'patch' | 'delete' | 'list';
  businessId: string;
  locationId: string;
  resourceType: string;
  resourceId?: string;
  data?: any;
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
  timestamp: string;
  requestId: string;
}
```

### Example Messages

#### Create Operation
```json
{
  "operation": "create",
  "businessId": "business-123",
  "locationId": "location-456",
  "resourceType": "appointment",
  "resourceId": "appointment-1704067200000",
  "data": {
    "id": "appointment-1704067200000",
    "patientName": "John Doe",
    "appointmentTime": "2024-01-01T10:00:00Z",
    "service": "consultation"
  },
  "timestamp": "2024-01-01T09:00:00Z",
  "requestId": "req-uuid-123"
}
```

#### Update Operation
```json
{
  "operation": "update",
  "businessId": "business-123",
  "locationId": "location-456",
  "resourceType": "appointment",
  "resourceId": "appointment-123",
  "data": {
    "appointmentTime": "2024-01-01T11:00:00Z",
    "status": "confirmed"
  },
  "timestamp": "2024-01-01T09:30:00Z",
  "requestId": "req-uuid-456"
}
```

#### List Operation
```json
{
  "operation": "list",
  "businessId": "business-123",
  "locationId": "location-456",
  "resourceType": "appointment",
  "filters": {
    "date": "2024-01-01",
    "status": "confirmed"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "timestamp": "2024-01-01T09:15:00Z",
  "requestId": "req-uuid-789"
}
```

## Partitioning Strategy

Messages are partitioned using the key: `{businessId}-{locationId}-{resourceType}`

This ensures:
- All operations for a specific business/location/resource type go to the same shard
- Maintains ordering for operations on the same resource type
- Enables parallel processing across different businesses/locations

## Response Handling

### Immediate Responses

The app server returns immediate responses for all operations:

```typescript
// Create/Update/Patch responses
{
  "success": true,
  "data": {
    "id": "resource-id",
    "status": "processing",
    "requestId": "req-uuid-123",
    // ... other data
  },
  "meta": {
    "businessId": "business-123",
    "locationId": "location-456",
    "resourceType": "appointment",
    "operation": "create",
    "timestamp": "2024-01-01T09:00:00Z"
  }
}
```

### Status Tracking

Clients can track operation status using the `requestId` returned in responses. The resources-server should implement a status tracking mechanism.

## Testing

### Test Kinesis Integration

Run the test script to verify Kinesis connectivity:

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1
export KINESIS_STREAM_NAME=resources-operations

# Run test
node test-kinesis.js
```

### Test API Endpoints

```bash
# Create a resource
curl -X POST http://localhost:3000/api/resources/business-123-location-456 \
  -H "Content-Type: application/json" \
  -H "X-Business-ID: business-123" \
  -H "X-Location-ID: location-456" \
  -H "X-Resource-Type: appointment" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "data": {
      "patientName": "John Doe",
      "appointmentTime": "2024-01-01T10:00:00Z",
      "service": "consultation"
    }
  }'
```

## Migration Checklist

- [x] Install AWS Kinesis SDK
- [x] Create KinesisService
- [x] Update ResourceDataService to use Kinesis
- [x] Remove Kafka dependencies from resources module
- [x] Update environment configuration
- [x] Add stream setup utility
- [x] Create test scripts
- [ ] Update resources-server to consume from Kinesis
- [ ] Implement status tracking system
- [ ] Update monitoring and logging
- [ ] Performance testing with Kinesis

## Monitoring

### CloudWatch Metrics

Monitor these Kinesis metrics:
- `IncomingRecords`: Number of records sent to stream
- `OutgoingRecords`: Number of records consumed from stream
- `WriteProvisionedThroughputExceeded`: Throttling events
- `ReadProvisionedThroughputExceeded`: Consumer throttling

### Application Logs

The KinesisService logs all operations:
- Successful sends with sequence numbers
- Failed operations with error details
- Partition key information

## Error Handling

### Kinesis Errors

Common errors and solutions:

1. **ResourceNotFoundException**: Stream doesn't exist
   - Solution: Create the stream or check stream name

2. **ProvisionedThroughputExceededException**: Too many requests
   - Solution: Increase shard count or implement backoff

3. **InvalidArgumentException**: Invalid data or partition key
   - Solution: Validate data format and partition key

### Fallback Strategy

Consider implementing a fallback mechanism:
1. Try sending to Kinesis
2. If Kinesis fails, queue operation locally
3. Retry with exponential backoff
4. Alert operations team if persistent failures

## Performance Considerations

### Shard Scaling

- Each shard supports 1,000 records/second or 1 MB/second
- Monitor throughput and scale shards as needed
- Consider using auto-scaling for production

### Batch Operations

For high-volume scenarios, consider:
- Batching multiple operations in single Kinesis records
- Using `PutRecordsCommand` for batch sends
- Implementing client-side batching

### Cost Optimization

- Monitor shard hours and data transfer costs
- Consider data retention period (default 24 hours)
- Use appropriate shard count for your workload

## Security

### IAM Permissions

Required permissions for the app server:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kinesis:PutRecord",
        "kinesis:PutRecords",
        "kinesis:DescribeStream"
      ],
      "Resource": "arn:aws:kinesis:*:*:stream/resources-operations"
    }
  ]
}
```

### Data Encryption

- Enable server-side encryption for the Kinesis stream
- Use KMS keys for additional security
- Encrypt sensitive data before sending to Kinesis

## Troubleshooting

### Common Issues

1. **Stream not found**: Check stream name and region
2. **Access denied**: Verify IAM permissions
3. **Throttling**: Increase shard count or reduce send rate
4. **Large messages**: Kinesis has 1MB record limit

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
```

This will show detailed Kinesis operation logs.