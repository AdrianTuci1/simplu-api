# Chat Session Management Guide

## Prezentare Generală

Acest ghid descrie cum să gestionezi sesiunile de chat prin **AI Agent Server (HTTP REST API)**. 

**Important:** Streaming-ul mesajelor în timp real se face prin **Elixir** (vezi [ELIXIR_FRONTEND_INTERACTION_GUIDE.md](./ELIXIR_FRONTEND_INTERACTION_GUIDE.md)), dar **managementul sesiunilor (creare, listare, istoricul)** se face prin **AI Agent Server HTTP API**.

---

## Arhitectura Separării Responsabilităților

```
┌─────────────────────────────────────────────────────┐
│                 FRONTEND                             │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
               │                      │
       ┌───────▼────────┐    ┌────────▼──────────┐
       │  HTTP REST API │    │  WebSocket        │
       │  (Sesiuni)     │    │  (Streaming)      │
       └───────┬────────┘    └────────┬──────────┘
               │                      │
               │                      │
       ┌───────▼────────────┐  ┌──────▼──────────┐
       │ AI Agent Server    │  │ Elixir Hub      │
       │ :3003              │  │ :4000           │
       │                    │  │                 │
       │ - GET /sessions    │  │ - Streaming     │
       │ - POST /messages   │  │ - Broadcast     │
       │ - Session CRUD     │  │ - Real-time     │
       └────────────────────┘  └─────────────────┘
```

### Când folosești fiecare:

| Acțiune | Serviciu | Protocol | Endpoint |
|---------|----------|----------|----------|
| Creare sesiune nouă | AI Agent Server | HTTP | `POST /api/messages` |
| Preluare sesiune activă | AI Agent Server | HTTP | `GET /api/sessions/business/{businessId}/user/{userId}/active` |
| Preluare istoric sesiuni | AI Agent Server | HTTP | `GET /api/sessions/business/{businessId}/user/{userId}/history` |
| Preluare mesaje sesiune | AI Agent Server | HTTP | `GET /api/sessions/{sessionId}/messages` |
| Trimitere mesaj nou | Elixir | WebSocket | `channel.push("new_message", ...)` |
| Primire răspuns AI | Elixir | WebSocket | `channel.on("new_message", ...)` |

---

## Endpoint-uri AI Agent Server

**Base URL:** `http://localhost:3003/api`

### 1. Creare Sesiune Nouă (Automată la Primul Mesaj)

Sesiunile se creează **automat** când trimiți primul mesaj prin WebSocket către Elixir. Nu trebuie să apelezi manual un endpoint de creare.

**Alternativ - Creare Explicită (Opțional):**

```http
POST /api/messages
Content-Type: application/json

{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "userId": "user_123",
  "message": "Bună ziua!",
  "businessType": "dental"
}
```

**Response:**
```json
{
  "success": true,
  "responseId": "resp_1728734400000_abc123",
  "message": "Bună ziua! Cu ce vă pot ajuta?",
  "actions": [],
  "timestamp": "2025-10-12T10:00:00.000Z",
  "sessionId": "uuid-v4-session-id"
}
```

**JavaScript Example:**
```javascript
async function sendFirstMessage(businessId, userId, message) {
  const response = await fetch('http://localhost:3003/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      businessId,
      locationId: 'L0100001',
      userId,
      message,
      businessType: 'dental'
    })
  });
  
  const data = await response.json();
  console.log('Session created:', data.sessionId);
  return data;
}
```

---

### 2. Preluare Sesiune Activă (Ultima Sesiune Deschisă)

Obține ultima sesiune activă pentru un utilizator specific într-un business.

```http
GET /api/sessions/business/{businessId}/user/{userId}/active
```

**Path Parameters:**
- `businessId` - ID-ul business-ului (ex: `B0100001`)
- `userId` - ID-ul utilizatorului (ex: `user_123`)

**Response:**
```json
{
  "sessionId": "uuid-v4-session-id",
  "businessId": "B0100001",
  "locationId": "L0100001",
  "userId": "user_123",
  "status": "active",
  "createdAt": "2025-10-12T09:00:00.000Z",
  "updatedAt": "2025-10-12T10:30:00.000Z",
  "lastMessageAt": "2025-10-12T10:30:00.000Z",
  "metadata": {
    "businessType": "dental",
    "context": {}
  }
}
```

**JavaScript Example:**
```javascript
async function getActiveSession(businessId, userId) {
  const response = await fetch(
    `http://localhost:3003/api/sessions/business/${businessId}/user/${userId}/active`
  );
  
  if (!response.ok) {
    console.error('Failed to get active session');
    return null;
  }
  
  const session = await response.json();
  
  if (session) {
    console.log('Active session found:', session.sessionId);
    console.log('Last message at:', session.lastMessageAt);
    return session;
  } else {
    console.log('No active session found');
    return null;
  }
}

// Usage
const session = await getActiveSession('B0100001', 'user_123');
if (session) {
  // Connect to WebSocket and continue conversation
  connectToChat(session.sessionId);
} else {
  // Create new session by sending first message
  await sendFirstMessage('B0100001', 'user_123', 'Hello!');
}
```

---

### 3. Preluare Ultimele 10 Sesiuni (Istoric)

Obține istoricul sesiunilor pentru un utilizator (ordonate de la cele mai recente).

```http
GET /api/sessions/business/{businessId}/user/{userId}/history?limit=10
```

**Path Parameters:**
- `businessId` - ID-ul business-ului
- `userId` - ID-ul utilizatorului

**Query Parameters:**
- `limit` - Numărul de sesiuni (default: 20, max recomandat: 50)

**Response:**
```json
[
  {
    "sessionId": "uuid-session-1",
    "businessId": "B0100001",
    "locationId": "L0100001",
    "userId": "user_123",
    "status": "active",
    "createdAt": "2025-10-12T09:00:00.000Z",
    "updatedAt": "2025-10-12T10:30:00.000Z",
    "lastMessageAt": "2025-10-12T10:30:00.000Z",
    "metadata": {
      "businessType": "dental",
      "context": {}
    }
  },
  {
    "sessionId": "uuid-session-2",
    "businessId": "B0100001",
    "locationId": "L0100001",
    "userId": "user_123",
    "status": "closed",
    "createdAt": "2025-10-11T14:00:00.000Z",
    "updatedAt": "2025-10-11T16:45:00.000Z",
    "lastMessageAt": "2025-10-11T16:45:00.000Z",
    "metadata": {
      "businessType": "dental",
      "context": {}
    }
  }
  // ... 8 more sessions
]
```

**JavaScript Example:**
```javascript
async function getSessionHistory(businessId, userId, limit = 10) {
  const response = await fetch(
    `http://localhost:3003/api/sessions/business/${businessId}/user/${userId}/history?limit=${limit}`
  );
  
  const sessions = await response.json();
  
  console.log(`Found ${sessions.length} sessions`);
  
  // Group by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = new Date(session.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});
  
  return { sessions, sessionsByDate };
}

// Usage
const { sessions, sessionsByDate } = await getSessionHistory('B0100001', 'user_123', 10);

// Display in UI
Object.entries(sessionsByDate).forEach(([date, sessions]) => {
  console.log(`\n${date}:`);
  sessions.forEach(session => {
    const time = new Date(session.createdAt).toLocaleTimeString();
    console.log(`  - ${time} (${session.status})`);
  });
});
```

---

### 4. Preluare Mesaje dintr-o Sesiune

Obține toate mesajele dintr-o sesiune specifică.

```http
GET /api/sessions/{sessionId}/messages?limit=50
```

**Path Parameters:**
- `sessionId` - ID-ul sesiunii

**Query Parameters:**
- `limit` - Numărul de mesaje (default: 50, max recomandat: 100)

**Response:**
```json
[
  {
    "messageId": "msg_1728734400000_abc123",
    "sessionId": "uuid-session-id",
    "businessId": "B0100001",
    "userId": "user_123",
    "content": "Bună ziua! Vreau să fac o programare.",
    "type": "user",
    "timestamp": "2025-10-12T10:00:00.000Z",
    "metadata": {
      "source": "websocket"
    }
  },
  {
    "messageId": "msg_1728734405000_def456",
    "sessionId": "uuid-session-id",
    "businessId": "B0100001",
    "userId": "agent",
    "content": "Bună ziua! Cu plăcere vă ajut să faceți o programare. Pentru ce serviciu doriți?",
    "type": "agent",
    "timestamp": "2025-10-12T10:00:05.000Z",
    "metadata": {
      "source": "bedrock",
      "toolsUsed": ["query_app_server"]
    }
  }
  // ... more messages
]
```

**JavaScript Example:**
```javascript
async function loadSessionMessages(sessionId, limit = 50) {
  const response = await fetch(
    `http://localhost:3003/api/sessions/${sessionId}/messages?limit=${limit}`
  );
  
  const messages = await response.json();
  
  console.log(`Loaded ${messages.length} messages`);
  
  // Display in chat UI
  messages.forEach(msg => {
    displayMessage({
      id: msg.messageId,
      text: msg.content,
      type: msg.type, // 'user' or 'agent'
      timestamp: msg.timestamp
    });
  });
  
  return messages;
}

// Usage - Load history when user opens a previous session
await loadSessionMessages('uuid-session-id', 100);
```

---

### 5. Preluare Sesiune Specifică (By ID)

Obține detaliile unei sesiuni specifice.

```http
GET /api/sessions/{sessionId}
```

**Path Parameters:**
- `sessionId` - ID-ul sesiunii

**Response:**
```json
{
  "sessionId": "uuid-v4-session-id",
  "businessId": "B0100001",
  "locationId": "L0100001",
  "userId": "user_123",
  "status": "active",
  "createdAt": "2025-10-12T09:00:00.000Z",
  "updatedAt": "2025-10-12T10:30:00.000Z",
  "lastMessageAt": "2025-10-12T10:30:00.000Z",
  "metadata": {
    "businessType": "dental",
    "context": {}
  }
}
```

---

## Statusuri Sesiune

| Status | Descriere | Când se folosește |
|--------|-----------|-------------------|
| `active` | Sesiune deschisă | Conversație în curs |
| `closed` | Sesiune închisă | Utilizator a terminat conversația |
| `resolved` | Sesiune rezolvată | Issue-ul a fost rezolvat |
| `abandoned` | Sesiune abandonată | Utilizator nu a mai răspuns >30 min |

---

## Flux Complet de Implementare Frontend

### 1. La încărcarea aplicației

```javascript
import { Socket } from "phoenix";

class ChatManager {
  constructor(businessId, userId) {
    this.businessId = businessId;
    this.userId = userId;
    this.currentSession = null;
    this.socket = null;
    this.channel = null;
  }

  async initialize() {
    // 1. Încearcă să preiei sesiunea activă
    this.currentSession = await this.getActiveSession();
    
    if (this.currentSession) {
      // 2. Încarcă istoricul mesajelor din sesiunea activă
      await this.loadSessionMessages(this.currentSession.sessionId);
    }
    
    // 3. Conectează la WebSocket pentru streaming
    this.connectWebSocket();
  }

  async getActiveSession() {
    const response = await fetch(
      `http://localhost:3003/api/sessions/business/${this.businessId}/user/${this.userId}/active`
    );
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  }

  async loadSessionMessages(sessionId) {
    const response = await fetch(
      `http://localhost:3003/api/sessions/${sessionId}/messages?limit=100`
    );
    
    const messages = await response.json();
    
    // Display messages in UI
    messages.forEach(msg => this.displayMessage(msg));
  }

  connectWebSocket() {
    // Connect to Elixir WebSocket for real-time streaming
    this.socket = new Socket("ws://localhost:4000/socket", {
      params: { 
        businessId: this.businessId,
        userId: this.userId 
      }
    });

    this.socket.connect();

    this.channel = this.socket.channel(`messages:${this.businessId}`, {
      userId: this.userId
    });

    this.channel.join()
      .receive("ok", () => {
        console.log("Connected to chat channel");
      })
      .receive("error", (error) => {
        console.error("Failed to join channel:", error);
      });

    // Listen for AI responses (streaming)
    this.channel.on("new_message", (payload) => {
      this.handleStreamingMessage(payload);
    });

    // Listen for function calls
    this.channel.on("ai_function_call", (payload) => {
      this.handleFunctionCall(payload);
    });
  }

  async sendMessage(message) {
    // Send through WebSocket for real-time streaming response
    this.channel.push("new_message", {
      businessId: this.businessId,
      userId: this.userId,
      message: message,
      sessionId: this.currentSession?.sessionId,
      timestamp: new Date().toISOString()
    });

    // Display user message immediately
    this.displayMessage({
      messageId: `msg_${Date.now()}`,
      content: message,
      type: 'user',
      timestamp: new Date().toISOString()
    });
  }

  handleStreamingMessage(payload) {
    // Handle streaming chunks and complete messages
    if (payload.streaming && payload.streaming.isChunk) {
      this.updateStreamingMessage(payload);
    } else {
      this.displayMessage({
        messageId: payload.responseId,
        content: payload.message,
        type: 'agent',
        timestamp: payload.timestamp,
        actions: payload.actions
      });
    }

    // Update current session ID if received
    if (payload.sessionId && !this.currentSession) {
      this.currentSession = { sessionId: payload.sessionId };
    }
  }

  displayMessage(message) {
    // Implement UI display logic
    console.log(`[${message.type}] ${message.content}`);
  }

  updateStreamingMessage(payload) {
    // Implement streaming update logic
    console.log(`[streaming] ${payload.message}`);
  }

  handleFunctionCall(payload) {
    // Handle frontend function calls from AI
    console.log('Function call:', payload.functionData);
  }
}

// Usage
const chatManager = new ChatManager('B0100001', 'user_123');
await chatManager.initialize();
```

---

### 2. Sidebar cu Istoricul Sesiunilor

```javascript
class SessionHistory {
  constructor(businessId, userId) {
    this.businessId = businessId;
    this.userId = userId;
  }

  async loadHistory(limit = 10) {
    const response = await fetch(
      `http://localhost:3003/api/sessions/business/${this.businessId}/user/${this.userId}/history?limit=${limit}`
    );
    
    const sessions = await response.json();
    return this.groupByDate(sessions);
  }

  groupByDate(sessions) {
    const grouped = {};
    
    sessions.forEach(session => {
      const date = new Date(session.createdAt).toLocaleDateString('ro-RO');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });
    
    return grouped;
  }

  renderSidebar() {
    const sidebar = document.getElementById('session-sidebar');
    
    this.loadHistory().then(groupedSessions => {
      sidebar.innerHTML = '';
      
      Object.entries(groupedSessions).forEach(([date, sessions]) => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'session-date-group';
        dateGroup.innerHTML = `<h3>${date}</h3>`;
        
        sessions.forEach(session => {
          const sessionEl = document.createElement('div');
          sessionEl.className = `session-item ${session.status}`;
          sessionEl.innerHTML = `
            <div class="session-time">${new Date(session.createdAt).toLocaleTimeString()}</div>
            <div class="session-status">${session.status}</div>
          `;
          
          sessionEl.onclick = () => this.switchToSession(session.sessionId);
          dateGroup.appendChild(sessionEl);
        });
        
        sidebar.appendChild(dateGroup);
      });
    });
  }

  async switchToSession(sessionId) {
    // Load messages from selected session
    const response = await fetch(
      `http://localhost:3003/api/sessions/${sessionId}/messages?limit=100`
    );
    
    const messages = await response.json();
    
    // Clear current chat and display historical messages
    document.getElementById('chat-container').innerHTML = '';
    messages.forEach(msg => displayMessage(msg));
    
    // Update current session
    currentSession = { sessionId };
  }
}

// Usage
const history = new SessionHistory('B0100001', 'user_123');
history.renderSidebar();
```

---

## Structura Sesiune & Mesaj

### Session Interface

```typescript
interface Session {
  sessionId: string;           // UUID v4 sau format custom
  businessId: string;          // ID business
  locationId: string;          // ID locație
  userId: string;              // ID utilizator
  status: 'active' | 'closed' | 'resolved' | 'abandoned';
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  lastMessageAt: string;       // ISO timestamp
  metadata: {
    businessType: string;      // Tipul business-ului
    context: any;              // Context suplimentar
  };
}
```

### Message Interface

```typescript
interface Message {
  messageId: string;           // UUID sau ID custom
  sessionId: string;           // ID sesiune
  businessId: string;          // ID business
  userId: string;              // ID utilizator sau 'agent'
  content: string;             // Conținutul mesajului
  type: 'user' | 'agent' | 'system';
  timestamp: string;           // ISO timestamp
  metadata: {
    source: 'websocket' | 'http' | 'webhook';
    toolsUsed?: string[];      // Tools folosite de AI
    responseId?: string;       // ID răspuns
    externalId?: string;       // ID extern
  };
}
```

---

## Best Practices

### 1. **Cache Local pentru Sesiuni**

```javascript
class SessionCache {
  constructor() {
    this.cache = new Map();
  }

  set(businessId, userId, session) {
    const key = `${businessId}:${userId}`;
    this.cache.set(key, {
      session,
      timestamp: Date.now()
    });
  }

  get(businessId, userId) {
    const key = `${businessId}:${userId}`;
    const cached = this.cache.get(key);
    
    // Cache valid for 5 minutes
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.session;
    }
    
    return null;
  }
}
```

### 2. **Lazy Loading pentru Istoric**

```javascript
// Load only 10 sessions initially
await loadHistory(10);

// Load more when user scrolls
document.getElementById('history-container').onscroll = (e) => {
  if (e.target.scrollTop + e.target.clientHeight >= e.target.scrollHeight - 100) {
    loadMoreSessions();
  }
};
```

### 3. **Debounce pentru Auto-Save**

```javascript
const debouncedSave = debounce((sessionId, data) => {
  // Save session data
  fetch(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}, 2000);
```

---

## Troubleshooting

### 1. **Nu găsesc sesiunea activă**

```javascript
const session = await getActiveSession('B0100001', 'user_123');

if (!session) {
  console.log('No active session - creating new one');
  // Send first message to create session
  await sendFirstMessage('B0100001', 'user_123', 'Hello!');
}
```

### 2. **Sesiune expirată**

```javascript
const session = await getSession(sessionId);

if (session.status === 'closed' || session.status === 'abandoned') {
  // Create new session
  await sendFirstMessage(businessId, userId, 'Continuing conversation...');
}
```

### 3. **Mesaje lipsă**

```javascript
// Always load messages after getting session
const session = await getActiveSession(businessId, userId);
if (session) {
  const messages = await loadSessionMessages(session.sessionId);
  console.log(`Loaded ${messages.length} messages`);
}
```

---

## Concluzie

Acest sistem oferă un management complet al sesiunilor prin HTTP REST API, separat de streaming-ul în timp real prin WebSocket. Frontend-ul poate:

- ✅ Crea sesiuni noi automat
- ✅ Prelua ultima sesiune activă
- ✅ Afișa istoric de sesiuni
- ✅ Încărca mesajele dintr-o sesiune
- ✅ Naviga între sesiuni diferite
- ✅ Streaming în timp real prin Elixir (vezi [ELIXIR_FRONTEND_INTERACTION_GUIDE.md](./ELIXIR_FRONTEND_INTERACTION_GUIDE.md))

Pentru întrebări sau probleme, verifică logs-urile în AI Agent Server și Elixir Notification Hub.

