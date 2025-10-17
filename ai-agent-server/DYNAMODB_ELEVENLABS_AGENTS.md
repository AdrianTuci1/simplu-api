# 🗄️ DynamoDB Table: Eleven Labs Agents

## Overview

Tabel DynamoDB pentru stocarea configurațiilor Eleven Labs per tenant.

**Beneficii DynamoDB vs RDS**:
- ✅ Acces rapid (< 10ms latency)
- ✅ Scalabilitate automată
- ✅ Pay-per-request (nu plătim pentru capacitate inutilizată)
- ✅ Ideal pentru configurații per tenant
- ✅ Nu necesită migrații schema

---

## 📊 Table Structure

```
Table Name: elevenlabs-agents
Primary Key (HASH): businessId (String)
Sort Key (RANGE): locationId (String)
Billing Mode: PAY_PER_REQUEST
```

### Item Schema

```typescript
{
  businessId: string;           // PK - Business ID
  locationId: string;           // SK - Location ID
  enabled: boolean;             // Active/Inactive flag
  agentId: string;              // Eleven Labs agent ID (din contul global)
  voiceId: string;              // Voice ID din Eleven Labs
  greeting: string;             // Greeting message
  customPrompt?: string;        // Custom system prompt (optional)
  phoneNumber?: string;         // Dedicated phone number (optional)
  conversationSettings: {
    maxDuration: number;        // Max duration în secunde (default: 300)
    recordCalls: boolean;       // Record conversations (default: true)
    sendTranscripts: boolean;   // Send transcripts to customer (default: false)
  };
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}
```

### Example Item

```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "enabled": true,
  "agentId": "agent_xyz123abc",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "greeting": "Bună ziua! Sunt asistentul clinicii dentare. Cu ce vă pot ajuta astăzi?",
  "customPrompt": "You are a helpful dental assistant...",
  "conversationSettings": {
    "maxDuration": 300,
    "recordCalls": true,
    "sendTranscripts": false
  },
  "createdAt": "2025-10-15T10:00:00.000Z",
  "updatedAt": "2025-10-15T10:00:00.000Z"
}
```

---

## 🔧 Setup

### 1. Create Table

```bash
cd ai-agent-server
./scripts/create-elevenlabs-agents-table.sh
```

Sau manual:

```bash
aws dynamodb create-table \
  --table-name elevenlabs-agents \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
    AttributeName=locationId,AttributeType=S \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
    AttributeName=locationId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1
```

### 2. Environment Variables

```bash
# .env
DYNAMODB_ELEVENLABS_AGENTS_TABLE=elevenlabs-agents
ELEVENLABS_API_KEY=your_global_api_key  # Un singur API key pentru toate tenant-urile
AI_AGENT_SERVER_URL=https://your-ai-agent-server.com
```

---

## 🔑 API Key Management

### ⚠️ Important: Un singur API key global

- **NU** salvăm API key per tenant în DynamoDB
- Un singur API key în `ELEVENLABS_API_KEY` (environment variable)
- Toate agent-urile sunt create pe același cont Eleven Labs
- Diferențierea se face prin `agentId` și `metadata.businessId` în webhook

### De ce așa?

1. **Cost-effective**: Un singur cont Eleven Labs pentru toți clienții
2. **Simplu de gestionat**: Un singur API key de actualizat
3. **Securitate**: API key în env vars, nu în database
4. **Scalabilitate**: Nu mai trebuie să gestionăm conturi separate per tenant

---

## 📝 Operations

### Create Agent Configuration

```typescript
// Service method
await elevenLabsService.activate({
  businessId: 'B0100001',
  locationId: 'L0100001',
  voiceId: '21m00Tcm4TlvDq8ikWAM',
  greeting: 'Bună ziua! Cu ce vă pot ajuta?',
  customPrompt: 'You are a helpful assistant...',
  businessName: 'Clinica Dentara XYZ',
});

// DynamoDB PutItem
{
  TableName: 'elevenlabs-agents',
  Item: {
    businessId: 'B0100001',
    locationId: 'L0100001',
    enabled: true,
    agentId: 'agent_xyz123',  // returnat de Eleven Labs API
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    greeting: 'Bună ziua!...',
    conversationSettings: { ... },
    createdAt: '2025-10-15T10:00:00Z',
    updatedAt: '2025-10-15T10:00:00Z'
  }
}
```

### Get Configuration

```typescript
// Service method
const config = await elevenLabsService.getConfig('B0100001', 'L0100001');

// DynamoDB GetItem
{
  TableName: 'elevenlabs-agents',
  Key: {
    businessId: 'B0100001',
    locationId: 'L0100001'
  }
}
```

### Update Configuration

```typescript
// Service method
await elevenLabsService.updateConfig('B0100001', 'L0100001', {
  voiceId: 'new_voice_id',
  greeting: 'Updated greeting',
  conversationSettings: {
    maxDuration: 600,
    recordCalls: true,
    sendTranscripts: true
  }
});

// DynamoDB UpdateItem
{
  TableName: 'elevenlabs-agents',
  Key: { businessId: 'B0100001', locationId: 'L0100001' },
  UpdateExpression: 'SET voiceId = :v, greeting = :g, conversationSettings = :c, updatedAt = :u',
  ExpressionAttributeValues: { ... }
}
```

### Deactivate (disable)

```typescript
// Service method
await elevenLabsService.deactivate('B0100001', 'L0100001');

// DynamoDB UpdateItem - doar disabled, păstrăm agentId
{
  TableName: 'elevenlabs-agents',
  Key: { businessId: 'B0100001', locationId: 'L0100001' },
  UpdateExpression: 'SET enabled = :false, updatedAt = :now'
}
```

### Delete Configuration

```typescript
// Service method
await elevenLabsService.deleteConfig('B0100001', 'L0100001');

// DynamoDB DeleteItem
{
  TableName: 'elevenlabs-agents',
  Key: { businessId: 'B0100001', locationId: 'L0100001' }
}
```

### List All Agents for Business

```typescript
// Service method
const agents = await elevenLabsService.getAgentsByBusiness('B0100001');

// DynamoDB Query (toate locațiile pentru un business)
{
  TableName: 'elevenlabs-agents',
  KeyConditionExpression: 'businessId = :businessId',
  ExpressionAttributeValues: {
    ':businessId': 'B0100001'
  }
}
```

---

## 🔐 Access Patterns

### 1. Get Config by Business + Location (Primary)
```
Query: businessId = 'B0100001' AND locationId = 'L0100001'
Type: GetItem (O(1))
Use case: Webhook handler, activation check
```

### 2. List All Agents for Business
```
Query: businessId = 'B0100001'
Type: Query on PK (efficient)
Use case: Admin dashboard, business overview
```

### 3. Check if Enabled
```
Query: businessId + locationId → check enabled flag
Type: GetItem (O(1))
Use case: Webhook validation
```

---

## 💰 Cost Estimate

### Pay-Per-Request Pricing (us-east-1)

- **Write**: $1.25 per million requests
- **Read**: $0.25 per million requests

### Typical Usage per Tenant
- **Activation**: 1 write ($0.00000125)
- **Config check per call**: 1 read ($0.00000025)
- **100,000 calls/month**: $0.025/month per tenant
- **1000 tenants**: ~$25/month total

**Extrem de cost-effective pentru configurație!**

---

## 🧪 Testing

### Manual Insert (pentru development)

```bash
aws dynamodb put-item \
  --table-name elevenlabs-agents \
  --item '{
    "businessId": {"S": "B0100001"},
    "locationId": {"S": "L0100001"},
    "enabled": {"BOOL": true},
    "agentId": {"S": "agent_test123"},
    "voiceId": {"S": "21m00Tcm4TlvDq8ikWAM"},
    "greeting": {"S": "Test greeting"},
    "conversationSettings": {
      "M": {
        "maxDuration": {"N": "300"},
        "recordCalls": {"BOOL": true},
        "sendTranscripts": {"BOOL": false}
      }
    },
    "createdAt": {"S": "2025-10-15T10:00:00Z"},
    "updatedAt": {"S": "2025-10-15T10:00:00Z"}
  }' \
  --region eu-central-1
```

### Query Test

```bash
# Get specific config
aws dynamodb get-item \
  --table-name elevenlabs-agents \
  --key '{"businessId": {"S": "B0100001"}, "locationId": {"S": "L0100001"}}' \
  --region eu-central-1

# List all agents for business
aws dynamodb query \
  --table-name elevenlabs-agents \
  --key-condition-expression "businessId = :bid" \
  --expression-attribute-values '{":bid": {"S": "B0100001"}}' \
  --region eu-central-1
```

---

## 📈 Monitoring

### CloudWatch Metrics

- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `UserErrors` (e.g., item not found)
- `SystemErrors`

### Alarms

```bash
# High read latency
aws cloudwatch put-metric-alarm \
  --alarm-name elevenlabs-agents-high-latency \
  --alarm-description "Alert when read latency > 50ms" \
  --metric-name SuccessfulRequestLatency \
  --namespace AWS/DynamoDB \
  --statistic Average \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold
```

---

## 🔄 Migration from RDS (if needed)

Dacă ați avut configurații în RDS, scriptul de migrare:

```javascript
// scripts/migrate-elevenlabs-config-to-dynamodb.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { Pool } = require('pg');

const pool = new Pool({ /* RDS config */ });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function migrate() {
  const result = await pool.query(`
    SELECT * FROM resources 
    WHERE resource_type = 'setting' 
    AND resource_id = 'elevenlabs-config'
  `);

  for (const row of result.rows) {
    const [businessId, locationId] = row.business_location_id.split(':');
    
    await dynamoClient.send(new PutCommand({
      TableName: 'elevenlabs-agents',
      Item: {
        businessId,
        locationId,
        ...row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }));
    
    console.log(`Migrated ${businessId}:${locationId}`);
  }
}

migrate();
```

---

## 📚 References

- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Pay-Per-Request Pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/)
- [Eleven Labs API Docs](https://elevenlabs.io/docs)

---

**Table created and ready for production! 🚀**

