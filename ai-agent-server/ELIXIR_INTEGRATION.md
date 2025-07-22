# Arhitectura Sistemului

## Separarea Responsabilităților

- **AI Agent Server** - Procesează mesajele prin AI și generează răspunsuri automate
- **Elixir** - Proxy/Bridge permanent între utilizator și agent
- **User** - Se conectează la Elixir pentru a comunica cu agentul
- **Agent** - Se conectează la Elixir pentru a comunica cu utilizatorul

## Flux de Comunicare

### 1. Comunicare Continuă prin Elixir
- **User → Elixir → Agent**: Utilizatorul trimite mesaje prin Elixir către agent
- **Agent → Elixir → User**: Agentul trimite răspunsuri prin Elixir către utilizator
- Elixir este mereu conectat și acționează ca bridge permanent

### 2. Notificări Continue
- Utilizatorul ascultă în permanență notificările de la Elixir
- Agentul ascultă în permanență notificările de la Elixir
- Comunicarea este bidirecțională și în timp real

### 3. Sincronizare cu AI Agent Server
- AI Agent Server poate notifica Elixir despre conversații AI
- Elixir poate solicita informații de la AI Agent Server
- Sincronizare pentru context și istoric conversații

## Configurație

### Variabile de Mediu

```env
# WebSocket URL pentru Elixir (chat live cu coordonatori)
ELIXIR_WEBSOCKET_URL=ws://localhost:4000/socket/websocket

# HTTP URL pentru notificări (opțional)
ELIXIR_HTTP_URL=http://localhost:4000

# Timeout pentru request-uri HTTP (ms)
ELIXIR_TIMEOUT=5000

# Numărul de încercări pentru request-uri eșuate
ELIXIR_RETRY_ATTEMPTS=3
```

### Endpoint-uri Elixir pentru Sincronizare

Pentru sincronizarea cu AI Agent Server, Elixir expune următoarele endpoint-uri:

#### 1. Notificare Conversație AI
```
POST /api/ai-conversation
```

**Body:**
```json
{
  "businessId": "string",
  "locationId": "string", 
  "userId": "string",
  "sessionId": "string",
  "message": "string",
  "timestamp": "string",
  "type": "ai_conversation"
}
```

#### 2. Context AI pentru Agent
```
POST /api/ai-context
```

**Body:**
```json
{
  "sessionId": "string",
  "context": {
    "businessId": "string",
    "userId": "string",
    "lastMessage": "string",
    "aiResponse": "string",
    "timestamp": "string"
  },
  "timestamp": "string"
}
```

#### 3. Actualizare Status Conversație
```
PUT /api/conversation-status/{sessionId}
```

**Body:**
```json
{
  "status": "string",
  "summary": "string",
  "updatedAt": "string"
}
```

#### 4. Health Check
```
GET /health
```

## Flux de Comunicare

### 1. Mesaj de la Utilizator (AI Processing)
1. Utilizatorul trimite mesaj prin WebSocket către AI Agent Server
2. AI Agent Server salvează mesajul în DynamoDB
3. AI Agent Server procesează mesajul prin AI și generează răspuns automat
4. Răspunsul AI este salvat în DynamoDB și trimis către client
5. AI Agent Server notifică Elixir despre noua conversație (opțional)

### 2. Chat Live cu Coordonator (Elixir)
1. Utilizatorul poate solicita chat live cu coordonator prin Elixir
2. Elixir gestionează chat-ul live între utilizator și coordonator
3. Mesajele live sunt salvate separat în Elixir
4. Coordonatorul poate prelua conversația când este disponibil

### 3. Sincronizare Stare Conversații
1. AI Agent Server poate notifica Elixir despre conversațiile noi
2. Elixir poate solicita informații despre conversațiile existente
3. Coordonatorii pot vedea istoricul conversațiilor AI în Elixir

## WebSocket Communication

### AI Agent Server WebSocket
Aplicația AI Agent Server folosește WebSocket-uri native pentru comunicarea cu AI:

#### Conectare
```
ws://localhost:3001/socket/websocket
```

#### Join Channel
```json
{
  "event": "phx_join",
  "topic": "messages:{businessId}",
  "payload": {
    "businessId": "string",
    "userId": "string"
  },
  "ref": "1"
}
```

#### Trimite Mesaj AI
```json
{
  "event": "new_message",
  "topic": "messages:{businessId}",
  "payload": {
    "businessId": "string",
    "locationId": "string",
    "userId": "string",
    "message": "string"
  }
}
```

#### Primește Răspuns AI
```json
{
  "event": "new_message",
  "topic": "messages:{businessId}",
  "payload": {
    "responseId": "string",
    "message": "string",
    "actions": [],
    "timestamp": "string",
    "sessionId": "string"
  }
}
```

#### Cerere Transfer la Chat Live
```json
{
  "event": "transfer_to_live_chat",
  "topic": "messages:{businessId}",
  "payload": {
    "businessId": "string",
    "locationId": "string",
    "userId": "string",
    "message": "Vreau să vorbesc cu agentul în chat live"
  }
}
```

### Elixir WebSocket (Comunicare Continuă)
Pentru comunicarea continuă cu agentul, utilizatorii se conectează la Elixir WebSocket:

#### Conectare
```
ws://localhost:4000/socket/websocket
```

#### Join Channel pentru Comunicare
```json
{
  "event": "phx_join",
  "topic": "chat:{businessId}:{userId}",
  "payload": {
    "businessId": "string",
    "userId": "string"
  },
  "ref": "1"
}
```

#### Trimite Mesaj către Agent
```json
{
  "event": "user_message",
  "topic": "chat:{businessId}:{userId}",
  "payload": {
    "message": "string",
    "timestamp": "string"
  }
}
```

#### Primește Mesaj de la Agent
```json
{
  "event": "agent_message",
  "topic": "chat:{businessId}:{userId}",
  "payload": {
    "message": "string",
    "timestamp": "string"
  }
}
```

## Testare

### 1. Test WebSocket
Deschide `test-websocket.html` în browser pentru a testa comunicarea WebSocket.

### 2. Test HTTP Communication
```bash
# Test health check
curl http://localhost:4000/health

# Test send message
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location", 
    "userId": "test-user",
    "message": "Test message"
  }'
```

## Implementare în Elixir

Aplicația Elixir trebuie să implementeze endpoint-urile HTTP menționate mai sus. Exemplu de implementare:

```elixir
# router.ex
scope "/api", KafkaConsumerWeb do
  pipe_through :api
  
  post "/messages", MessageController, :create
  post "/agent-responses", AgentResponseController, :create
  get "/business/:id", BusinessController, :show
  get "/business/:id/reservations", BusinessController, :reservations
  post "/notifications", NotificationController, :create
end

get "/health", HealthController, :check
```

## Avantaje Comunicare Directă

1. **Simplitate** - Nu mai este nevoie de Kafka
2. **Performanță** - Comunicare directă, fără overhead
3. **Debugging** - Mai ușor de debugat
4. **Flexibilitate** - Poți implementa retry logic, timeout-uri, etc.
5. **Monitorizare** - Poți monitoriza request-urile HTTP

## Gestionarea Erorilor

Serviciul `ElixirHttpService` gestionează erorile și retry-urile:

- Timeout configurat pentru request-uri
- Retry logic pentru request-uri eșuate
- Logging pentru debugging
- Graceful degradation când Elixir nu este disponibil 