# API Documentation

## Message Endpoints

### POST /api/messages

Publică un mesaj către agent și primește un răspuns.

#### Request Format

```json
{
  "tenant_id": "test-00001",
  "messageId": "mbfnk8i6vdl1b2yd0qo",
  "type": "user.message",
  "payload": {
    "content": "salut!",
    "parentId": null,
    "timestamp": "2025-06-02T22:19:43.758Z"
  }
}
```

#### Response Format

```json
{
  "status": "success",
  "message": {
    "tenantId": "test-00001",
    "messageId": "mbfnk8i6vdl1b2yd0qo",
    "type": "user.message",
    "payload": {
      "content": "salut!",
      "parentId": null,
      "timestamp": "2025-06-02T22:19:43.758Z"
    },
    "timestamp": "2025-06-02T22:19:43.761738Z"
  }
}
```

### WebSocket Connection

Pentru a primi mesaje în timp real, conectează-te la WebSocket:

```
ws://localhost:4000/socket/websocket
```

#### Join Channel

```json
{
  "topic": "messages:test-00001",
  "event": "phx_join",
  "payload": {},
  "ref": "1"
}
```

#### Message Format

Mesajele primite prin WebSocket vor avea următorul format:

```json
{
  "event": "new_message",
  "payload": {
    "message_id": "mbfnk8i6vdl1b2yd0qo",
    "content": "salut!",
    "role": "user",
    "timestamp": "2025-06-02T22:19:43.761738Z"
  }
}
```

## Kafka Topics

### elixir.to.agent
Topic pentru mesaje trimise către agent.

Format mesaj:
```json
{
  "tenantId": "test-00001",
  "messageId": "mbfnk8i6vdl1b2yd0qo",
  "type": "user.message",
  "payload": {
    "content": "salut!",
    "parentId": null,
    "timestamp": "2025-06-02T22:19:43.758Z"
  },
  "timestamp": "2025-06-02T22:19:43.761738Z"
}
```

### agent.to.elixir
Topic pentru răspunsuri de la agent.

Format mesaj:
```json
{
  "tenantId": "test-00001",
  "messageId": "mbfnk8i6vdl1b2yd0qo",
  "type": "agent.response",
  "payload": {
    "content": "Răspuns de la agent",
    "parentId": "mbfnk8i6vdl1b2yd0qo",
    "timestamp": "2025-06-02T22:19:43.758Z"
  },
  "timestamp": "2025-06-02T22:19:43.761738Z"
}
```

## Headers

Toate mesajele Kafka includ următoarele headers:
- `tenantId`: ID-ul tenantului
- `messageId`: ID-ul unic al mesajului
- `role`: Rolul expeditorului ("user" sau "agent")
- `timestamp`: Timestamp-ul mesajului în format ISO8601 