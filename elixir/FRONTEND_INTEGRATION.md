# Frontend Integration Guide

## Overview
This guide explains how to connect your frontend application to the Kafka messaging system for real-time communication with the Elixir backend running in a Docker container.

## Server Setup

First, you need to set up a Phoenix server to handle WebSocket connections. Add the following dependencies to your `mix.exs`:

```elixir
defp deps do
  [
    {:phoenix, "~> 1.7.10"},
    {:phoenix_live_view, "~> 0.20.1"},
    {:jason, "~> 1.4"},
    {:broadway, "~> 1.0"},
    {:broadway_kafka, "~> 0.3"},
    {:uuid, "~> 1.1"},
    {:brod, "~> 3.16"}
  ]
end
```

Update your `docker-compose.yml` to expose the Phoenix port for the elixir service:

```yaml
version: '3'
services:
  elixir:
    build:
      context: ./elixir
      dockerfile: Dockerfile
    ports:
      - "4000:4000"  # Add this line to expose the Phoenix port
    environment:
      - KAFKA_BROKERS=kafka:29092
      - KAFKA_CLIENT_ID=elixir-consumer
      - KAFKA_GROUP_ID=elixir-consumer-group
      - KAFKA_PUBLISHER_CLIENT_ID=elixir-publisher
      - KAFKA_PUBLISHER_GROUP_ID=elixir-publisher-group
      - KAFKA_CONSUMER_TOPIC=agent.to.elixir
      - KAFKA_PUBLISHER_TOPIC=elixir.to.agent
    depends_on:
      kafka:
        condition: service_started
    networks:
      - app-network
```

Update your Dockerfile to expose the Phoenix port:

```dockerfile
# Add this after the existing ENV variables
EXPOSE 4000

# Update the start script to include Phoenix server
RUN echo '#!/bin/sh\n\
echo "Waiting for Kafka to be ready..."\n\
while ! nc -z kafka 29092; do\n\
  echo "Waiting for Kafka port..."\n\
  sleep 2\n\
done\n\
echo "Kafka port is available, waiting for Kafka to be fully ready..."\n\
sleep 30\n\
echo "Starting Phoenix server and Kafka consumer..."\n\
exec bin/kafka_consumer start' > /app/start.sh && \
chmod +x /app/start.sh
```

Create a new Phoenix server configuration in `config/config.exs`:

```elixir
config :kafka_consumer, KafkaConsumerWeb.Endpoint,
  url: [host: "0.0.0.0"],  # Important: Use 0.0.0.0 to accept external connections
  http: [port: 4000],
  server: true,
  secret_key_base: "your-secret-key-base",
  live_view: [signing_salt: "your-signing-salt"]

# Existing Kafka configuration
config :kafka_consumer,
  kafka_brokers: System.get_env("KAFKA_BROKERS", "kafka:29092") |> String.split(",")
```

Create a new WebSocket channel in `lib/kafka_consumer_web/channels/message_channel.ex`:

```elixir
defmodule KafkaConsumerWeb.MessageChannel do
  use KafkaConsumerWeb, :channel

  def join("messages:" <> _user_id, _params, socket) do
    {:ok, socket}
  end

  def handle_in("new_message", payload, socket) do
    # Process the message and publish to Kafka
    KafkaConsumer.AgentPublisher.publish_message(payload)
    {:reply, {:ok, payload}, socket}
  end

  def handle_info({:message_received, message}, socket) do
    push(socket, "new_message", message)
    {:noreply, socket}
  end
end
```

## Message Flow
1. Frontend sends messages to the backend through HTTP endpoints
2. Backend processes messages and publishes them to Kafka
3. Kafka consumers process messages and send responses back
4. Frontend receives responses through WebSocket connection

## Implementation Steps

### 1. WebSocket Connection
Connect to the WebSocket endpoint to receive real-time messages:

```javascript
// Use the host machine's IP or domain where Docker is running
const socket = new WebSocket('ws://localhost:4000/socket/websocket');

socket.onopen = () => {
  console.log('WebSocket connection established');
  // Join the channel
  socket.send(JSON.stringify({
    topic: "messages:user123",
    event: "phx_join",
    payload: {},
    ref: 1
  }));
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle incoming messages
  console.log('Received message:', message);
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};

socket.onclose = () => {
  console.log('WebSocket connection closed');
};
```

### 2. Sending Messages
Send messages to the backend using HTTP POST requests:

```javascript
async function sendMessage(message) {
  try {
    const response = await fetch('http://localhost:4000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user.message',
        payload: {
          content: message,
          // Add any additional payload data
        },
        messageId: generateUniqueId() // Implement this function
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
```

### 3. Message Format
Messages should follow this structure:

```javascript
{
  "type": "user.message",
  "payload": {
    "content": "Your message content",
    // Additional payload data
  },
  "messageId": "unique-message-id"
}
```

### 4. Handling Responses
Responses from the agent will have this structure:

```javascript
{
  "type": "agent.response",
  "payload": {
    "content": "Agent's response content",
    // Additional response data
  },
  "messageId": "original-message-id"
}
```

## Best Practices

1. **Error Handling**
   - Implement proper error handling for both WebSocket and HTTP requests
   - Add reconnection logic for WebSocket connections
   - Handle network timeouts and retries

2. **Message Queue**
   - Implement a message queue on the frontend to handle offline scenarios
   - Store messages locally when offline
   - Sync messages when connection is restored

3. **Security**
   - Use secure WebSocket connections (wss://)
   - Implement proper authentication
   - Validate all incoming messages

4. **Performance**
   - Implement message batching for multiple messages
   - Add message compression for large payloads
   - Use connection pooling for HTTP requests

## Example Implementation

Here's a complete example of a frontend service to handle messaging:

```javascript
class MessageService {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.socket = null;
    this.messageQueue = [];
    this.isConnected = false;
  }

  connect() {
    this.socket = new WebSocket(`ws://${this.backendUrl}/socket/websocket`);
    
    this.socket.onopen = () => {
      this.isConnected = true;
      // Join the channel
      this.socket.send(JSON.stringify({
        topic: "messages:user123",
        event: "phx_join",
        payload: {},
        ref: 1
      }));
      this.processMessageQueue();
    };

    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onerror = this.handleError.bind(this);
    this.socket.onclose = () => {
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
    };
  }

  async sendMessage(content) {
    const message = {
      type: 'user.message',
      payload: { content },
      messageId: this.generateMessageId()
    };

    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    try {
      const response = await fetch(`http://${this.backendUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageQueue.push(message);
      throw error;
    }
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    // Emit event or call callback
    this.onMessage(message);
  }

  handleError(error) {
    console.error('WebSocket error:', error);
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message.payload.content);
    }
  }

  generateMessageId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
```

## Testing

1. Test WebSocket connection:
```javascript
const messageService = new MessageService('localhost:4000');
messageService.connect();
```

2. Test sending messages:
```javascript
messageService.sendMessage('Hello, agent!')
  .then(response => console.log('Message sent:', response))
  .catch(error => console.error('Error:', error));
```

## Troubleshooting

1. **Connection Issues**
   - Check if the Docker container is running (`docker ps`)
   - Verify port mapping in docker-compose.yml
   - Check if the backend service is running inside the container
   - Verify network connectivity between frontend and Docker host
   - Check Kafka connectivity (kafka:29092)

2. **Message Delivery Issues**
   - Verify message format
   - Check for any CORS issues
   - Verify authentication tokens
   - Check Kafka connectivity inside the container
   - Verify Kafka topics (agent.to.elixir and elixir.to.agent)

3. **Performance Issues**
   - Monitor WebSocket connection status
   - Check message queue size
   - Monitor network latency
   - Check container resource usage
   - Monitor Kafka message flow using Kafka UI (localhost:8080)

For additional help or questions, please contact the development team. 