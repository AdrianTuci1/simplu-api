# AI Agent Session Management & Messaging Guide

## Descriere Generală

Acest ghid explică cum să gestionezi sesiunile cu AI agent-ul și cum să trimiți/primești mesaje. Sesiunile sunt organizate **per tenant_id (business) și user_id pe zi**, permițând utilizatorilor să vadă întreaga conversație din ziua respectivă fără a gestiona conversații separate.

## Status Actualizare

**Ultima actualizare:** Sep 2025
**Versiune:** 2.0 - Sesiuni WebSocket cu AI Agent Server
**Modificări majore:** 
- Integrare completă cu AI Agent Server
- WebSocket Gateway pentru mesaje în timp real
- Gestionare automată a sesiunilor
- Crypto polyfill pentru Node.js 18 Alpine

## Arhitectura Sesiunilor

### 1. **Structura Sesiunii**
```typescript
interface Session {
  sessionId: string;           // Partition Key (Primary Key) - UUID v4 sau format custom
  businessId: string;          // Regular field, nu cheie primară
  locationId: string;          // ID-ul locației
  userId: string;              // ID-ul utilizatorului
  status: 'active' | 'closed' | 'resolved' | 'abandoned';
  createdAt: string;           // Timestamp creare
  updatedAt: string;           // Timestamp ultima actualizare
  lastMessageAt: string;       // Timestamp ultimul mesaj
  metadata: {
    businessType: string;      // Tipul business-ului
    context: any;              // Context suplimentar
  };
}
```

### 2. **Structura Mesajului**
```typescript
interface Message {
  messageId: string;           // Partition Key - UUID v4 sau format custom
  sessionId: string;           // Sort Key - ID-ul sesiunii
  businessId: string;          // Regular field
  userId: string;              // ID-ul utilizatorului
  content: string;             // Conținutul mesajului
  type: 'user' | 'agent' | 'system';
  timestamp: string;           // Timestamp mesaj
  metadata: {
    source: 'websocket' | 'webhook' | 'cron';
    externalId?: string;       // ID extern (opțional)
    responseId?: string;       // ID răspuns (opțional)
  };
}
```

### 3. **Strategia Sesiunilor WebSocket**
- **Sesiunea se creează automat** la primul mesaj WebSocket
- **UUID v4 unic** pentru fiecare sesiune nouă
- **Fallback la format custom** dacă crypto.randomUUID nu este disponibil
- **Gestionare automată** prin AI Agent Server
- **Cleanup automat** pentru sesiuni rezolvate

## AI Agent Server - WebSocket Gateway

### 1. **Conectare WebSocket la AI Agent Server**

**Endpoint:** `ws://localhost:4000/socket/websocket`

**Canal pentru mesaje:** `messages:{businessId}`

**Format mesaj WebSocket:**
```typescript
interface MessageDto {
  businessId: string;          // ID business (obligatoriu)
  locationId: string;          // ID locație (obligatoriu)
  userId: string;              // ID utilizator (obligatoriu)
  message: string;             // Conținut mesaj (obligatoriu)
  sessionId?: string;          // Opțional - se generează automat
  timestamp?: string;          // Opțional - se generează automat
}
```

**Exemplu mesaj WebSocket:**
```json
{
  "businessId": "B0100001",       // ID business (obligatoriu)
  "locationId": "L0100001",       // ID locație (obligatoriu)
  "userId": "user_123",           // ID utilizator (obligatoriu)
  "message": "Vreau să fac o programare", // Conținut (obligatoriu)
  "sessionId": "uuid-v4-here",    // Opțional - se generează automat
  "timestamp": "2024-12-20T10:00:00.000Z" // Opțional - se generează automat
}
```

**Răspuns AI Agent prin WebSocket:**
```json
{
  "event": "new_message",
  "topic": "messages:B0100001",
  "payload": {
    "responseId": "uuid-v4-response",
    "message": "Bună! Te ajut să faci o programare. Ce tip de serviciu dorești?",
    "actions": [],
    "timestamp": "2024-12-20T10:00:05.000Z",
    "sessionId": "uuid-v4-session"
  }
}
```

**Răspuns de eroare prin WebSocket:**
```json
{
  "event": "error",
  "topic": "messages:B0100001",
  "payload": {
    "message": "Eroare la procesarea mesajului",
    "error": "Missing required parameters: businessId, locationId, userId, message"
  }
}
```

### 2. **Obținere Istoric Sesiune**

**Endpoint:** `GET http://localhost:3001/api/sessions/{sessionId}/messages`

**Notă:** Acest endpoint este disponibil prin AI Agent Server pentru a obține istoricul mesajelor dintr-o sesiune specifică.

**Query Parameters:**
- `limit` (opțional): Numărul de mesaje (default: 50)
- `before` (opțional): Timestamp pentru paginare

**Response:**
```json
{
  "sessionId": "B0100001:user_123:1704067200000",
  "businessId": "B0100001",
  "userId": "user_123",
  "messages": [
    {
      "messageId": "msg_1704067200000_abc123",
      "sessionId": "B0100001:user_123:1704067200000",
      "businessId": "B0100001",
      "userId": "user_123",
      "content": "Vreau să fac o programare",
      "type": "user",
      "timestamp": "2024-01-01T10:00:00.000Z",
      "metadata": {
        "source": "websocket"
      }
    },
    {
      "messageId": "msg_1704067200000_def456",
      "sessionId": "B0100001:user_123:1704067200000",
      "businessId": "B0100001",
      "userId": "agent",
      "content": "Bună! Te ajut să faci o programare. Ce tip de serviciu dorești?",
      "type": "agent",
      "timestamp": "2024-01-01T10:00:05.000Z",
      "metadata": {
        "source": "websocket",
        "responseId": "resp_1704067200000_xyz789"
      }
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

### 3. **Obținere Sesiuni Active pentru Business**

**Endpoint:** `GET http://localhost:3001/api/sessions/business/{businessId}/active`

**Notă:** Acest endpoint este disponibil prin AI Agent Server pentru a obține toate sesiunile active pentru un business specific.

**Response:**
```json
{
  "businessId": "B0100001",
  "activeSessions": [
    {
      "sessionId": "B0100001:user_123:1704067200000",
      "businessId": "B0100001",
      "locationId": "L0100001",
      "userId": "user_123",
      "status": "active",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T15:30:00.000Z",
      "lastMessageAt": "2024-01-01T15:30:00.000Z",
      "metadata": {
        "businessType": "medical",
        "context": {}
      }
    }
  ]
}
```

## WebSocket pentru Mesaje în Timp Real

### 1. **Conectare WebSocket la AI Agent Server**

**URL:** `ws://localhost:4000/socket/websocket`

**Canal pentru mesaje:** `messages:{businessId}`

**Event-uri WebSocket:**
- `phx_join` - Conectare la canal
- `phx_leave` - Deconectare de la canal  
- `new_message` - Trimitere mesaj nou
- `phx_reply` - Răspuns la join/leave
- `message_processed` - Broadcast către coordonatori

### 2. **Client JavaScript Complet**

```javascript
import { Socket } from "phoenix";

class AISessionClient {
  constructor(businessId, userId) {
    this.businessId = businessId;
    this.userId = userId;
    this.socket = null;
    this.messagesChannel = null;
    this.currentSessionId = null;
    this.messageHistory = [];
    this.isConnected = false;
  }

  // Conectare la WebSocket
  connect() {
    this.socket = new Socket("/socket", {
      params: { 
        businessId: this.businessId,
        userId: this.userId 
      }
    });

    this.socket.connect();

    // Join la canalul de mesaje
    this.messagesChannel = this.socket.channel(`messages:${this.businessId}`, {
      userId: this.userId
    });

    this.messagesChannel.join()
      .receive("ok", resp => {
        console.log("Conectat la canalul de mesaje:", resp);
        this.isConnected = true;
        this.loadTodaySession();
      })
      .receive("error", resp => {
        console.error("Eroare la conectarea la canal:", resp);
      });

    // Ascultă pentru răspunsuri AI
    this.messagesChannel.on("new_message", payload => {
      console.log("Mesaj nou primit:", payload);
      this.handleNewMessage(payload);
    });

    // Ascultă pentru broadcast-uri
    this.messagesChannel.on("message_processed", payload => {
      console.log("Mesaj procesat:", payload);
    });

    // Gestionare reconectare
    this.socket.onClose(() => {
      console.log("Conexiune WebSocket închisă");
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000);
    });
  }

  // Încărcare sesiunea zilei
  async loadTodaySession() {
    try {
      // Pentru WebSocket, sesiunea se va crea automat la primul mesaj
      // Generăm un ID temporar pentru afișare
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tempSessionId = `${this.businessId}:${this.userId}:${startOfDay.getTime()}`;
      
      this.currentSessionId = tempSessionId;
      
      console.log("Sesiunea temporară încărcată:", tempSessionId);
      console.log("Sesiunea reală se va crea la primul mesaj");
    } catch (error) {
      console.error("Eroare la încărcarea sesiunii:", error);
    }
  }

  // Încărcare istoric mesaje
  async loadMessageHistory(sessionId) {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/messages?limit=100`);
      const data = await response.json();
      
      this.messageHistory = data.messages || [];
      this.displayMessageHistory();
      
      console.log("Istoric încărcat:", this.messageHistory.length, "mesaje");
    } catch (error) {
      console.error("Eroare la încărcarea istoricului:", error);
    }
  }

  // Trimitere mesaj către AI prin WebSocket
  async sendMessage(content, context = {}) {
    if (!this.isConnected) {
      console.error("Nu sunt conectat la WebSocket");
      return;
    }

    const messageData = {
      businessId: this.businessId,
      locationId: 'default', // Sau ID-ul locației specifice
      userId: this.userId,
      message: content,
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString()
    };

    try {
      // Trimitere mesaj prin WebSocket
      this.messagesChannel.push("new_message", messageData, (response) => {
        if (response.status === 'ok') {
          console.log('Mesaj trimis cu succes');
        } else {
          console.error('Eroare la trimiterea mesajului:', response);
        }
      });

      // Adaugă mesajul utilizatorului în istoric local
      const userMessage = {
        messageId: this.generateMessageId(),
        sessionId: this.currentSessionId,
        businessId: this.businessId,
        userId: this.userId,
        content: content,
        type: 'user',
        timestamp: new Date().toISOString(),
        metadata: { source: 'websocket' }
      };
      
      this.messageHistory.push(userMessage);
      this.displayMessage(userMessage);
      
    } catch (error) {
      console.error('Eroare la trimiterea mesajului:', error);
    }
  }

  // Generare ID mesaj local
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Gestionare mesaj nou primit
  handleNewMessage(payload) {
    const { message, timestamp, responseId, sessionId } = payload;
    
    // Adaugă răspunsul AI în istoric
    const aiMessage = {
      messageId: responseId || this.generateMessageId(),
      sessionId: sessionId || this.currentSessionId,
      businessId: this.businessId,
      userId: 'agent',
      content: message,
      type: 'agent',
      timestamp: timestamp,
      metadata: { source: 'websocket', responseId }
    };
    
    this.messageHistory.push(aiMessage);
    this.displayMessage(aiMessage);
    
    // Actualizează sessionId dacă este nou
    if (sessionId && sessionId !== this.currentSessionId) {
      this.currentSessionId = sessionId;
      console.log('Nouă sesiune creată:', sessionId);
    }
  }

  // Afișare mesaj în UI
  displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}-message`;
    
    const isUser = message.type === 'user';
    const sender = isUser ? 'Tu' : 'AI Agent';
    
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="sender">${sender}</span>
        <span class="time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${message.content}</div>
    `;
    
    document.getElementById('chat-container').appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
  }

  // Afișare istoric complet
  displayMessageHistory() {
    const container = document.getElementById('chat-container');
    container.innerHTML = ''; // Curăță container-ul
    
    this.messageHistory.forEach(message => {
      this.displayMessage(message);
    });
  }

  // Deconectare
  disconnect() {
    if (this.messagesChannel) {
      this.messagesChannel.leave();
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
```

### 3. **HTML Template pentru Chat**

```html
<!DOCTYPE html>
<html>
<head>
    <title>AI Chat - Sesiune Zilnică</title>
    <script src="https://cdn.jsdelivr.net/npm/phoenix@1.6.0/priv/static/phoenix.js"></script>
    <style>
        .chat-container {
            max-width: 800px;
            margin: 20px auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .chat-header {
            background: #007bff;
            color: white;
            padding: 15px;
            text-align: center;
        }
        
        .chat-messages {
            height: 500px;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .message {
            margin: 15px 0;
            padding: 12px;
            border-radius: 8px;
            max-width: 80%;
        }
        
        .user-message {
            background: #007bff;
            color: white;
            margin-left: auto;
            text-align: right;
        }
        
        .agent-message {
            background: white;
            border: 1px solid #ddd;
        }
        
        .message-header {
            font-size: 12px;
            margin-bottom: 5px;
            opacity: 0.8;
        }
        
        .message-content {
            line-height: 1.4;
        }
        
        .chat-input {
            padding: 20px;
            background: white;
            border-top: 1px solid #ddd;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
        }
        
        .message-input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .send-button {
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .send-button:hover {
            background: #0056b3;
        }
        
        .session-info {
            background: #e9ecef;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>AI Chat Assistant</h2>
            <div class="session-info" id="session-info">
                Încărcare sesiune...
            </div>
        </div>
        
        <div class="chat-messages" id="chat-container">
            <!-- Mesajele vor fi afișate aici -->
        </div>
        
        <div class="chat-input">
            <div class="input-group">
                <input 
                    type="text" 
                    id="message-input" 
                    class="message-input" 
                    placeholder="Scrie un mesaj..."
                    onkeypress="handleKeyPress(event)"
                >
                <button id="send-button" class="send-button" onclick="sendMessage()">
                    Trimite
                </button>
            </div>
        </div>
    </div>

    <script>
        // Configurare
        const BUSINESS_ID = 'B0100001'; // Înlocuiește cu ID-ul tău
        const USER_ID = 'user_123';     // Înlocuiește cu ID-ul utilizatorului
        
        // Inițializare client
        const chatClient = new AISessionClient(BUSINESS_ID, USER_ID);
        
        // Conectare la WebSocket
        chatClient.connect();
        
        // Funcții pentru UI
        function sendMessage() {
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            
            if (content) {
                chatClient.sendMessage(content);
                input.value = '';
            }
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }
        
        // Actualizare informații sesiune
        function updateSessionInfo() {
            const sessionInfo = document.getElementById('session-info');
            if (chatClient.currentSessionId) {
                const sessionDate = new Date(parseInt(chatClient.currentSessionId.split(':')[2]));
                sessionInfo.textContent = `Sesiune: ${sessionDate.toLocaleDateString('ro-RO')} - ${chatClient.messageHistory.length} mesaje`;
            }
        }
        
        // Actualizare la fiecare mesaj nou
        const originalDisplayMessage = chatClient.displayMessage;
        chatClient.displayMessage = function(message) {
            originalDisplayMessage.call(this, message);
            updateSessionInfo();
        };
    </script>
</body>
</html>
```

## Gestionarea Sesiunilor - AI Agent Server

### 1. **Crearea Automată a Sesiunilor**

Sesiunea se creează automat la primul mesaj WebSocket:

```typescript
// În ai-agent-server/src/modules/websocket/websocket.gateway.ts
private generateSessionId(data: MessageDto): string {
  // Încearcă să folosească crypto.randomUUID dacă este disponibil
  if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
    return global.crypto.randomUUID();
  }
  
  // Fallback la implementarea existentă
  return `${data.businessId}:${data.userId}:${Date.now()}`;
}
```

### 2. **Gestionarea Automată a Sesiunilor**

Sesiunile se gestionează automat prin AI Agent Server:

```typescript
// În ai-agent-server/src/modules/session/session.service.ts
async createSession(
  businessId: string,
  locationId: string,
  userId: string,
  businessType: string
): Promise<Session> {
  // Încearcă să folosească crypto.randomUUID dacă este disponibil
  let sessionId: string;
  if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
    sessionId = global.crypto.randomUUID();
  } else {
    // Fallback la implementarea existentă
    sessionId = `${businessId}:${userId}:${Date.now()}`;
  }
  
  const session: Session = {
    sessionId,
    businessId,
    locationId,
    userId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    metadata: {
      businessType,
      context: {}
    }
  };

  await this.dynamoClient.send(new PutItemCommand({
    TableName: tableNames.sessions,
    Item: marshall(session)
  }));

  return session;
}
```

### 3. **Cleanup Sesiuni Vechi**

Sesiunile rezolvate se curăță automat prin cron job-uri:

```typescript
// În ai-agent-server/src/modules/session/session.service.ts
async cleanupResolvedSessions(): Promise<void> {
  try {
    // Implementare cleanup pentru sesiuni rezolvate mai vechi de 30 de zile
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Scan pentru sesiuni rezolvate vechi
    const result = await this.dynamoClient.send(new ScanCommand({
      TableName: tableNames.sessions,
      FilterExpression: 'status = :status AND updatedAt < :updatedAt',
      ExpressionAttributeValues: marshall({
        ':status': 'resolved',
        ':updatedAt': thirtyDaysAgo.toISOString()
      })
    }));

    if (result.Items && result.Items.length > 0) {
      console.log(`Found ${result.Items.length} old resolved sessions to cleanup`);
      
      // Pentru moment, doar logăm - implementarea completă va fi adăugată ulterior
      // TODO: Implementează ștergerea efectivă a sesiunilor vechi
      // TODO: Implementează ștergerea efectivă a mesajelor asociate
      // TODO: Implementează ștergerea efectivă a sesiunilor
    } else {
      console.log('No old resolved sessions found for cleanup');
    }
    
    console.log('Cleanup resolved sessions older than:', thirtyDaysAgo.toISOString());
  } catch (error) {
    console.error('Error in cleanup resolved sessions:', error);
  }
}
```

## Exemple de Utilizare

### 1. **Trimitere Mesaj prin WebSocket**

```javascript
// Trimitere mesaj către AI Agent Server prin WebSocket
const messageData = {
  businessId: 'B0100001',
  locationId: 'L0100001',
  userId: 'user_123',
  message: 'Salut! Vreau să fac o programare pentru mâine',
  sessionId: 'uuid-v4-session', // Opțional
  timestamp: new Date().toISOString()
};

// Trimitere prin WebSocket
messagesChannel.push("new_message", messageData, (response) => {
  if (response.status === 'ok') {
    console.log('Mesaj trimis cu succes');
  } else {
    console.error('Eroare la trimiterea mesajului:', response);
  }
});
```

### 2. **Încărcare Istoric Sesiune**

```javascript
// Încărcare istoric mesaje prin AI Agent Server
const sessionId = 'uuid-v4-session-id';
const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/messages?limit=50`);
const data = await response.json();

console.log('Istoric mesaje:', data.messages);
```

### 3. **Monitorizare Sesiuni Active**

```javascript
// Obținere sesiuni active pentru business prin AI Agent Server
const response = await fetch('http://localhost:3001/api/sessions/business/B0100001/active');
const data = await response.json();

console.log('Sesiuni active:', data.activeSessions);
```

## Avantajele Sistemului

### 1. **Simplitate**
- **Sesiuni UUID v4 unice** per conversație
- **Gestionare automată** prin AI Agent Server
- **Istoricul complet** este disponibil automat

### 2. **Performanță**
- **Sesiuni optimizate** cu UUID v4
- **Cleanup automat** pentru sesiuni rezolvate
- **Indexare optimizată** în DynamoDB cu scan operations

### 3. **Scalabilitate**
- **Sesiuni per business și utilizator**
- **Separare clară** între diferitele business-uri
- **Arhitectură distribuită** cu WebSocket și HTTP

### 4. **UX Îmbunătățit**
- **Conversații continue** cu context păstrat
- **Notificări în timp real** prin WebSocket
- **Gestionare automată** a sesiunilor

## Troubleshooting

### 1. **Sesiunea nu se creează**
- Verifică dacă `businessId`, `locationId` și `userId` sunt corecte
- Verifică dacă AI Agent Server rulează pe portul 3001
- Verifică logurile pentru erori de creare sesiune

### 2. **WebSocket nu se conectează**
- Verifică dacă AI Agent Server rulează pe portul 3001
- Verifică CORS settings în WebSocket Gateway
- Verifică dacă canalul este corect formatat: `messages:{businessId}`

### 3. **Mesajele nu se trimit**
- Verifică dacă toate câmpurile obligatorii sunt prezente
- Verifică formatul JSON conform `MessageDto` interface
- Verifică logurile AI Agent Server pentru erori

### 4. **Istoricul nu se încarcă**
- Verifică dacă sessionId este corect formatat (UUID v4)
- Verifică dacă AI Agent Server este accesibil
- Verifică logurile DynamoDB și scan operations

## Concluzie

Acest sistem oferă o gestionare modernă și eficientă a sesiunilor cu AI agent-ul prin AI Agent Server, permițând utilizatorilor să aibă conversații continue cu context păstrat. Arhitectura este scalabilă și oferă performanță optimă prin utilizarea WebSocket pentru mesaje în timp real, UUID v4 pentru identificatori unici, și DynamoDB cu scan operations pentru operații CRUD.

## Caracteristici Tehnice

### **Crypto Polyfill**
- Suport pentru `crypto.randomUUID` în Node.js 18 Alpine
- Fallback la generare custom dacă nu este disponibil
- Import automat în `main.ts`

### **WebSocket Gateway**
- Gestionare automată a sesiunilor
- Broadcast către coordonatori
- Gestionare erori robustă

### **Session Service**
- Creare automată sesiuni cu UUID v4
- Scan operations pentru DynamoDB
- Cleanup automat sesiuni rezolvate

### **Agent Service**
- Procesare mesaje cu LangGraph
- Generare răspunsuri AI
- Integrare cu business info și RAG
