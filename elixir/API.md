# API Documentation

## Message Endpoints

### POST /api/messages

Publică un mesaj către agent și primește un răspuns.

#### Request Format

```json
{
  "tenant_id": "test-00001",
  "userId": "user123",
  "sessionId": "session456",
  "payload": {
    "content": "salut!",
    "context": {
      "lastAgentMessage": "ultimul mesaj trimis de agent",
      "metadata": "alte informații relevante pentru context"
    }
  }
}
```

#### Response Format

```json
{
  "status": "success",
  "message": {
    "tenantId": "test-00001",
    "userId": "user123",
    "sessionId": "session456",
    "messageId": "mbfnk8i6vdl1b2yd0qo",
    "type": "user.message",
    "payload": {
      "content": "salut!",
      "context": {
        "lastAgentMessage": "ultimul mesaj trimis de agent",
        "metadata": "alte informații relevante pentru context"
      }
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
    "context": {
      "lastAgentMessage": "ultimul mesaj trimis de agent",
      "metadata": "alte informații relevante pentru context"
    },
    "userId": "user123",
    "sessionId": "session456",
    "timestamp": "2025-06-02T22:19:43.761738Z"
  }
}
```

## Kafka Topics

### elixir.to.agent
Topic pentru mesaje trimise către agent. Context-ul este păstrat pentru a menține istoricul conversației.

Format mesaj:
```json
{
  "tenantId": "test-00001",
  "userId": "user123",
  "sessionId": "session456",
  "messageId": "mbfnk8i6vdl1b2yd0qo",
  "type": "user.message",
  "payload": {
    "content": "salut!",
    "context": {
      "lastAgentMessage": "ultimul mesaj trimis de agent",
      "metadata": "alte informații relevante pentru context"
    }
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
  "userId": "user123",
  "sessionId": "session456",
  "messageId": "mbfnk8i6vdl1b2yd0qo",
  "type": "agent.response",
  "payload": {
    "content": "Răspuns de la agent",
    "context": {
      "lastAgentMessage": "ultimul mesaj trimis de agent",
      "metadata": "alte informații relevante pentru context"
    }
  },
  "timestamp": "2025-06-02T22:19:43.761738Z"
}
```

## Headers

Toate mesajele Kafka includ următoarele headers:
- `tenantId`: ID-ul tenantului
- `userId`: ID-ul utilizatorului
- `sessionId`: ID-ul sesiunii
- `messageId`: ID-ul unic al mesajului (generat de server)
- `type`: Tipul mesajului ("user.message" sau "agent.response")
- `timestamp`: Timestamp-ul mesajului în format ISO8601 