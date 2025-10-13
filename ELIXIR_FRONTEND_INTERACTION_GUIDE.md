# Frontend Interaction prin Elixir - Ghid de Implementare

## Prezentare Generală

Acest ghid descrie noua arhitectură de comunicare între AI Agent Server, Elixir Notification Hub și Frontend pentru apeluri de funcții interactive și **streaming în timp real**.

> **📚 Note:** Pentru managementul sesiunilor de chat (creare, listare, istoric), vezi [CHAT_SESSION_MANAGEMENT_GUIDE.md](./CHAT_SESSION_MANAGEMENT_GUIDE.md).

## Separarea Responsabilităților

| Funcționalitate | Serviciu | Protocol | Documentație |
|----------------|----------|----------|--------------|
| 🔴 **Streaming mesaje AI** | Elixir | WebSocket | Acest ghid |
| 🔴 **Function calls** | Elixir | WebSocket | Acest ghid |
| 🟢 **Managementul sesiunilor** | AI Agent Server | HTTP REST | [CHAT_SESSION_MANAGEMENT_GUIDE.md](./CHAT_SESSION_MANAGEMENT_GUIDE.md) |
| 🟢 **Istoric conversații** | AI Agent Server | HTTP REST | [CHAT_SESSION_MANAGEMENT_GUIDE.md](./CHAT_SESSION_MANAGEMENT_GUIDE.md) |

## Arhitectura Fluxului

### 1. **Streaming Mesaje AI (Timp Real)**

```
Bedrock Agent → AI Agent Server → Elixir → Frontend
                    ↓
                (procesează chunks)
                    ↓
              POST /api/ai-responses
              type: "streaming_chunk"
```

**Implementare:**
- `bedrock-agent.service.ts` trimite fiecare chunk către Elixir imediat ce îl primește
- Elixir broadcast chunk-ul către frontend prin WebSocket
- La final, trimite mesaj complet cu `type: "streaming_complete"`

### 2. **Apeluri Funcții Frontend**

```
AI Agent → frontend-interaction.tool.ts → Elixir → Frontend
                                           ↓
                                    POST /api/ai-responses
                                    type: "function_call"
```

**Implementare:**
- AI Agent apelează `call_frontend_function` tool
- Tool-ul trimite HTTP POST către Elixir `/api/ai-responses`
- Elixir broadcast către frontend pe canalul `messages:{tenant_id}`
- Frontend primește pe event-ul `ai_function_call`

### 3. **Răspunsuri de la Frontend**

```
Frontend → WebSocket → Elixir → AI Agent Server
              ↓
        event: "function_response"
              ↓
        POST /api/agent/frontend-responses
```

**Implementare:**
- Frontend execută funcția (ex: createResource, updateResource)
- Frontend trimite răspuns prin WebSocket către Elixir
- Elixir forward răspunsul către AI Agent Server
- AI Agent Server procesează răspunsul și poate continua conversația

---

## Componente Modificate

### AI Agent Server

#### 1. **frontend-interaction.tool.ts**
```typescript
// Înainte: Trimitea direct prin WebSocket Gateway
await this.wsGateway.sendMessageToSession(...)

// Acum: Trimite prin Elixir HTTP
await axios.post(`${elixirUrl}/api/ai-responses`, {
  tenant_id: businessId,
  type: 'function_call',
  context: {
    functionName,
    parameters
  }
})
```

#### 2. **bedrock-agent.service.ts**
```typescript
// Adăugat streaming în timp real
if (event.chunk) {
  const text = new TextDecoder().decode(chunk.bytes);
  outputText += text;
  
  // Trimite chunk către Elixir
  await this.elixirNotificationTool.execute({
    parameters: {
      businessId, userId, sessionId,
      content: text,
      context: { type: 'streaming_chunk', isComplete: false }
    }
  });
}
```

#### 3. **agent.controller.ts**
```typescript
// Nou endpoint pentru răspunsuri frontend
@Post('frontend-responses')
async processFrontendResponse(@Body() data: any) {
  return await this.agentService.processFrontendResponse(data);
}
```

#### 4. **main.ts**
```typescript
// Adăugat prefix global /api
app.setGlobalPrefix('api');
```

### Elixir Notification Hub

#### 1. **ai_responses_controller.ex**
```elixir
# Adăugat suport pentru function_call
case response_type do
  "function_call" ->
    broadcast_function_call(tenant_id, response)
  ...
end

# Nouă funcție broadcast
defp broadcast_function_call(tenant_id, response) do
  NotificationHubWeb.Endpoint.broadcast(
    "messages:#{tenant_id}", 
    "ai_function_call", 
    broadcast_payload
  )
end
```

#### 2. **message_channel.ex**
```elixir
# Handler pentru răspunsuri frontend
def handle_in("function_response", payload, socket) do
  case process_function_response(payload, socket) do
    {:ok, response} -> {:reply, {:ok, response}, socket}
    {:error, reason} -> {:reply, {:error, reason}, socket}
  end
end

# Forward către AI Agent Server
defp send_function_response_to_ai_agent(business_id, session_id, function_response, payload) do
  endpoint_url = "#{ai_agent_url}/api/frontend-responses"
  # POST către AI Agent Server
end
```

---

## Endpoint-uri Disponibile

### AI Agent Server (`http://localhost:3003`)

| Endpoint | Method | Descriere |
|----------|--------|-----------|
| `/api/agent/process-message` | POST | Procesare mesaje utilizator |
| `/api/agent/frontend-responses` | POST | Primire răspunsuri de la frontend |
| `/api/agent/health` | GET | Health check |

### Elixir Notification Hub (`http://localhost:4000`)

| Endpoint | Method | Descriere |
|----------|--------|-----------|
| `/api/ai-responses` | POST | Primire mesaje de la AI Agent (streaming, function calls) |
| `/api/messages` | POST | Primire mesaje de la frontend |
| `/api/health` | GET | Health check |

---

## Evenimente WebSocket

### Frontend → Elixir (Phoenix Channel: `messages:{tenant_id}`)

| Event | Payload | Descriere |
|-------|---------|-----------|
| `new_message` | `{businessId, userId, message}` | Mesaj nou de la utilizator |
| `function_response` | `{businessId, sessionId, functionResponse}` | Răspuns la apel funcție |

### Elixir → Frontend (Broadcast pe `messages:{tenant_id}`)

| Event | Payload | Descriere |
|-------|---------|-----------|
| `new_message` | `{responseId, message, timestamp, streaming, actions}` | Mesaj AI (chunk sau complet) |
| `ai_function_call` | `{functionName, parameters, timestamp}` | Apel funcție către frontend |

**Payload `new_message` include:**
```javascript
{
  responseId: "msg_123",
  message: "text chunk sau mesaj complet",
  timestamp: "2025-10-12T10:00:00.000Z",
  sessionId: "uuid-session",
  actions: [...],
  streaming: {
    type: "streaming_chunk" | "streaming_complete" | null,
    isComplete: true | false,
    isChunk: true | false
  },
  toolsUsed: [...]
}
```

---

## Exemple de Utilizare

### 1. **AI Apelează Funcție Frontend**

```typescript
// AI Agent apelează tool
await toolExecutor.executeTool({
  toolName: 'call_frontend_function',
  parameters: {
    functionName: 'createResource',
    parameters: {
      resourceType: 'appointment',
      data: {
        patientName: 'Ion Popescu',
        date: '2025-10-13',
        time: '14:00'
      }
    }
  }
});

// → Trimite HTTP către Elixir
// → Elixir broadcast către Frontend
// → Frontend primește pe event "ai_function_call"
```

### 2. **Frontend Răspunde cu Rezultat**

```javascript
// Frontend execută funcția
const result = await createAppointment(data);

// Trimite răspuns înapoi prin WebSocket
channel.push("function_response", {
  businessId: "B0100001",
  sessionId: currentSessionId,
  functionResponse: {
    success: true,
    functionName: "createResource",
    data: {
      resourceId: "apt_123",
      created: true
    },
    timestamp: new Date().toISOString()
  }
});

// → Elixir forward către AI Agent Server
// → AI Agent Server procesează răspunsul
```

### 3. **Streaming Mesaje AI**

**Backend (Bedrock Agent):**
```typescript
// Bedrock trimite chunks
for await (const event of response.completion) {
  if (event.chunk && chunk.bytes) {
    const text = decode(chunk.bytes);
    
    // Trimite imediat către frontend prin Elixir
    await elixirNotificationTool.execute({
      content: text,
      context: { 
        type: 'streaming_chunk', 
        isComplete: false 
      }
    });
  }
}

// La final, trimite mesaj complet
await elixirNotificationTool.execute({
  content: fullMessage,
  context: { 
    type: 'streaming_complete', 
    isComplete: true,
    toolsUsed,
    actions 
  }
});
```

**Frontend (Phoenix Channel):**
```javascript
// Variabilă pentru mesajul curent în curs de streaming
let currentStreamingMessage = null;

// Ascultă pentru mesaje AI
channel.on("new_message", (payload) => {
  console.log("Received message:", payload);

  if (payload.streaming && payload.streaming.isChunk) {
    // Este un chunk de streaming
    if (!currentStreamingMessage) {
      // Creează un nou mesaj în UI
      currentStreamingMessage = {
        id: payload.responseId,
        text: payload.message,
        timestamp: payload.timestamp,
        isStreaming: true
      };
      displayMessage(currentStreamingMessage);
    } else {
      // Adaugă chunk-ul la mesajul existent
      currentStreamingMessage.text += payload.message;
      updateMessage(currentStreamingMessage);
    }
  } else if (payload.streaming && payload.streaming.isComplete) {
    // Mesaj complet - finalizează streaming-ul
    if (currentStreamingMessage) {
      currentStreamingMessage.isStreaming = false;
      currentStreamingMessage.actions = payload.actions;
      currentStreamingMessage.toolsUsed = payload.toolsUsed;
      finalizeMessage(currentStreamingMessage);
      currentStreamingMessage = null;
    } else {
      // Mesaj complet primit direct (fără chunks)
      displayMessage({
        id: payload.responseId,
        text: payload.message,
        timestamp: payload.timestamp,
        actions: payload.actions,
        toolsUsed: payload.toolsUsed,
        isStreaming: false
      });
    }
  } else {
    // Mesaj normal (fără streaming)
    displayMessage({
      id: payload.responseId,
      text: payload.message,
      timestamp: payload.timestamp,
      actions: payload.actions,
      isStreaming: false
    });
  }
});

function displayMessage(message) {
  // Creează element în UI pentru mesaj
  const messageEl = document.createElement('div');
  messageEl.id = message.id;
  messageEl.className = 'message ai-message';
  messageEl.innerHTML = `
    <div class="message-content">${message.text}</div>
    ${message.isStreaming ? '<div class="streaming-indicator">●●●</div>' : ''}
  `;
  document.getElementById('chat-container').appendChild(messageEl);
}

function updateMessage(message) {
  // Actualizează mesajul existent cu noul text
  const messageEl = document.getElementById(message.id);
  if (messageEl) {
    messageEl.querySelector('.message-content').textContent = message.text;
  }
}

function finalizeMessage(message) {
  // Finalizează mesajul - elimină indicator și adaugă actions
  const messageEl = document.getElementById(message.id);
  if (messageEl) {
    const indicator = messageEl.querySelector('.streaming-indicator');
    if (indicator) indicator.remove();
    
    // Adaugă actions dacă există
    if (message.actions && message.actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'message-actions';
      actionsEl.innerHTML = message.actions.map(action => 
        `<button class="action-btn">${action.label}</button>`
      ).join('');
      messageEl.appendChild(actionsEl);
    }
  }
}
```

---

## Format Mesaje

### Function Call (AI → Frontend)

```json
{
  "tenant_id": "B0100001",
  "user_id": "user_123",
  "session_id": "uuid-session",
  "type": "function_call",
  "content": "Calling frontend function: createResource",
  "context": {
    "type": "function_call",
    "functionName": "createResource",
    "parameters": {
      "resourceType": "appointment",
      "data": { ... }
    },
    "locationId": "L0100001"
  },
  "timestamp": "2025-10-12T10:00:00.000Z"
}
```

### Function Response (Frontend → AI)

```json
{
  "tenant_id": "B0100001",
  "session_id": "uuid-session",
  "function_response": {
    "success": true,
    "functionName": "createResource",
    "data": {
      "resourceId": "apt_123",
      "created": true
    },
    "error": null,
    "timestamp": "2025-10-12T10:00:05.000Z"
  },
  "timestamp": "2025-10-12T10:00:05.000Z"
}
```

### Streaming Chunk

```json
{
  "tenant_id": "B0100001",
  "user_id": "user_123",
  "session_id": "uuid-session",
  "message_id": "chunk_1728734400000",
  "content": "Bună ziua! ",
  "context": {
    "type": "streaming_chunk",
    "isComplete": false
  },
  "type": "agent.response",
  "timestamp": "2025-10-12T10:00:00.000Z"
}
```

---

## Variabile de Mediu

### AI Agent Server (.env)

```bash
# Elixir Notification Hub
ELIXIR_HTTP_URL=http://localhost:4000

# Server
PORT=3003
```

### Elixir Notification Hub (config.exs)

```elixir
config :notification_hub,
  ai_agent_http_url: System.get_env("AI_AGENT_HTTP_URL") || "http://ai-agent-server:3003"
```

---

## Beneficii Noii Arhitecturi

### 1. **Centralizare Comunicare**
- Toate mesajele trec prin Elixir
- Management unificat al WebSocket connections
- Logging și monitoring centralizat

### 2. **Streaming în Timp Real**
- Utilizatorii văd răspunsurile AI pe măsură ce sunt generate
- Experiență UX îmbunătățită
- Feedback instantaneu

### 3. **Comunicare Bidirectională**
- Frontend poate răspunde la cereri AI
- AI poate continua conversația bazat pe răspunsuri
- Flux complet de interacțiune

### 4. **Scalabilitate**
- Elixir gestionează eficient multe conexiuni simultane
- Broadcast-uri optimizate către multiple clienți
- Separare clară a responsabilităților

---

## Troubleshooting

### 1. **Function call nu ajunge la frontend**
- Verifică că Elixir rulează pe portul 4000
- Verifică că frontend este conectat la canalul `messages:{tenant_id}`
- Verifică logs în `ai_responses_controller.ex`

### 2. **Frontend response nu ajunge la AI Agent**
- Verifică că AI Agent Server rulează pe portul 3003
- Verifică că endpoint-ul `/api/agent/frontend-responses` este accesibil
- Verifică logs în `message_channel.ex`

### 3. **Streaming nu funcționează**
- Verifică că `ELIXIR_HTTP_URL` este setat corect
- Verifică că Elixir primește POST-urile la `/api/ai-responses`
- Verifică că frontend ascultă pe event-ul `new_message`

---

## Migrare de la Arhitectura Veche

### Ce s-a schimbat:

1. **Management Server Tool → Eliminat**
   - Settings acum se accesează prin app-server cu `resourceType: 'setting'`

2. **Frontend Interaction Tool → Refactorizat**
   - Nu mai folosește WebSocket Gateway direct
   - Trimite prin Elixir HTTP

3. **Bedrock Agent Service → Enhanced**
   - Adăugat streaming în timp real
   - Trimite chunks către Elixir

4. **Elixir → Enhanced**
   - Suport pentru function_call
   - Handler pentru function_response
   - Forward către AI Agent Server

---

## Concluzie

Noua arhitectură oferă o comunicare mai robustă, scalabilă și user-friendly între AI Agent Server, Elixir și Frontend. Streaming-ul în timp real și comunicarea bidirectională îmbunătățesc semnificativ experiența utilizatorului și permit interacțiuni mai complexe.

Pentru întrebări sau probleme, verifică logs-urile în:
- AI Agent Server: `console.log` și `Logger`
- Elixir: `Logger.info` și `Logger.error`
- Frontend: Browser console

