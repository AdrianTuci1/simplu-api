# Agent ↔ Frontend Resource Communication

## Overview
The agent can now request resources from the frontend through WebSocket communication, enabling real-time data exchange between the AI agent and the frontend application.

## 🔄 **Communication Flow**

### **1. Agent → Frontend (Resource Request)**
```typescript
// Agent requests resources from frontend
const result = await agentWebSocketHandler.requestFrontendResources(sessionId, {
  sessionId: 'session_123',
  requestType: 'get_services',
  parameters: { businessId: 'biz_456', locationId: 'loc_789' },
  businessId: 'biz_456'
});
```

### **2. Frontend → Agent (Resource Response)**
```typescript
// Frontend provides resources to agent
const result = await agentWebSocketHandler.handleFrontendResourceResponse(sessionId, {
  sessionId: 'session_123',
  resources: {
    services: [...],
    appointments: [...],
    businessInfo: {...}
  },
  businessId: 'biz_456'
});
```

## 📡 **WebSocket Message Types**

### **Agent Request Messages**
- **`agent_request_frontend_resources`**: Agent requests resources from frontend
- **`agent_request_resources`**: Broadcast to business for resource requests

### **Frontend Response Messages**
- **`frontend_provide_resources`**: Frontend provides resources to agent
- **`agent_resources_available`**: Notify agent about available resources

## 🛠️ **Supported Resource Types**

### **1. Services (`get_services`)**
```typescript
{
  requestType: 'get_services',
  parameters: { businessId, locationId, category }
}
// Returns: { services: [{ id, name, price, duration, ... }] }
```

### **2. Appointments (`get_appointments`)**
```typescript
{
  requestType: 'get_appointments',
  parameters: { businessId, date, status }
}
// Returns: { appointments: [{ id, date, time, patient, ... }] }
```

### **3. Business Info (`get_business_info`)**
```typescript
{
  requestType: 'get_business_info',
  parameters: { businessId }
}
// Returns: { businessInfo: { name, address, phone, email, ... } }
```

### **4. Available Dates (`get_available_dates`)**
```typescript
{
  requestType: 'get_available_dates',
  parameters: { businessId, serviceId, dateRange }
}
// Returns: { availableDates: [{ date, slots: [...] }] }
```

## 🔧 **Implementation Details**

### **Agent WebSocket Handler Methods**

#### **`requestFrontendResources()`**
- **Purpose**: Request resources from frontend
- **WebSocket**: Broadcasts `agent_request_resources` to business
- **Response**: Returns resources or simulated data
- **Error Handling**: Comprehensive error handling with fallbacks

#### **`handleFrontendResourceResponse()`**
- **Purpose**: Process resources provided by frontend
- **Storage**: Stores resources in session/database
- **Notification**: Broadcasts `agent_resources_available` to business
- **Error Handling**: Validates and processes resource data

### **WebSocket Gateway Handlers**

#### **`handleAgentRequestFrontendResources()`**
- **Event**: `agent_request_frontend_resources`
- **Process**: Validates request and calls agent handler
- **Response**: Sends `agent_frontend_resources_response`
- **Error**: Sends `agent_frontend_error` on failure

#### **`handleFrontendProvideResources()`**
- **Event**: `frontend_provide_resources`
- **Process**: Validates response and calls agent handler
- **Response**: Sends `frontend_resources_provided`
- **Error**: Sends `frontend_provision_error` on failure

## 📋 **Usage Examples**

### **Example 1: Agent Requests Services**
```typescript
// Agent requests services from frontend
const services = await agentWebSocketHandler.requestFrontendResources(sessionId, {
  sessionId: 'session_123',
  requestType: 'get_services',
  parameters: { businessId: 'biz_456' },
  businessId: 'biz_456'
});

// Response:
{
  success: true,
  resources: {
    services: [
      { id: '1', name: 'Consultație', price: 100, duration: 30 },
      { id: '2', name: 'Tratament', price: 200, duration: 60 }
    ]
  },
  message: 'Resursele au fost solicitate de la frontend'
}
```

### **Example 2: Frontend Provides Resources**
```typescript
// Frontend provides resources to agent
const result = await agentWebSocketHandler.handleFrontendResourceResponse(sessionId, {
  sessionId: 'session_123',
  resources: {
    services: [
      { id: '1', name: 'Consultație', price: 100, duration: 30 },
      { id: '2', name: 'Tratament', price: 200, duration: 60 }
    ],
    appointments: [
      { id: '1', date: '2024-01-15', time: '10:00', patient: 'John Doe' }
    ]
  },
  businessId: 'biz_456'
});

// Response:
{
  success: true,
  message: 'Resursele au fost primite de la frontend'
}
```

## 🔄 **WebSocket Message Flow**

### **Agent Request Flow**
```
1. Agent → WebSocket: agent_request_frontend_resources
2. WebSocket → Agent Handler: requestFrontendResources()
3. Agent Handler → WebSocket: Broadcast agent_request_resources
4. WebSocket → Frontend: agent_request_resources
5. Frontend → WebSocket: frontend_provide_resources
6. WebSocket → Agent Handler: handleFrontendResourceResponse()
7. Agent Handler → WebSocket: Broadcast agent_resources_available
8. WebSocket → Agent: agent_frontend_resources_response
```

### **Frontend Response Flow**
```
1. Frontend → WebSocket: frontend_provide_resources
2. WebSocket → Agent Handler: handleFrontendResourceResponse()
3. Agent Handler → WebSocket: Broadcast agent_resources_available
4. WebSocket → Agent: frontend_resources_provided
```

## 🛡️ **Error Handling**

### **Agent Request Errors**
- **Authentication**: Agent must be authenticated
- **Validation**: Request parameters must be valid
- **Timeout**: Requests have timeout handling
- **Fallback**: Simulated responses for testing

### **Frontend Response Errors**
- **Validation**: Resource data must be valid
- **Storage**: Resources must be stored successfully
- **Notification**: Notifications must be sent
- **Error Recovery**: Graceful error handling

## 🔧 **Configuration**

### **Environment Variables**
```bash
# WebSocket configuration
WEBSOCKET_PORT=3002
WEBSOCKET_PATH=/socket/websocket

# Agent configuration
AGENT_SESSION_TIMEOUT=300000  # 5 minutes
AGENT_RESOURCE_TIMEOUT=30000   # 30 seconds
```

### **WebSocket Events**
```typescript
// Agent events
'agent_request_frontend_resources'
'agent_frontend_resources_response'
'agent_frontend_error'

// Frontend events
'frontend_provide_resources'
'frontend_resources_provided'
'frontend_provision_error'

// Broadcast events
'agent_request_resources'
'agent_resources_available'
```

## 🧪 **Testing**

### **Unit Testing**
```typescript
// Test agent resource requests
const result = await agentWebSocketHandler.requestFrontendResources(sessionId, payload);
expect(result.success).toBe(true);
expect(result.resources).toBeDefined();
```

### **Integration Testing**
```typescript
// Test WebSocket communication
const client = new WebSocket('ws://localhost:3002/socket/websocket');
client.send(JSON.stringify({
  event: 'agent_request_frontend_resources',
  payload: { sessionId, requestType, parameters, businessId }
}));
```

## 📊 **Monitoring**

### **Metrics**
- Resource request success rate
- Response time for resource requests
- Error rates for different resource types
- WebSocket connection stability

### **Logging**
- All resource requests and responses are logged
- Error details are captured for debugging
- Performance metrics are tracked
- WebSocket events are monitored

This implementation provides a robust, real-time communication channel between the AI agent and frontend, enabling dynamic resource exchange and enhanced agent capabilities.
