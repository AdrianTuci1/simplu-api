# Database Architecture - Simplu API

## Overview

The Simplu API uses a **hybrid database architecture** with two distinct database systems:

1. **AWS DynamoDB** - Business metadata storage (External Service)
2. **PostgreSQL (Citrus-Managed Shards)** - Resource data storage (External Service)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIMPLU API                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Application Layer                       │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │   Auth      │  │  Resources  │  │  Business   │         │ │
│  │  │  Service    │  │  Service    │  │   Info      │         │ │
│  │  │             │  │             │  │  Service    │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │        EXTERNAL SERVICES        │
                    │                                 │
                    │  ┌─────────────────────────────┐ │
                    │  │      AWS COGNITO            │ │
                    │  │   Authentication Service    │ │
                    │  │                             │ │
                    │  │  • User Authentication      │ │
                    │  │  • JWT Token Validation     │ │
                    │  │  • User Pool Management     │ │
                    │  └─────────────────────────────┘ │
                    │                                 │
                    │  ┌─────────────────────────────┐ │
                    │  │      AWS DYNAMODB           │ │
                    │  │    Business Info Store      │ │
                    │  │                             │ │
                    │  │  • Business Metadata        │ │
                    │  │  • Location Information     │ │
                    │  │  • Settings & Permissions   │ │
                    │  └─────────────────────────────┘ │
                    │                                 │
                    │  ┌─────────────────────────────┐ │
                    │  │      CITRUS SERVER          │ │
                    │  │   Shard Management Service  │ │
                    │  │                             │ │
                    │  │  • Shard Assignment Logic   │ │
                    │  │  • Capacity Management      │ │
                    │  │  • Health Monitoring        │ │
                    │  │  • Connection Provisioning  │ │
                    │  └─────────────────────────────┘ │
                    └─────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │      DATABASE SHARDS            │
                    │    (PostgreSQL Instances)       │
                    │                                 │
                    │  ┌─────────────┐  ┌─────────────┐ │
                    │  │   Shard 1   │  │   Shard 2   │ │
                    │  │ (3 business)│  │ (3 business)│ │
                    │  │             │  │             │ │
                    │  └─────────────┘  └─────────────┘ │
                    │                                 │
                    │  ┌─────────────┐  ┌─────────────┐ │
                    │  │   Shard 3   │  │   Shard N   │ │
                    │  │ (3 business)│  │ (3 business)│ │
                    │  │             │  │             │ │
                    │  └─────────────┘  └─────────────┘ │
                    └─────────────────────────────────┘
```

## Service Communication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Simplu API    │    │   External      │    │   Database      │
│                 │    │   Services      │    │   Shards        │
│                 │    │                 │    │                 │
│ 1. Authenticate │───▶│ AWS Cognito     │    │                 │
│    User         │    │                 │    │                 │
│                 │    │ 2. Validate     │    │                 │
│ 3. Get Business │◀───│ JWT Token       │    │                 │
│    Info         │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 4. Request      │───▶│ AWS DynamoDB    │    │                 │
│    Business     │    │                 │    │                 │
│    Metadata     │    │ 5. Return       │    │                 │
│                 │    │ Business Info   │    │                 │
│ 6. Request      │───▶│ Citrus Server   │    │                 │
│    Shard        │    │                 │    │                 │
│    Assignment   │    │ 7. Determine    │    │                 │
│                 │    │ Shard & Return  │    │                 │
│ 8. Connect to   │    │ Connection      │    │                 │
│    Assigned     │    │ String          │    │                 │
│    Shard        │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 9. Perform      │──────────────────────────▶│ PostgreSQL      │
│    Resource     │    │                 │    │ Shard (Direct)  │
│    Operations   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Business Info Database (AWS DynamoDB - External Service)

### Purpose
- Stores **business metadata** only
- Not sharded - single table for all businesses
- Fast lookups for business information
- **External service** - Simplu API communicates via AWS SDK

### Data Structure
```typescript
interface BusinessInfo {
  id: string;                    // Business ID
  name: string;                  // Business name
  type: 'dental' | 'gym' | 'hotel';
  locations: Location[];
  settings: BusinessSettings;
  permissions: BusinessPermissions;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: string;                    // Location ID
  name: string;                  // Location name
  address: string;
  phone: string;
  email: string;
  active: boolean;
}
```

### Table Configuration
- **Table Name**: `business-info` (configurable via `DYNAMODB_BUSINESS_INFO_TABLE`)
- **Primary Key**: `id` (Business ID)
- **No Sharding**: Single table for all businesses
- **External Service**: Accessed via AWS SDK

### Usage
```typescript
// Get business info from external DynamoDB service
const businessInfo = await dynamoDBService.getBusinessInfo(businessId);

// Update business settings in external DynamoDB service
await dynamoDBService.updateBusinessSettings(businessId, settings);
```

## 2. Main Database (PostgreSQL - Citrus-Managed External Shards)

### Purpose
- Stores **all resource data** (patients, appointments, etc.)
- Sharded based on `businessId + locationId` combination
- **ALL SHARD MANAGEMENT HANDLED BY EXTERNAL CITRUS SERVER**
- **External shards** - Simplu API connects directly to assigned shards

### Citrus Sharding Service (External)

#### What External Citrus Server Handles
- **Automatic shard creation** when needed
- **Business assignment logic** to appropriate shards
- **Capacity management** (e.g., 3 businesses per shard)
- **Shard health monitoring** and failover
- **Connection string provision** for each business+location
- **Shard scaling** and performance optimization

#### Shard Determination Flow
```typescript
// 1. Application requests shard from external Citrus server
const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);

// 2. External Citrus determines appropriate shard (creates new if needed)
// 3. External Citrus returns connection details
const { shardId, connectionString, isActive } = shardConnection;

// 4. Application connects directly to external assigned shard
const shardConnection = await createConnection(connectionString);
```

### Resource Data Structure
```typescript
// Unified resource table structure
interface Resource {
  id: string;                    // businessId-locationId
  businessType: 'dental' | 'gym' | 'hotel';
  resourceName: string;          // 'patients', 'appointments', etc.
  resourceId: string;            // Unique resource identifier
  data: any;                     // JSON data (typed per business)
  date: string;                  // Creation date
  lastUpdated: string;           // Last update timestamp
}
```

### Citrus API Integration (External Service)

#### Shard Registration
```typescript
// Register new business+location with external Citrus server
const shardConnection = await citrusShardingService.registerBusinessLocation(
  businessId, 
  locationId, 
  businessType
);
```

#### Shard Health Monitoring
```typescript
// Get health status of all shards from external Citrus
const shardHealth = await citrusShardingService.getShardsHealthStatus();

// Get shard usage statistics from external Citrus
const usageStats = await citrusShardingService.getShardUsageStats();
// Returns: [{ shardId: 'shard-01', businessCount: 2, maxBusinesses: 3, usagePercentage: 66.67, isActive: true }]
```

#### Capacity Checking
```typescript
// Check if shard can accept new business via external Citrus
const canAccept = await citrusShardingService.canAddBusinessToShard(shardId);
```

## 3. Database Operations Flow

### Resource Operations
```typescript
// 1. Get business info from external DynamoDB service
const businessInfo = await dynamoDBService.getBusinessInfo(businessId);

// 2. Get shard connection from external Citrus server
const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);

// 3. Connect to external Citrus-assigned shard
const shardDb = await createShardConnection(shardConnection.connectionString);

// 4. Perform resource operation on external shard
const result = await shardDb.query(
  'SELECT * FROM resources WHERE id = $1',
  [`${businessId}-${locationId}`]
);
```

### Business Info Operations
```typescript
// Direct DynamoDB operations via external AWS service
const businessInfo = await dynamoDBService.getClient().get({
  TableName: dynamoDBService.getTableName(),
  Key: { id: businessId }
});
```

## 4. Configuration

### Environment Variables

#### Main Database (Citrus-Managed External Shards)
```bash
# Basic database configuration (for external Citrus server)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=simplu
```

#### External Citrus Sharding Service
```bash
# External Citrus server configuration (REQUIRED)
CITRUS_SERVER_URL=http://localhost:8080
CITRUS_API_KEY=your-citrus-api-key
CITRUS_TIMEOUT=5000
CITRUS_RETRY_ATTEMPTS=3
```

#### External Business Info (DynamoDB)
```bash
# AWS configuration for external DynamoDB service
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# DynamoDB configuration for external service
DYNAMODB_BUSINESS_INFO_TABLE=business-info
DYNAMODB_ENDPOINT=http://localhost:8000  # For local development
```

#### External Authentication (Cognito)
```bash
# External AWS Cognito configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 5. Benefits of This Architecture

### Performance
- **Fast business lookups**: External DynamoDB provides sub-millisecond access to business metadata
- **Scalable resource storage**: External Citrus-managed PostgreSQL shards handle large resource datasets
- **Automatic load distribution**: External Citrus ensures optimal business distribution across shards
- **Direct connections**: No proxy overhead when connecting to external shards

### Scalability
- **Automatic scaling**: External Citrus creates new shards as needed
- **Zero manual intervention**: No need to manually configure or manage external shards
- **Dynamic capacity management**: External Citrus handles business distribution and capacity limits
- **Independent scaling**: Each external service can scale independently

### Reliability
- **Fault isolation**: Issues in one external shard don't affect others
- **Automatic failover**: External Citrus can redirect to healthy shards
- **Health monitoring**: Continuous monitoring of all external shards
- **Predictable distribution**: Consistent hashing ensures reliable shard assignment
- **External service redundancy**: Each external service can have its own redundancy

### Cost Optimization
- **DynamoDB**: Pay-per-request for business metadata (low volume, high value)
- **PostgreSQL**: Traditional database costs for resource data (high volume, predictable patterns)
- **Efficient resource utilization**: External Citrus optimizes shard usage automatically
- **Service separation**: Each external service can be optimized independently

## 6. Monitoring and Maintenance

### External Service Health Monitoring
```typescript
// Get all shard health status from external Citrus
const shardHealth = await citrusShardingService.getShardsHealthStatus();

// Monitor for unhealthy external shards
const unhealthyShards = shardHealth.filter(shard => !shard.isActive);

// Get usage statistics from external Citrus
const usageStats = await citrusShardingService.getShardUsageStats();
const nearCapacity = usageStats.filter(stat => stat.usagePercentage > 80);
```

### Performance Metrics
- **External Citrus server health**: Monitor external Citrus server availability and performance
- **External shard response times**: Monitor each external shard's performance through Citrus
- **External business distribution**: External Citrus ensures even distribution across shards
- **External DynamoDB metrics**: Monitor external business info access patterns
- **External Cognito metrics**: Monitor external authentication performance

### Backup and Recovery
- **External DynamoDB**: Automated backups with point-in-time recovery
- **External PostgreSQL shards**: Individual backup strategies per external shard (managed by Citrus)
- **Cross-shard consistency**: Ensure external business info matches external resource data

## 7. Deployment and Setup

### Initial Setup
1. **Deploy external Citrus server** with proper configuration
2. **Create external DynamoDB table** for business info
3. **Configure external Cognito** user pool and client
4. **Configure external Citrus API key** and server URL
5. **Deploy application** with proper environment variables

### External Service Requirements
- **External Citrus server must be running** before starting the application
- **External Citrus manages all shard creation** and database setup
- **External Citrus provides API endpoints** for shard management
- **External Citrus handles capacity planning** and business distribution
- **External AWS services** (DynamoDB, Cognito) must be accessible

### Data Migration
1. **Register existing businesses** with external Citrus
2. **External Citrus assigns appropriate shards** automatically
3. **Migrate data** to external Citrus-assigned shards
4. **Update business info** in external DynamoDB if needed
5. **Verify data integrity** across all external shards

## 8. External Citrus API Endpoints

### Required External Citrus Endpoints
```typescript
// Get shard for business+location from external Citrus
GET /api/shard/{businessId-locationId}

// Register new business+location with external Citrus
POST /api/register

// Get all shards health status from external Citrus
GET /api/shards/health

// Check shard capacity via external Citrus
GET /api/shard/{shardId}/capacity
```

### Expected External Citrus Responses
```typescript
interface CitrusShardResponse {
  shardId: string;
  connectionString: string;
  isActive: boolean;
  lastHealthCheck: string;
  businessCount: number;
  maxBusinesses: number;
}
```

This architecture provides a robust, scalable foundation for the Simplu API with **all database and authentication services as external services** - everything is handled by specialized external services while Simplu API focuses purely on business logic and orchestration. 