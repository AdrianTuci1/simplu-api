# Kafka Service Documentation

## Overview
The Kafka Service is responsible for handling communication between the AI Agent Server and the Receptionist service through Kafka messages. It listens for incoming messages on the 'conversations' topic and responds with processed results.

## Message Structure

### Incoming Messages
Messages received on the 'conversations' topic should follow this structure:

```json
{
  "conversationId": "string",  // Required: Unique identifier for the conversation
  "messageId": "string",       // Required: Unique identifier for the message
  "userId": "string",          // Required: Identifier of the user
  "content": "string",         // Required: The actual message content
  "tenantId": "string",        // Optional: Tenant identifier (defaults to 'default')
  "metadata": {                // Optional: Additional metadata
    "key": "value"
  }
}
```

### Response Messages
The service will respond with messages in this format:

```json
{
  "conversationId": "string",  // Original conversation ID
  "messageId": "string",       // Original message ID
  "userId": "string",          // Original user ID
  "status": "received",        // Current status of the message
  "timestamp": "string",       // ISO timestamp of when the message was processed
  "metadata": {
    "processed": true,
    "source": "ai-agent-server"
  }
}
```

## Topics

### Input Topic
- Name: `conversations`
- Purpose: Receives messages from the Receptionist service
- Consumer Group: `ai-agent-group`

### Output Topic
- Name: `agent.events`
- Purpose: Sends responses back to the Receptionist service

## Configuration

The service requires the following environment variables:

```env
KAFKA_BROKERS=localhost:9092  # Comma-separated list of Kafka brokers
```

## Error Handling

The service includes the following error handling mechanisms:

1. **Missing Required Fields**
   - If any of the required fields (conversationId, messageId, userId) are missing, the message will be logged and skipped
   - A warning will be logged with details about the missing fields

2. **Message Processing Errors**
   - Any errors during message processing are caught and logged
   - The error details are included in the logs for debugging

## Logging

The service logs the following events:
- Service initialization status
- Received messages (debug level)
- Processing status of messages
- Any errors or warnings during processing

## Example Usage

### Sending a Message
To send a message to the AI Agent Server, publish to the 'conversations' topic:

```javascript
const message = {
  conversationId: "conv-123",
  messageId: "msg-456",
  userId: "user-789",
  content: "Hello, AI Agent!",
  tenantId: "tenant-1"
};

// Publish to Kafka
await producer.send({
  topic: 'conversations',
  messages: [{
    value: JSON.stringify(message)
  }]
});
```

### Receiving a Response
Listen to the 'agent.events' topic to receive responses:

```javascript
await consumer.subscribe({ topic: 'agent.events' });

await consumer.run({
  eachMessage: async ({ message }) => {
    const response = JSON.parse(message.value.toString());
    console.log('Received response:', response);
  }
});
```

## Best Practices

1. **Message Validation**
   - Always include all required fields in your messages
   - Validate message structure before sending

2. **Error Handling**
   - Implement proper error handling for both sending and receiving messages
   - Monitor the logs for any warnings or errors

3. **Message Processing**
   - Handle responses asynchronously
   - Implement retry logic for failed message processing

4. **Security**
   - Ensure proper authentication and authorization
   - Validate tenant IDs and user permissions 