# Frontend WebSocket Integration Guide

## Overview

This guide explains how to integrate the frontend with the WebSocket system for real-time frontend data retrieval and AI agent communication.

## Architecture

```
Frontend ↔ Elixir WebSocket ↔ AI Agent Server ↔ Frontend Data
```

The system enables:
- Real-time frontend data requests from AI agents
- WebSocket communication through Elixir
- Automatic data forwarding to frontend clients

## WebSocket Connection

### Connection Setup

```javascript
// Connect to Elixir WebSocket
const socket = new WebSocket('ws://localhost:4000/socket/websocket');

// Join the messages channel for your business
socket.send(JSON.stringify({
  event: 'phx_join',
  topic: 'messages:YOUR_BUSINESS_ID',
  payload: { businessId: 'YOUR_BUSINESS_ID' },
  ref: '1'
}));
```

### Event Listeners

```javascript
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.event) {
    case 'phx_reply':
      console.log('Joined channel:', data.topic);
      break;
      
    case 'new_message':
      handleNewMessage(data.payload);
      break;
      
    case 'frontend_data_available':
      handleFrontendData(data.payload);
      break;
      
    case 'agent_request_resources':
      handleAgentResourceRequest(data.payload);
      break;
  }
};
```

## Frontend Data Events

### 1. Agent Resource Requests

When the AI agent needs frontend data, it will send:

```javascript
{
  event: 'agent_request_resources',
  topic: 'messages:YOUR_BUSINESS_ID',
  payload: {
    sessionId: 'business123:user456:1234567890',
    requestType: 'get_services' | 'get_appointments' | 'get_business_info' | 'get_available_dates',
    parameters: {
      // Request-specific parameters
    },
    timestamp: '2024-01-15T10:30:00Z'
  }
}
```

### 2. Frontend Data Response

Send the requested data back:

```javascript
socket.send(JSON.stringify({
  event: 'frontend_provide_resources',
  topic: 'messages:YOUR_BUSINESS_ID',
  payload: {
    sessionId: 'business123:user456:1234567890',
    businessId: 'YOUR_BUSINESS_ID',
    resources: {
      // The actual data requested
    }
  }
}));
```

### 3. Frontend Data Available

Receive processed frontend data:

```javascript
{
  event: 'frontend_data_available',
  topic: 'messages:YOUR_BUSINESS_ID',
  payload: {
    messageId: 'msg_1234567890_abcdef',
    message: 'Frontend data retrieved: get_services',
    timestamp: '2024-01-15T10:30:00Z',
    sessionId: 'business123:user456:1234567890',
    businessId: 'YOUR_BUSINESS_ID',
    userId: 'system',
    type: 'frontend_data',
    frontendData: {
      requestType: 'get_services',
      parameters: {},
      resources: {
        // The actual frontend data
      },
      timestamp: '2024-01-15T10:30:00Z'
    }
  }
}
```

## Request Types

### 1. Get Services
```javascript
// Request
{
  requestType: 'get_services',
  parameters: {}
}

// Response
{
  resources: {
    services: [
      { id: '1', name: 'Consultație', price: 100, duration: 30 },
      { id: '2', name: 'Tratament', price: 200, duration: 60 }
    ]
  }
}
```

### 2. Get Appointments
```javascript
// Request
{
  requestType: 'get_appointments',
  parameters: {
    date: '2024-01-15', // optional
    status: 'confirmed' // optional
  }
}

// Response
{
  resources: {
    appointments: [
      { 
        id: '1', 
        date: '2024-01-15', 
        time: '10:00', 
        patient: 'John Doe',
        service: 'Consultație',
        status: 'confirmed'
      }
    ]
  }
}
```

### 3. Get Business Info
```javascript
// Request
{
  requestType: 'get_business_info',
  parameters: {}
}

// Response
{
  resources: {
    businessInfo: {
      name: 'Cabinet Dental',
      address: 'Strada Principală 123',
      phone: '+40123456789',
      email: 'contact@cabinet.ro',
      workingHours: {
        monday: '09:00-18:00',
        tuesday: '09:00-18:00'
      }
    }
  }
}
```

### 4. Get Available Dates
```javascript
// Request
{
  requestType: 'get_available_dates',
  parameters: {
    serviceId: '1', // optional
    month: '2024-01' // optional
  }
}

// Response
{
  resources: {
    availableDates: [
      { 
        date: '2024-01-16', 
        slots: ['09:00', '10:00', '11:00'],
        available: true
      },
      { 
        date: '2024-01-17', 
        slots: ['09:00', '14:00', '15:00'],
        available: true
      }
    ]
  }
}
```

## Complete Frontend Implementation

### React Hook Example

```javascript
import { useEffect, useState, useCallback } from 'react';

export const useWebSocket = (businessId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [frontendData, setFrontendData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000/socket/websocket');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join the messages channel
      ws.send(JSON.stringify({
        event: 'phx_join',
        topic: `messages:${businessId}`,
        payload: { businessId },
        ref: '1'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'phx_reply':
          console.log('Joined channel:', data.topic);
          break;
          
        case 'agent_request_resources':
          handleAgentResourceRequest(data.payload);
          break;
          
        case 'frontend_data_available':
          setFrontendData(data.payload);
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [businessId]);

  const handleAgentResourceRequest = useCallback(async (request) => {
    const { requestType, parameters, sessionId } = request;
    
    try {
      let resources = {};
      
      switch (requestType) {
        case 'get_services':
          resources = await fetchServices();
          break;
        case 'get_appointments':
          resources = await fetchAppointments(parameters);
          break;
        case 'get_business_info':
          resources = await fetchBusinessInfo();
          break;
        case 'get_available_dates':
          resources = await fetchAvailableDates(parameters);
          break;
      }
      
      // Send resources back to AI agent
      socket.send(JSON.stringify({
        event: 'frontend_provide_resources',
        topic: `messages:${businessId}`,
        payload: {
          sessionId,
          businessId,
          resources
        }
      }));
      
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  }, [socket, businessId]);

  return {
    socket,
    isConnected,
    frontendData,
    handleAgentResourceRequest
  };
};
```

### Data Fetching Functions

```javascript
// Example data fetching functions
const fetchServices = async () => {
  const response = await fetch('/api/services');
  const data = await response.json();
  return { services: data };
};

const fetchAppointments = async (parameters) => {
  const queryParams = new URLSearchParams(parameters);
  const response = await fetch(`/api/appointments?${queryParams}`);
  const data = await response.json();
  return { appointments: data };
};

const fetchBusinessInfo = async () => {
  const response = await fetch('/api/business-info');
  const data = await response.json();
  return { businessInfo: data };
};

const fetchAvailableDates = async (parameters) => {
  const queryParams = new URLSearchParams(parameters);
  const response = await fetch(`/api/available-dates?${queryParams}`);
  const data = await response.json();
  return { availableDates: data };
};
```

## Error Handling

```javascript
socket.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Implement reconnection logic
};

socket.onclose = (event) => {
  if (event.code !== 1000) {
    console.log('WebSocket closed unexpectedly, attempting to reconnect...');
    // Implement reconnection logic
  }
};
```

## Testing

### Test WebSocket Connection

```javascript
// Test the WebSocket connection
const testConnection = () => {
  const socket = new WebSocket('ws://localhost:4000/socket/websocket');
  
  socket.onopen = () => {
    console.log('✅ WebSocket connected successfully');
    
    // Test joining a channel
    socket.send(JSON.stringify({
      event: 'phx_join',
      topic: 'messages:test-business',
      payload: { businessId: 'test-business' },
      ref: '1'
    }));
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 Received:', data);
  };
  
  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
};
```

## Configuration

### Environment Variables

```bash
# Elixir WebSocket URL
REACT_APP_WEBSOCKET_URL=ws://localhost:4000/socket/websocket

# Business ID
REACT_APP_BUSINESS_ID=your-business-id
```

### WebSocket Configuration

```javascript
const WEBSOCKET_CONFIG = {
  url: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:4000/socket/websocket',
  businessId: process.env.REACT_APP_BUSINESS_ID || 'default-business',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5
};
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if Elixir server is running on port 4000
   - Verify WebSocket URL is correct

2. **Channel Join Failed**
   - Ensure business ID is valid
   - Check Elixir logs for authentication errors

3. **No Frontend Data Received**
   - Verify AI agent is requesting resources
   - Check if frontend is responding to resource requests

4. **Data Format Issues**
   - Ensure response format matches expected structure
   - Check JSON serialization/deserialization

### Debug Logging

```javascript
// Enable debug logging
const DEBUG = true;

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[WebSocket] ${message}`, data);
  }
};

// Use in event handlers
socket.onmessage = (event) => {
  log('Message received', event.data);
  // ... handle message
};
```

## Security Considerations

1. **Authentication**: Implement proper authentication for WebSocket connections
2. **Authorization**: Verify business ID ownership
3. **Data Validation**: Validate all incoming and outgoing data
4. **Rate Limiting**: Implement rate limiting for resource requests

## Performance Optimization

1. **Connection Pooling**: Reuse WebSocket connections
2. **Message Batching**: Batch multiple requests when possible
3. **Caching**: Cache frequently requested data
4. **Compression**: Enable WebSocket compression if supported

## Monitoring

### Metrics to Track

- WebSocket connection status
- Message send/receive rates
- Resource request response times
- Error rates and types

### Health Checks

```javascript
// Periodic health check
setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      event: 'ping',
      payload: { timestamp: Date.now() }
    }));
  }
}, 30000); // Every 30 seconds
```

This guide provides everything needed to integrate the frontend with the WebSocket system for real-time frontend data retrieval and AI agent communication.
