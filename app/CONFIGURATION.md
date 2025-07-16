# Configuration Guide

## Architecture Overview

This application has been refactored to use:
- **AWS Cognito** for authentication (instead of local JWT)
- **DynamoDB** for business information storage
- **Citrus server** for database sharding management
- **businessId + locationId** combination for shard determination

## Required Environment Variables

### Node Environment
```bash
NODE_ENV=development
PORT=3000
```

### AWS Configuration
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### AWS Cognito Configuration
```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_cognito_client_id_here
```

### DynamoDB Configuration (for Business Info)
```bash
# For local development
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_BUSINESS_INFO_TABLE=business-info

# For production, remove DYNAMODB_ENDPOINT to use AWS DynamoDB
```

### Citrus Sharding Configuration
```bash
CITRUS_SERVER_URL=http://citrus.server.com:8080
CITRUS_API_KEY=your_citrus_api_key_here
CITRUS_TIMEOUT=5000
CITRUS_RETRY_ATTEMPTS=3
```

### Redis Configuration
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Kafka Configuration
```bash
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=simplu-api
KAFKA_GROUP_ID=simplu-api-group
```

### Application Configuration
```bash
API_VERSION=v1
SWAGGER_ENABLED=true
```

## API Usage

### Authentication
All requests must include a valid AWS Cognito access token:
```
Authorization: Bearer <cognito_access_token>
```

### Required Headers
All resource operations require these headers:
```
X-Business-ID: business123
X-Location-ID: location456
X-Resource-Type: timeline|clients|services|etc
```

### API Endpoints

#### Business Information
```
GET /api/business-info/{businessId}
```

#### Resources (Unified Endpoint)
```
GET    /api/resources/{businessId}-{locationId}
POST   /api/resources/{businessId}-{locationId}
PUT    /api/resources/{businessId}-{locationId}
PATCH  /api/resources/{businessId}-{locationId}
DELETE /api/resources/{businessId}-{locationId}
```

#### Authentication
```
GET /auth/validate
GET /auth/user
```

## Cognito User Attributes

Users in Cognito should have these custom attributes:
- `custom:business_id` - The business ID the user belongs to
- `custom:location_id` - The location ID (if user is location-specific)
- `custom:roles` - JSON array of user roles: ["admin", "manager", "staff"]
- `custom:permissions` - JSON array of permissions: ["read:resources", "write:resources"]

## Shard Management

The system uses **businessId + locationId** to determine the appropriate shard:
- Each business-location combination maps to a specific database shard
- Shard assignment is managed by the external Citrus server
- Consistent hashing ensures same business-location always goes to same shard

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy the values above to your .env file)

3. Start local services:
```bash
# Start DynamoDB Local (optional for development)
docker run -p 8000:8000 amazon/dynamodb-local

# Start Redis
docker run -p 6379:6379 redis:alpine

# Start Kafka (if needed)
docker-compose up kafka zookeeper
```

4. Run the application:
```bash
npm run start:dev
```

## Migration Notes

- **Removed**: Local JWT authentication, all individual resource modules (clients, employees, etc.)
- **Added**: Cognito authentication, unified resources endpoint, Citrus sharding integration
- **Changed**: Business-info now comes from DynamoDB instead of PostgreSQL
- **Required**: Both businessId and locationId are now mandatory for all resource operations 