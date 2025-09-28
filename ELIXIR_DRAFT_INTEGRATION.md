# Elixir Draft Integration

## Overview

This document describes how draft operations are integrated into the Elixir notification hub system. The system receives draft operations from the AI Agent Server and broadcasts them to WebSocket clients.

## Draft Operation Types

### 1. Draft Creation (`draft.created`)
- **Trigger**: When AI agent creates a new draft
- **Data**: Draft ID, type, content, location ID
- **Broadcast**: `draft_created` event to WebSocket clients

### 2. Draft Update (`draft.updated`)
- **Trigger**: When AI agent updates an existing draft
- **Data**: Draft ID, updated content, location ID
- **Broadcast**: `draft_updated` event to WebSocket clients

### 3. Draft Deletion (`draft.deleted`)
- **Trigger**: When AI agent deletes a draft
- **Data**: Draft ID, location ID
- **Broadcast**: `draft_deleted` event to WebSocket clients

### 4. Draft Listing (`draft.listed`)
- **Trigger**: When AI agent lists drafts with filters
- **Data**: Array of drafts, filters, total count, location ID
- **Broadcast**: `drafts_listed` event to WebSocket clients

## Implementation Details

### AI Responses Controller (`ai_responses_controller.ex`)

The controller handles incoming HTTP requests from the AI Agent Server and routes them based on the response type:

```elixir
case response_type do
  "frontend.data" ->
    broadcast_frontend_data(tenant_id, response)
  "draft.created" ->
    broadcast_draft_created(tenant_id, response)
  "draft.updated" ->
    broadcast_draft_updated(tenant_id, response)
  "draft.deleted" ->
    broadcast_draft_deleted(tenant_id, response)
  "draft.listed" ->
    broadcast_drafts_listed(tenant_id, response)
  _ ->
    broadcast_ai_response(tenant_id, response)
end
```

### Broadcast Functions

Each draft operation has its own broadcast function that:
1. Extracts draft data from the response context
2. Creates a structured broadcast payload
3. Broadcasts to the `messages:#{tenant_id}` channel
4. Also broadcasts a `new_message` event for general message handling

#### Draft Creation Broadcast

```elixir
defp broadcast_draft_created(tenant_id, response) do
  channel_topic = "messages:#{tenant_id}"
  
  context = response["context"] || %{}
  draft_data = %{
    draftId: context["draftId"],
    draftType: context["draftType"],
    content: context["content"],
    status: context["status"] || "pending",
    locationId: context["locationId"] || "default",
    timestamp: context["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
  }

  broadcast_payload = %{
    messageId: response["message_id"] || response["responseId"],
    message: response["content"] || response["message"],
    timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
    sessionId: response["session_id"] || response["sessionId"],
    businessId: tenant_id,
    locationId: context["locationId"] || "default",
    userId: response["user_id"] || response["userId"] || "system",
    type: "draft_created",
    draftData: draft_data
  }

  NotificationHubWeb.Endpoint.broadcast(channel_topic, "draft_created", broadcast_payload)
  NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)
end
```

### Message Channel (`message_channel.ex`)

The message channel handles WebSocket connections and processes broadcast events:

#### Draft Event Handlers

```elixir
# Draft creation handler
def handle_info(%Phoenix.Socket.Broadcast{event: "draft_created", payload: draft_data}, socket) do
  push(socket, "draft_created", %{
    messageId: draft_data["messageId"],
    message: draft_data["message"],
    timestamp: draft_data["timestamp"],
    sessionId: draft_data["sessionId"],
    businessId: draft_data["businessId"],
    locationId: draft_data["locationId"],
    userId: draft_data["userId"],
    type: "draft_created",
    draftData: draft_data["draftData"]
  })
  {:noreply, socket}
end

# Draft update handler
def handle_info(%Phoenix.Socket.Broadcast{event: "draft_updated", payload: draft_data}, socket) do
  push(socket, "draft_updated", %{
    messageId: draft_data["messageId"],
    message: draft_data["message"],
    timestamp: draft_data["timestamp"],
    sessionId: draft_data["sessionId"],
    businessId: draft_data["businessId"],
    locationId: draft_data["locationId"],
    userId: draft_data["userId"],
    type: "draft_updated",
    draftData: draft_data["draftData"]
  })
  {:noreply, socket}
end

# Draft deletion handler
def handle_info(%Phoenix.Socket.Broadcast{event: "draft_deleted", payload: draft_data}, socket) do
  push(socket, "draft_deleted", %{
    messageId: draft_data["messageId"],
    message: draft_data["message"],
    timestamp: draft_data["timestamp"],
    sessionId: draft_data["sessionId"],
    businessId: draft_data["businessId"],
    locationId: draft_data["locationId"],
    userId: draft_data["userId"],
    type: "draft_deleted",
    draftData: draft_data["draftData"]
  })
  {:noreply, socket}
end

# Draft listing handler
def handle_info(%Phoenix.Socket.Broadcast{event: "drafts_listed", payload: draft_data}, socket) do
  push(socket, "drafts_listed", %{
    messageId: draft_data["messageId"],
    message: draft_data["message"],
    timestamp: draft_data["timestamp"],
    sessionId: draft_data["sessionId"],
    businessId: draft_data["businessId"],
    locationId: draft_data["locationId"],
    userId: draft_data["userId"],
    type: "drafts_listed",
    draftData: draft_data["draftData"]
  })
  {:noreply, socket}
end
```

### AI Agent Client (`ai_agent_client.ex`)

The AI agent client provides a helper function for handling draft operations:

```elixir
def handle_draft_operation(tenant_id, draft_data) do
  try do
    operation_type = draft_data["type"]
    draft_info = draft_data["draftData"]

    channel_topic = "messages:#{tenant_id}"
    
    broadcast_payload = %{
      messageId: generate_message_id(),
      message: "Draft operation: #{operation_type}",
      timestamp: draft_info["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: draft_data["sessionId"],
      businessId: tenant_id,
      locationId: draft_info["locationId"] || "default",
      userId: draft_data["userId"] || "system",
      type: operation_type,
      draftData: draft_info
    }

    NotificationHubWeb.Endpoint.broadcast(channel_topic, operation_type, broadcast_payload)
    {:ok, broadcast_payload}

  rescue
    error ->
      Logger.error("Error handling draft operation: #{inspect(error)}")
      {:error, error}
  end
end
```

## Data Flow

### 1. Draft Creation Flow

```
AI Agent Server → HTTP POST → Elixir Controller → Broadcast → WebSocket Clients
```

1. AI Agent Server creates draft via WebSocket
2. WebSocket Gateway forwards to Elixir via HTTP
3. Elixir Controller processes `draft.created` type
4. Controller broadcasts `draft_created` event
5. Message Channel pushes to WebSocket clients

### 2. Draft Update Flow

```
AI Agent Server → HTTP POST → Elixir Controller → Broadcast → WebSocket Clients
```

1. AI Agent Server updates draft via WebSocket
2. WebSocket Gateway forwards to Elixir via HTTP
3. Elixir Controller processes `draft.updated` type
4. Controller broadcasts `draft_updated` event
5. Message Channel pushes to WebSocket clients

### 3. Draft Deletion Flow

```
AI Agent Server → HTTP POST → Elixir Controller → Broadcast → WebSocket Clients
```

1. AI Agent Server deletes draft via WebSocket
2. WebSocket Gateway forwards to Elixir via HTTP
3. Elixir Controller processes `draft.deleted` type
4. Controller broadcasts `draft_deleted` event
5. Message Channel pushes to WebSocket clients

### 4. Draft Listing Flow

```
AI Agent Server → HTTP POST → Elixir Controller → Broadcast → WebSocket Clients
```

1. AI Agent Server lists drafts via WebSocket
2. WebSocket Gateway forwards to Elixir via HTTP
3. Elixir Controller processes `draft.listed` type
4. Controller broadcasts `drafts_listed` event
5. Message Channel pushes to WebSocket clients

## WebSocket Events

### Client-Side Events

Clients can listen for the following draft-related events:

```javascript
// Draft creation
socket.on('draft_created', (data) => {
  console.log('Draft created:', data.draftData);
  // Handle draft creation
});

// Draft update
socket.on('draft_updated', (data) => {
  console.log('Draft updated:', data.draftData);
  // Handle draft update
});

// Draft deletion
socket.on('draft_deleted', (data) => {
  console.log('Draft deleted:', data.draftData);
  // Handle draft deletion
});

// Draft listing
socket.on('drafts_listed', (data) => {
  console.log('Drafts listed:', data.draftData);
  // Handle draft listing
});
```

### Event Data Structure

All draft events follow this structure:

```javascript
{
  messageId: "msg_1234567890_abc123",
  message: "Draft operation: draft.created",
  timestamp: "2024-01-15T10:30:00Z",
  sessionId: "business123:user456:1234567890",
  businessId: "business123",
  locationId: "location_456",
  userId: "system",
  type: "draft_created",
  draftData: {
    draftId: "draft_1234567890",
    draftType: "appointment_draft",
    content: { /* draft content */ },
    status: "pending",
    locationId: "location_456",
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

### Controller Error Handling

```elixir
rescue
  error ->
    Logger.error("Error processing AI response: #{inspect(error)}")
    {:error, error}
end
```

### Channel Error Handling

```elixir
rescue
  error ->
    Logger.error("Error handling draft operation: #{inspect(error)}")
    {:error, error}
end
```

## Logging

### Controller Logging

```elixir
Logger.info("Processing draft creation for tenant: #{tenant_id}")
Logger.info("Draft creation content: #{response["content"]}")
Logger.info("Draft creation broadcast payload: #{inspect(broadcast_payload)}")
Logger.info("Successfully broadcasted draft creation to channel: #{channel_topic}")
```

### Channel Logging

```elixir
Logger.info("Received draft creation broadcast: #{inspect(draft_data)}")
```

## Testing

### Manual Testing

1. Start the Elixir server
2. Connect a WebSocket client to the messages channel
3. Send draft operations from the AI Agent Server
4. Verify that draft events are received by the client

### Test Commands

```bash
# Start Elixir server
cd elixir
mix phx.server

# Test WebSocket connection
# Use a WebSocket client to connect to ws://localhost:4000/socket/websocket
# Join the messages:tenant_id channel
# Send draft operations and verify events are received
```

## Configuration

### Environment Variables

```elixir
# In config/config.exs
config :notification_hub, NotificationHubWeb.Endpoint,
  url: [host: "localhost"],
  http: [port: 4000],
  secret_key_base: "your_secret_key_base"
```

### Channel Configuration

```elixir
# In lib/notification_hub_web/channels/user_socket.ex
defmodule NotificationHubWeb.UserSocket do
  use Phoenix.Socket

  channel "messages:*", NotificationHubWeb.MessageChannel
  channel "drafts:*", NotificationHubWeb.DraftChannel
end
```

This integration provides a complete solution for handling draft operations in the Elixir notification hub, allowing real-time communication between the AI Agent Server and WebSocket clients.
