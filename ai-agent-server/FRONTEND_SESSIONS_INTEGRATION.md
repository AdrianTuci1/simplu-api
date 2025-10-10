# Frontend Sessions Integration Guide

## Overview

Sistemul de sesiuni și mesaje salvează tot în **DynamoDB** și funcționează independent de migrarea la Bedrock. Fiecare conversație cu AI-ul este organizată în sesiuni, iar fiecare mesaj este salvat și asociat cu o sesiune.

## Arhitectură

```
Frontend → WebSocket → ai-agent-server → Bedrock Agent → Tools
                              ↓
                         DynamoDB
                    (Sessions + Messages)
```

## Concepte Cheie

### Session (Sesiune)
- O **sesiune** = o conversație continuă între user și AI
- Identificator unic: `sessionId`
- Status: `active` (conversație în desfășurare) sau `resolved` (încheiată)
- Grupare: `businessId` + `userId` + `sessionId`

### Message (Mesaj)
- Fiecare mesaj aparține unei sesiuni
- Tipuri: `user` (de la utilizator) sau `agent` (răspuns AI)
- Salvat automat când se trimite prin WebSocket

## API Endpoints pentru Sesiuni

### 1. Obține Sesiune Activă pentru User

**Endpoint:** `GET /api/sessions/business/:businessId/user/:userId/active`

Returnează cea mai recentă sesiune activă pentru un utilizator.

**Request:**
```typescript
GET http://localhost:3003/api/sessions/business/dental_clinic_1/user/operator_1/active
```

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "businessId": "dental_clinic_1",
  "locationId": "location_1",
  "userId": "operator_1",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z",
  "lastMessageAt": "2024-01-15T11:45:00.000Z",
  "metadata": {
    "businessType": "dental",
    "context": {}
  }
}
```

**Când să folosești:**
- La încărcarea aplicației (pentru a continua conversația existentă)
- Înainte de a crea o sesiune nouă (verifici dacă există una activă)

### 2. Obține Istoricul de Sesiuni

**Endpoint:** `GET /api/sessions/business/:businessId/user/:userId/history?limit=20`

Returnează toate sesiunile (active + resolved) pentru un utilizator, sortate descrescător după data creării.

**Request:**
```typescript
GET http://localhost:3003/api/sessions/business/dental_clinic_1/user/operator_1/history?limit=20
```

**Response:**
```json
[
  {
    "sessionId": "session-1",
    "businessId": "dental_clinic_1",
    "userId": "operator_1",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastMessageAt": "2024-01-15T11:45:00.000Z"
  },
  {
    "sessionId": "session-2",
    "businessId": "dental_clinic_1",
    "userId": "operator_1",
    "status": "resolved",
    "createdAt": "2024-01-14T09:00:00.000Z",
    "lastMessageAt": "2024-01-14T10:00:00.000Z"
  }
]
```

**Când să folosești:**
- Pentru sidebar cu conversații anterioare
- Pentru funcția "History" / "Conversații anterioare"

### 3. Obține Mesajele unei Sesiuni

**Endpoint:** `GET /api/sessions/:sessionId/messages?limit=50`

Returnează toate mesajele dintr-o sesiune specifică.

**Request:**
```typescript
GET http://localhost:3003/api/sessions/550e8400-e29b-41d4-a716-446655440000/messages?limit=50
```

**Response:**
```json
[
  {
    "messageId": "msg_123",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "businessId": "dental_clinic_1",
    "userId": "operator_1",
    "content": "Vreau să văd lista de pacienți",
    "type": "user",
    "timestamp": "2024-01-15T11:40:00.000Z",
    "metadata": {
      "source": "websocket"
    }
  },
  {
    "messageId": "msg_124",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "businessId": "dental_clinic_1",
    "userId": "agent",
    "content": "Iată lista de pacienți activi...",
    "type": "agent",
    "timestamp": "2024-01-15T11:40:05.000Z",
    "metadata": {
      "source": "websocket",
      "responseId": "resp_456"
    }
  }
]
```

### 4. Obține Sesiuni Active pentru Business

**Endpoint:** `GET /api/sessions/business/:businessId/active`

Returnează toate sesiunile active pentru un business (util pentru dashboard admin).

**Request:**
```typescript
GET http://localhost:3003/api/sessions/business/dental_clinic_1/active
```

## Implementare Frontend

### React/TypeScript Example

```typescript
// types/session.ts
export interface Session {
  sessionId: string;
  businessId: string;
  locationId: string;
  userId: string;
  status: 'active' | 'resolved';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata: {
    businessType: string;
    context: Record<string, any>;
  };
}

export interface Message {
  messageId: string;
  sessionId: string;
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent';
  timestamp: string;
  metadata?: Record<string, any>;
}

// services/sessionService.ts
const AI_AGENT_BASE_URL = 'http://localhost:3003';

export class SessionService {
  /**
   * Obține sau creează sesiune activă pentru user
   */
  static async getOrCreateActiveSession(
    businessId: string,
    userId: string,
    locationId: string = 'default'
  ): Promise<Session> {
    try {
      // 1. Încearcă să obții sesiunea activă existentă
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/business/${businessId}/user/${userId}/active`
      );

      if (response.ok) {
        const session = await response.json();
        if (session) {
          console.log('✅ Found active session:', session.sessionId);
          return session;
        }
      }

      // 2. Dacă nu există, creează una nouă prin WebSocket
      // Sesiunea va fi creată automat când trimiți primul mesaj
      console.log('📝 No active session found, will create on first message');
      
      // Returnează un session placeholder
      return {
        sessionId: '', // Va fi setat de server
        businessId,
        locationId,
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        metadata: {
          businessType: 'dental',
          context: {}
        }
      };
    } catch (error) {
      console.error('Error getting/creating session:', error);
      throw error;
    }
  }

  /**
   * Obține istoricul de sesiuni
   */
  static async getSessionHistory(
    businessId: string,
    userId: string,
    limit: number = 20
  ): Promise<Session[]> {
    try {
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/business/${businessId}/user/${userId}/history?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }

  /**
   * Obține mesajele unei sesiuni
   */
  static async getSessionMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/${sessionId}/messages?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch session messages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  }
}

// hooks/useAISession.ts
import { useState, useEffect, useCallback } from 'react';
import { SessionService } from '../services/sessionService';
import { useWebSocket } from './useWebSocket';

export function useAISession(businessId: string, userId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Session[]>([]);
  
  const { sendMessage, connected } = useWebSocket();

  // 1. Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, [businessId, userId]);

  const loadActiveSession = async () => {
    try {
      setLoading(true);
      
      // Get or create active session
      const activeSession = await SessionService.getOrCreateActiveSession(
        businessId,
        userId
      );
      
      setSession(activeSession);

      // Load messages if session exists
      if (activeSession.sessionId) {
        const sessionMessages = await SessionService.getSessionMessages(
          activeSession.sessionId
        );
        setMessages(sessionMessages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load session history
  const loadSessionHistory = useCallback(async () => {
    try {
      const sessions = await SessionService.getSessionHistory(businessId, userId);
      setHistory(sessions);
    } catch (error) {
      console.error('Error loading session history:', error);
    }
  }, [businessId, userId]);

  // 3. Switch to a different session
  const switchToSession = async (sessionId: string) => {
    try {
      setLoading(true);
      
      // Load messages for this session
      const sessionMessages = await SessionService.getSessionMessages(sessionId);
      setMessages(sessionMessages);
      
      // Update current session
      const sessionFromHistory = history.find(s => s.sessionId === sessionId);
      if (sessionFromHistory) {
        setSession(sessionFromHistory);
      }
    } catch (error) {
      console.error('Error switching session:', error);
    } finally {
      setLoading(false);
    }
  };

  // 4. Create new session
  const createNewSession = async () => {
    try {
      setLoading(true);
      
      // Clear current messages
      setMessages([]);
      
      // Create placeholder session (will be created on first message)
      const newSession: Session = {
        sessionId: '',
        businessId,
        locationId: 'default',
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        metadata: {
          businessType: 'dental',
          context: {}
        }
      };
      
      setSession(newSession);
      
      // Refresh history
      await loadSessionHistory();
    } catch (error) {
      console.error('Error creating new session:', error);
    } finally {
      setLoading(false);
    }
  };

  // 5. Send message through WebSocket
  const send = useCallback((message: string) => {
    if (!connected) {
      console.error('WebSocket not connected');
      return;
    }

    sendMessage({
      businessId,
      userId,
      locationId: session?.locationId || 'default',
      message,
      sessionId: session?.sessionId || undefined, // Undefined = create new
      timestamp: new Date().toISOString()
    });

    // Optimistically add user message to UI
    const userMessage: Message = {
      messageId: `temp_${Date.now()}`,
      sessionId: session?.sessionId || '',
      businessId,
      userId,
      content: message,
      type: 'user',
      timestamp: new Date().toISOString(),
      metadata: { source: 'websocket' }
    };
    
    setMessages(prev => [...prev, userMessage]);
  }, [connected, sendMessage, businessId, userId, session]);

  return {
    session,
    messages,
    loading,
    history,
    send,
    loadSessionHistory,
    switchToSession,
    createNewSession,
    connected
  };
}

// components/AIChat.tsx
import { useAISession } from '../hooks/useAISession';

export function AIChat({ businessId, userId }: { businessId: string; userId: string }) {
  const {
    session,
    messages,
    loading,
    history,
    send,
    loadSessionHistory,
    switchToSession,
    createNewSession,
    connected
  } = useAISession(businessId, userId);

  const [input, setInput] = useState('');

  useEffect(() => {
    loadSessionHistory();
  }, [loadSessionHistory]);

  const handleSend = () => {
    if (input.trim()) {
      send(input);
      setInput('');
    }
  };

  return (
    <div className="ai-chat">
      {/* Sidebar cu istoric */}
      <div className="sidebar">
        <button onClick={createNewSession}>
          + New Conversation
        </button>
        
        <div className="history">
          <h3>History</h3>
          {history.map(s => (
            <div
              key={s.sessionId}
              className={s.sessionId === session?.sessionId ? 'active' : ''}
              onClick={() => switchToSession(s.sessionId)}
            >
              <span>{new Date(s.createdAt).toLocaleDateString()}</span>
              <span>{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="chat-main">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.messageId} className={`message ${msg.type}`}>
                  <div className="content">{msg.content}</div>
                  <div className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="input-area">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                disabled={!connected}
              />
              <button onClick={handleSend} disabled={!connected}>
                Send
              </button>
              {!connected && <span className="status">Disconnected</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Opens App                                           │
│    └─> GET /api/sessions/business/X/user/Y/active          │
│        ├─> Session exists? Use it                          │
│        └─> Session doesn't exist? Placeholder (will create)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Load Messages (if session exists)                        │
│    └─> GET /api/sessions/:sessionId/messages               │
│        └─> Display messages in UI                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User Sends Message                                        │
│    └─> WebSocket: send message with sessionId              │
│        ├─> If sessionId empty → creates new session        │
│        └─> If sessionId exists → adds to existing          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Receive AI Response via WebSocket                        │
│    └─> Update UI with new message                          │
│    └─> Message auto-saved in DynamoDB                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. User Clicks "New Conversation"                           │
│    └─> Clear messages                                       │
│    └─> Set sessionId = undefined                           │
│    └─> Next message creates new session                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User Clicks on Old Conversation                          │
│    └─> GET /api/sessions/:sessionId/messages               │
│    └─> Display old messages                                │
│    └─> Can continue conversation (send new messages)       │
└─────────────────────────────────────────────────────────────┘
```

## Important Notes

### 1. Session Creation
- Sesiunile **NU** trebuie create manual prin API
- Sesiunea se creează **automat** când trimiți primul mesaj prin WebSocket
- Dacă trimiți `sessionId: undefined`, server-ul creează automat o sesiune nouă

### 2. Message Storage
- Toate mesajele (user + agent) sunt salvate **automat** în DynamoDB
- Nu trebuie să salvezi manual mesajele prin API
- WebSocket Gateway se ocupă de salvare

### 3. Session Grouping (per [[memory:8143183]])
- Sesiunile sunt grupate per `tenant_id` (businessId) și `user_id` per zi
- Utilizatorii văd conversația întregii zile fără să gestioneze conversații individuale
- Pentru a implementa acest feature, poți grupa sesiunile în frontend după dată

### 4. Connection Status
- Verifică `connected` status înainte de a trimite mesaje
- Afișează indicator vizual pentru connection status
- Retry connection automat când se pierde conexiunea

## Testing Endpoints

### Test Session Creation
```bash
curl http://localhost:3003/api/sessions/test/create-session/dental_clinic_1/operator_1
```

### Test Get Active Session
```bash
curl http://localhost:3003/api/sessions/test/get-active-session/dental_clinic_1/operator_1
```

### Test Get Session History
```bash
curl http://localhost:3003/api/sessions/business/dental_clinic_1/user/operator_1/history?limit=10
```

### Test Get Messages
```bash
curl http://localhost:3003/api/sessions/YOUR_SESSION_ID/messages?limit=50
```

## Best Practices

1. **Cache Active Session** - păstrează `sessionId` în state pentru a evita request-uri repetate
2. **Optimistic Updates** - adaugă mesajul user-ului imediat în UI (înainte de răspunsul server-ului)
3. **Error Handling** - gestionează cazurile când WebSocket se deconectează
4. **Loading States** - arată loading indicators când încărci sesiuni sau mesaje
5. **Session Persistence** - salvează `sessionId` în localStorage pentru a continua conversația după refresh

## Troubleshooting

### Session not found
- Normal dacă e prima conversație
- Session-ul va fi creat automat la primul mesaj

### Messages not loading
- Verifică că `sessionId` este valid
- Verifică conexiunea la DynamoDB
- Check logs în ai-agent-server

### WebSocket disconnects
- Implementează reconnection logic
- Afișează status în UI
- Queue messages când e disconnected

---

Pentru întrebări, consultă:
- `/ai-agent-server/src/modules/session/` - Session service implementation
- `/ai-agent-server/src/modules/websocket/` - WebSocket integration
- `BEDROCK_SETUP.md` - Bedrock integration details

