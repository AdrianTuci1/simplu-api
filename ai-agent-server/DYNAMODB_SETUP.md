# DynamoDB Setup Guide

This guide explains how to set up the DynamoDB tables required for the AI Agent Server conversation management.

## Required Tables

### 1. Sessions Table (`ai-agent-sessions`)

**Table Name**: `ai-agent-sessions` (configurable via `DYNAMODB_SESSIONS_TABLE`)

**Primary Key**:
- Partition Key: `id` (String) - Session ID
- Sort Key: `tenantId` (String) - Tenant ID

**Attributes**:
- `userId` (String) - User ID
- `locationId` (String, optional) - Location ID
- `isActive` (Boolean) - Whether the session is active
- `createdAt` (String) - ISO timestamp
- `updatedAt` (String) - ISO timestamp
- `metadata` (Map, optional) - Additional session metadata

**Global Secondary Indexes**:

1. **TenantUserIndex**
   - Partition Key: `tenantId` (String)
   - Sort Key: `userId` (String)
   - Purpose: Query sessions by tenant and user

### 2. Messages Table (`ai-agent-messages`)

**Table Name**: `ai-agent-messages` (configurable via `DYNAMODB_MESSAGES_TABLE`)

**Primary Key**:
- Partition Key: `id` (String) - Message ID

**Attributes**:
- `tenantId` (String) - Tenant ID
- `sessionId` (String) - Session ID
- `userId` (String) - User ID
- `content` (String) - Message content
- `role` (String) - 'user' or 'agent'
- `timestamp` (String) - ISO timestamp
- `metadata` (Map, optional) - Additional message metadata

**Global Secondary Indexes**:

1. **SessionTimestampIndex**
   - Partition Key: `sessionId` (String)
   - Sort Key: `timestamp` (String)
   - Purpose: Query messages by session with timestamp ordering

2. **TenantTimestampIndex**
   - Partition Key: `tenantId` (String)
   - Sort Key: `timestamp` (String)
   - Purpose: Query messages by tenant with timestamp ordering

## AWS CLI Commands

### Create Sessions Table

```bash
aws dynamodb create-table \
  --table-name ai-agent-sessions \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=tenantId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
    AttributeName=tenantId,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=TenantUserIndex,KeySchema=[{AttributeName=tenantId,KeyType=HASH},{AttributeName=userId,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST
```

### Create Messages Table

```bash
aws dynamodb create-table \
  --table-name ai-agent-messages \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
    AttributeName=tenantId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=SessionTimestampIndex,KeySchema=[{AttributeName=sessionId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    IndexName=TenantTimestampIndex,KeySchema=[{AttributeName=tenantId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST
```

## CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AI Agent Server DynamoDB Tables'

Resources:
  SessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ai-agent-sessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
        - AttributeName: tenantId
          AttributeType: S
        - AttributeName: userId
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
        - AttributeName: tenantId
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: TenantUserIndex
          KeySchema:
            - AttributeName: tenantId
              KeyType: HASH
            - AttributeName: userId
              KeyType: RANGE
          Projection:
            ProjectionType: ALL

  MessagesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ai-agent-messages
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: S
        - AttributeName: tenantId
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: SessionTimestampIndex
          KeySchema:
            - AttributeName: sessionId
              KeyType: HASH
            - AttributeName: timestamp
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: TenantTimestampIndex
          KeySchema:
            - AttributeName: tenantId
              KeyType: HASH
            - AttributeName: timestamp
              KeyType: RANGE
          Projection:
            ProjectionType: ALL

Outputs:
  SessionsTableName:
    Description: Name of the sessions table
    Value: !Ref SessionsTable
    Export:
      Name: !Sub "${AWS::StackName}-SessionsTable"

  MessagesTableName:
    Description: Name of the messages table
    Value: !Ref MessagesTable
    Export:
      Name: !Sub "${AWS::StackName}-MessagesTable"
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# DynamoDB Table Names
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
DYNAMODB_MESSAGES_TABLE=ai-agent-messages

# API Server Configuration
API_SERVER_URL=https://your-api-server.com
API_SERVER_KEY=your_api_server_key
```

## IAM Permissions

The AWS credentials need the following DynamoDB permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/ai-agent-sessions",
        "arn:aws:dynamodb:*:*:table/ai-agent-sessions/index/*",
        "arn:aws:dynamodb:*:*:table/ai-agent-messages",
        "arn:aws:dynamodb:*:*:table/ai-agent-messages/index/*"
      ]
    }
  ]
}
```

## Testing the Setup

You can test the DynamoDB connection by running:

```bash
# Test session creation
curl -X POST http://localhost:3000/agent/process \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test-tenant" \
  -H "x-user-id: test-user" \
  -H "x-location-id: test-location" \
  -d '{"message": "Hello, this is a test message"}'

# Test conversation retrieval
curl -X GET "http://localhost:3000/agent/conversations/test-tenant/users/test-user"
```

## Performance Considerations

1. **Read Capacity**: The GSIs will help with efficient querying by session and tenant
2. **Write Capacity**: Sessions and messages are written independently
3. **Storage**: Messages can grow large over time - consider implementing TTL for old messages
4. **Cost**: PAY_PER_REQUEST billing is cost-effective for variable workloads

## Backup and Recovery

Consider setting up:
- Point-in-time recovery for critical data
- On-demand backups for compliance
- Cross-region replication for disaster recovery 