# Sesiuni de Conversație - Frontend Guide

## Descriere
Acest document descrie cum să interacționați cu API-ul de sesiuni de conversație din frontend. Sesiunile reprezintă conversații între utilizatori și agentul AI, fiecare sesiune conținând un istoric de mesaje.

## API Endpoints

### 1. Obținere Sesiuni Recente
```typescript
GET /conversations/:tenantId/users/:userId
```

**Parametri URL:**
- `tenantId`: ID-ul tenantului
- `userId`: ID-ul utilizatorului

**Query Parameters:**
- `limit`: Numărul de sesiuni de returnat (default: 10)
- `before`: ID-ul unei sesiuni pentru paginare

**Response:**
```typescript
interface Session {
  id: string;
  tenantId: string;
  userId: string;
  isActive: boolean;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];  // Ultimele mesaje din sesiune
}

interface Message {
  id: string;
  messageId: string;
  content: string;
  sessionId: string;
  createdAt: Date;
}
```

**Exemplu de utilizare:**
```typescript
// Obține ultimele 10 sesiuni
const response = await fetch('/conversations/tenant123/users/user456?limit=10');
const sessions = await response.json();

// Paginare - obține următoarele 10 sesiuni după ultima sesiune
const lastSessionId = sessions[sessions.length - 1].id;
const nextPage = await fetch(`/conversations/tenant123/users/user456?limit=10&before=${lastSessionId}`);
const nextSessions = await nextPage.json();
```

### 2. Obținere Mesaje dintr-o Sesiune
```typescript
GET /conversations/:tenantId/sessions/:sessionId/messages
```

**Parametri URL:**
- `tenantId`: ID-ul tenantului
- `sessionId`: ID-ul sesiunii

**Query Parameters:**
- `limit`: Numărul de mesaje de returnat (default: 20)
- `before`: ID-ul unui mesaj pentru paginare

**Response:**
```typescript
interface Message {
  id: string;
  messageId: string;
  content: string;
  sessionId: string;
  createdAt: Date;
}
```

**Exemplu de utilizare:**
```typescript
// Obține ultimele 20 de mesaje din sesiune
const response = await fetch('/conversations/tenant123/sessions/session789/messages?limit=20');
const messages = await response.json();

// Paginare - obține următoarele 20 de mesaje după ultimul mesaj
const lastMessageId = messages[messages.length - 1].id;
const nextPage = await fetch(`/conversations/tenant123/sessions/session789/messages?limit=20&before=${lastMessageId}`);
const nextMessages = await nextPage.json();
```

## Best Practices pentru Frontend

### 1. Gestionare Sesiuni
- Afișați sesiunile în ordine cronologică inversă (cele mai recente primele)
- Implementați paginare infinită pentru sesiuni
- Afișați un indicator de stare pentru sesiunile active
- Păstrați ultima sesiune activă în localStorage pentru a o putea relua

### 2. Gestionare Mesaje
- Implementați paginare infinită pentru mesaje
- Afișați mesajele în ordine cronologică
- Diferențiați vizual mesajele utilizatorului de cele ale agentului
- Afișați timestamp-ul pentru fiecare mesaj
- Implementați un indicator de typing pentru răspunsurile agentului

### 3. Optimizări
- Implementați caching pentru sesiuni și mesaje
- Folosiți WebSocket pentru mesaje noi în timp real
- Implementați retry logic pentru request-uri eșuate
- Adăugați loading states pentru o experiență mai bună

### 4. Securitate
- Validați toate datele primite de la server
- Sanitizați conținutul mesajelor înainte de afișare
- Implementați rate limiting pe client
- Gestionați corect erorile și afișați mesaje relevante utilizatorului

## Exemple de Implementare

### Componentă React pentru Lista de Sesiuni
```typescript
import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  isActive: boolean;
  updatedAt: Date;
  messages: Message[];
}

const SessionsList: React.FC<{ tenantId: string; userId: string }> = ({ tenantId, userId }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadSessions = async (before?: string) => {
    setLoading(true);
    try {
      const url = `/conversations/${tenantId}/users/${userId}?limit=10${before ? `&before=${before}` : ''}`;
      const response = await fetch(url);
      const newSessions = await response.json();
      
      setSessions(prev => before ? [...prev, ...newSessions] : newSessions);
      setHasMore(newSessions.length === 10);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [tenantId, userId]);

  return (
    <div>
      {sessions.map(session => (
        <div key={session.id} className={`session ${session.isActive ? 'active' : ''}`}>
          <h3>Session {session.id}</h3>
          <p>Last updated: {new Date(session.updatedAt).toLocaleString()}</p>
          <p>Status: {session.isActive ? 'Active' : 'Closed'}</p>
        </div>
      ))}
      {hasMore && (
        <button 
          onClick={() => loadSessions(sessions[sessions.length - 1]?.id)}
          disabled={loading}
        >
          Load More
        </button>
      )}
    </div>
  );
};
```

### Componentă React pentru Mesaje
```typescript
import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  createdAt: Date;
}

const MessagesList: React.FC<{ tenantId: string; sessionId: string }> = ({ tenantId, sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMessages = async (before?: string) => {
    setLoading(true);
    try {
      const url = `/conversations/${tenantId}/sessions/${sessionId}/messages?limit=20${before ? `&before=${before}` : ''}`;
      const response = await fetch(url);
      const newMessages = await response.json();
      
      setMessages(prev => before ? [...prev, ...newMessages] : newMessages);
      setHasMore(newMessages.length === 20);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [tenantId, sessionId]);

  return (
    <div className="messages-container">
      {hasMore && (
        <button 
          onClick={() => loadMessages(messages[0]?.id)}
          disabled={loading}
        >
          Load Previous Messages
        </button>
      )}
      {messages.map(message => (
        <div key={message.id} className="message">
          <p>{message.content}</p>
          <small>{new Date(message.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}; 