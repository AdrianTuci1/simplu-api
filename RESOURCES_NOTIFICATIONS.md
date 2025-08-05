# Resources Notifications System

This document describes the resources notification system that allows the resources server to notify Elixir of successful updates, which then pushes those updates to clients via WebSocket.

## Architecture

```
                    ┌─── App (via Kinesis) ───┐
                    ↓                         ↓
            Resources Server ──────→ Notification Hub ←──── Frontend (WebSocket)
                                          ↕ (HTTP)
                                    AI Agent Server
```

### Resource Updates Flow:
1. **App** sends resource operations to **Resources Server** via Kinesis streams
2. **Resources Server** processes the operations and sends HTTP notifications to **Notification Hub**
3. **Notification Hub** broadcasts resource updates to connected clients via WebSocket

### AI Messages Flow:
4. **Frontend** sends messages to **Notification Hub** via HTTP
5. **Notification Hub** forwards messages to **AI Agent Server** via HTTP
6. **AI Agent Server** processes messages and sends responses back to **Notification Hub** via HTTP
7. **Notification Hub** broadcasts AI responses to connected clients via WebSocket

## Components

### App (Node.js/NestJS)

- **Port**: 3000
- **Purpose**: Main application that sends resource operations
- **Kinesis Streams**:
  - Publishes to: `resources-stream` (to resources-server)

#### Key Features:
- AWS Kinesis integration for sending resource operations
- Citrus sharding service integration for multi-tenant data management
- Cognito authentication
- DynamoDB integration for business info
- Redis caching

### Resources Server (Node.js/NestJS)

- **Port**: 3002 (mapped from internal 3001)
- **Purpose**: Handles CREATE, READ, UPDATE, DELETE operations for resources
- **Kinesis Streams**:
  - Consumes from: `resources-stream` (from app)
- **HTTP Notifications**:
  - Sends to: `notification-hub:4000/api/notifications`

#### Key Features:
- AWS Kinesis integration for reliable message processing
- Citrus sharding service integration for multi-tenant data management
- Cognito authentication
- HTTP notifications to Notification Hub
- Swagger API documentation at `/api`
- Health check endpoint at `/health`

### Notification Hub (Phoenix/Elixir)

- **HTTP Port**: 4000
- **Purpose**: Central hub for notifications and AI agent communication
- **HTTP Endpoints**:
  - Receives resource notifications: `POST /api/notifications`
  - Receives messages for AI agent: `POST /api/messages`
  - Health check: `GET /api/health`

#### Key Features:
- HTTP API for receiving resource notifications from resources-server
- HTTP API for receiving messages from frontend to send to AI agent
- HTTP client for communicating with AI agent server
- Phoenix Channels for WebSocket communication
- Real-time broadcasting to business/location-specific channels
- Test client at `/test`

## WebSocket Channels

### Channel Topics

- `resources:{businessId}-{locationId}` - Specific business-location updates
- `resources:{businessId}` - Business-wide updates

### Message Format

```json
{
  "type": "resource_created|resource_updated|resource_deleted|resource_patched",
  "resourceType": "reservation|menu|staff|etc",
  "businessId": "business-123",
  "locationId": "location-456",
  "resourceId": "resource-789",
  "shardId": "shard-001",
  "timestamp": "2025-01-08T10:00:00.000Z"
}
```

## Environment Variables

### App

```bash
# Application
NODE_ENV=development
PORT=3000

# AWS/Kinesis
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
KINESIS_STREAM_NAME=resources-stream

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d

# Cognito
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# DynamoDB
DYNAMODB_BUSINESS_INFO_TABLE=business-info
DYNAMODB_ENDPOINT=your-dynamodb-endpoint

# Citrus Sharding
CITRUS_SERVER_URL=http://citrus:8080
CITRUS_API_KEY=your-citrus-api-key

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### Resources Server

```bash
# Application
NODE_ENV=development
PORT=3001

# AWS/Kinesis
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
KINESIS_STREAM_NAME=resources-stream

# Notification Hub
ELIXIR_URL=http://notification-hub:4000

# Citrus Sharding
CITRUS_SERVER_URL=http://citrus:8080
CITRUS_API_KEY=your-citrus-api-key

# Cognito
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
```

### Notification Hub

```bash
# HTTP Configuration
AI_AGENT_HTTP_URL=http://ai-agent-server:3000

# Application
EXS_SECRET=your-secret-key
```

### AI Agent Server

```bash
# HTTP Configuration
NOTIFICATION_HUB_HTTP_URL=http://notification-hub:4000

# AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
```

## Usage

### 1. Start the Services

```bash
docker-compose up resources-server elixir
```

### 2. Test WebSocket Connection

Visit `http://localhost:4000/test` to access the test client.

1. Enter a Business ID and Location ID
2. Click "Connect" to establish WebSocket connection
3. The client will join the `resources:{businessId}-{locationId}` channel

### 3. Send Resource Operations

Send HTTP requests to the resources server:

```bash
# Create a resource
curl -X POST http://localhost:3002/resources/business-123-location-456 \
  -H "Content-Type: application/json" \
  -H "X-Business-ID: business-123" \
  -H "X-Location-ID: location-456" \
  -H "X-Resource-Type: reservation" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "data": {
      "customerName": "John Doe",
      "date": "2025-01-10",
      "time": "19:00",
      "partySize": 4
    }
  }'
```

### 4. Receive Real-time Updates

Connected WebSocket clients will automatically receive notifications when:
- Resources are created, updated, or deleted
- Operations are processed successfully by the resources server

## API Endpoints

### Resources Server

- `POST /resources/{businessId}-{locationId}` - Create resource
- `PUT /resources/{businessId}-{locationId}` - Update resource (full)
- `PATCH /resources/{businessId}-{locationId}` - Update resource (partial)
- `DELETE /resources/{businessId}-{locationId}` - Delete resource
- `GET /health` - Health check
- `GET /api` - Swagger documentation

### Elixir Service

- `GET /health` - Health check
- `GET /test` - Test WebSocket client
- `WS /socket` - WebSocket endpoint

## Client Integration

### JavaScript Example

```javascript
// Connect to WebSocket
const socket = new Phoenix.Socket('/socket', {});
socket.connect();

// Join business-location channel
const channel = socket.channel('resources:business-123-location-456', {});
channel.join()
  .receive('ok', resp => console.log('Joined successfully', resp))
  .receive('error', resp => console.log('Unable to join', resp));

// Listen for resource updates
channel.on('resource_update', payload => {
  console.log('Resource updated:', payload);
  // Update your UI based on the notification
  updateResourceInUI(payload);
});
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';
import { Socket } from 'phoenix';

function useResourceUpdates(businessId, locationId) {
  const [updates, setUpdates] = useState([]);
  
  useEffect(() => {
    const socket = new Socket('/socket', {});
    socket.connect();
    
    const channel = socket.channel(`resources:${businessId}-${locationId}`, {});
    channel.join();
    
    channel.on('resource_update', (payload) => {
      setUpdates(prev => [...prev, payload]);
    });
    
    return () => {
      channel.leave();
      socket.disconnect();
    };
  }, [businessId, locationId]);
  
  return updates;
}
```

## Monitoring

### Health Checks

Both services provide health check endpoints:

```bash
# Resources Server
curl http://localhost:3002/health

# Elixir Service  
curl http://localhost:4000/health
```

### Logs

Monitor the services for processing information:

```bash
# View resources server logs
docker-compose logs -f resources-server

# View Elixir service logs
docker-compose logs -f elixir
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if Elixir service is running on port 4000
   - Verify CORS settings allow your client origin

2. **No Notifications Received**
   - Verify AWS credentials are configured correctly
   - Check Kinesis stream names match between services
   - Ensure resources server is successfully processing requests

3. **Authentication Errors**
   - Verify Cognito configuration in resources server
   - Check JWT token is valid and not expired

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# Resources Server
LOG_LEVEL=debug

# Elixir Service  
LOG_LEVEL=debug
```