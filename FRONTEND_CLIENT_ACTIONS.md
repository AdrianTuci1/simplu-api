# Frontend Client Actions

## WebSocket Client Implementation

### Connection and Setup

```javascript
class WebSocketClient {
  constructor(businessId, websocketUrl = 'ws://localhost:4000/socket/websocket') {
    this.businessId = businessId;
    this.websocketUrl = websocketUrl;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  connect() {
    this.socket = new WebSocket(this.websocketUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.joinChannel();
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  joinChannel() {
    this.send({
      event: 'phx_join',
      topic: `messages:${this.businessId}`,
      payload: { businessId: this.businessId },
      ref: '1'
    });
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    
    switch (data.event) {
      case 'phx_reply':
        console.log('Joined channel:', data.topic);
        break;
        
      case 'agent_request_resources':
        this.handleAgentResourceRequest(data.payload);
        break;
        
      case 'frontend_data_available':
        this.handleFrontendDataAvailable(data.payload);
        break;
        
      case 'new_message':
        this.handleNewMessage(data.payload);
        break;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
}
```

### Resource Request Handlers

```javascript
class ResourceHandlers {
  constructor(websocketClient) {
    this.client = websocketClient;
  }

  // Handle AI agent resource requests
  async handleAgentResourceRequest(request) {
    const { requestType, parameters, sessionId } = request;
    
    try {
      let resources = {};
      
      switch (requestType) {
        case 'get_services':
          resources = await this.getServices(parameters);
          break;
        case 'get_appointments':
          resources = await this.getAppointments(parameters);
          break;
        case 'get_business_info':
          resources = await this.getBusinessInfo(parameters);
          break;
        case 'get_available_dates':
          resources = await this.getAvailableDates(parameters);
          break;
        default:
          console.warn('Unknown request type:', requestType);
          return;
      }
      
      // Send resources back to AI agent
      this.client.send({
        event: 'frontend_provide_resources',
        topic: `messages:${this.client.businessId}`,
        payload: {
          sessionId,
          businessId: this.client.businessId,
          resources
        }
      });
      
    } catch (error) {
      console.error('Error handling resource request:', error);
    }
  }

  // Get business services
  async getServices(parameters = {}) {
    try {
      const response = await fetch('/api/services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { services: data };
      
    } catch (error) {
      console.error('Error fetching services:', error);
      return { services: [] };
    }
  }

  // Get appointments
  async getAppointments(parameters = {}) {
    try {
      const queryParams = new URLSearchParams(parameters);
      const response = await fetch(`/api/appointments?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { appointments: data };
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return { appointments: [] };
    }
  }

  // Get business information
  async getBusinessInfo(parameters = {}) {
    try {
      const response = await fetch('/api/business-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { businessInfo: data };
      
    } catch (error) {
      console.error('Error fetching business info:', error);
      return { businessInfo: {} };
    }
  }

  // Get available dates
  async getAvailableDates(parameters = {}) {
    try {
      const queryParams = new URLSearchParams(parameters);
      const response = await fetch(`/api/available-dates?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { availableDates: data };
      
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return { availableDates: [] };
    }
  }
}
```

### Event Handlers

```javascript
class EventHandlers {
  constructor(websocketClient) {
    this.client = websocketClient;
    this.onFrontendData = null;
    this.onNewMessage = null;
  }

  // Handle frontend data available
  handleFrontendDataAvailable(payload) {
    console.log('Frontend data available:', payload);
    
    if (this.onFrontendData) {
      this.onFrontendData(payload);
    }
  }

  // Handle new messages
  handleNewMessage(payload) {
    console.log('New message received:', payload);
    
    if (this.onNewMessage) {
      this.onNewMessage(payload);
    }
  }

  // Set callback for frontend data
  setOnFrontendData(callback) {
    this.onFrontendData = callback;
  }

  // Set callback for new messages
  setOnNewMessage(callback) {
    this.onNewMessage = callback;
  }
}
```

### Complete Client Implementation

```javascript
class FrontendWebSocketClient {
  constructor(businessId, websocketUrl) {
    this.businessId = businessId;
    this.websocketClient = new WebSocketClient(businessId, websocketUrl);
    this.resourceHandlers = new ResourceHandlers(this.websocketClient);
    this.eventHandlers = new EventHandlers(this.websocketClient);
    
    // Override message handling to include resource handlers
    this.websocketClient.handleMessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'phx_reply':
          console.log('Joined channel:', data.topic);
          break;
          
        case 'agent_request_resources':
          this.resourceHandlers.handleAgentResourceRequest(data.payload);
          break;
          
        case 'frontend_data_available':
          this.eventHandlers.handleFrontendDataAvailable(data.payload);
          break;
          
        case 'new_message':
          this.eventHandlers.handleNewMessage(data.payload);
          break;
      }
    };
  }

  // Connect to WebSocket
  connect() {
    this.websocketClient.connect();
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.websocketClient.socket) {
      this.websocketClient.socket.close();
    }
  }

  // Send message to AI agent
  sendMessage(message, userId = 'user') {
    this.websocketClient.send({
      event: 'new_message',
      topic: `messages:${this.businessId}`,
      payload: {
        businessId: this.businessId,
        userId: userId,
        message: message,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Set callback for frontend data
  onFrontendData(callback) {
    this.eventHandlers.setOnFrontendData(callback);
  }

  // Set callback for new messages
  onNewMessage(callback) {
    this.eventHandlers.setOnNewMessage(callback);
  }

  // Check connection status
  isConnected() {
    return this.websocketClient.isConnected;
  }
}
```

### Usage Example

```javascript
// Initialize the client
const client = new FrontendWebSocketClient('your-business-id', 'ws://localhost:4000/socket/websocket');

// Set up event handlers
client.onFrontendData((data) => {
  console.log('Frontend data received:', data);
  // Handle the frontend data
  displayFrontendData(data.frontendData);
});

client.onNewMessage((message) => {
  console.log('New message received:', message);
  // Handle the new message
  displayMessage(message);
});

// Connect to WebSocket
client.connect();

// Send a message to the AI agent
client.sendMessage('Hello, I need help with booking an appointment');

// Display functions
function displayFrontendData(frontendData) {
  const container = document.getElementById('frontend-data');
  container.innerHTML = `
    <h3>Frontend Data</h3>
    <p>Request Type: ${frontendData.requestType}</p>
    <pre>${JSON.stringify(frontendData.resources, null, 2)}</pre>
  `;
}

function displayMessage(message) {
  const container = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `
    <div class="message">
      <strong>${message.userId}:</strong> ${message.message}
      <small>${message.timestamp}</small>
    </div>
  `;
  container.appendChild(messageElement);
}
```

### Error Handling and Reconnection

```javascript
class ErrorHandler {
  constructor(client) {
    this.client = client;
    this.errorCount = 0;
    this.maxErrors = 5;
  }

  handleError(error) {
    this.errorCount++;
    console.error('WebSocket error:', error);
    
    if (this.errorCount >= this.maxErrors) {
      console.error('Too many errors, stopping reconnection attempts');
      return;
    }
    
    // Implement custom error handling logic here
  }

  resetErrorCount() {
    this.errorCount = 0;
  }
}
```

### Testing

```javascript
// Test the WebSocket connection
function testConnection() {
  const client = new FrontendWebSocketClient('test-business', 'ws://localhost:4000/socket/websocket');
  
  client.onFrontendData((data) => {
    console.log('✅ Frontend data received:', data);
  });
  
  client.onNewMessage((message) => {
    console.log('✅ Message received:', message);
  });
  
  client.connect();
  
  // Test sending a message
  setTimeout(() => {
    client.sendMessage('Test message');
  }, 2000);
}
```

This client implementation provides:

1. **WebSocket Connection Management** - Connect, disconnect, reconnect
2. **Resource Request Handling** - Handle AI agent requests for frontend data
3. **Event Handling** - Process frontend data and messages
4. **Error Handling** - Robust error handling and reconnection
5. **Easy Integration** - Simple API for frontend applications

Use this client to connect your frontend to the WebSocket system and handle all AI agent interactions.
