# Frontend Session Integration Guide

## Overview

This guide explains how to integrate the Session Service with your frontend chat interface. The Session Service provides APIs for managing chat sessions, loading conversation history, and creating new sessions.

## Base URL

```
https://your-api-domain.com/api/sessions
```

## API Endpoints

### 1. Get Active Session for User
**Endpoint:** `GET /business/{businessId}/user/{userId}/active`

**Description:** Gets the currently active session for a specific user in a business.

**Parameters:**
- `businessId` (string): The business identifier
- `userId` (string): The user identifier

**Response:**
```typescript
interface Session {
  sessionId: string;
  businessId: string;
  locationId: string;
  userId: string;
  status: 'active' | 'closed' | 'resolved' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata: {
    businessType: string;
    context: any;
  };
}
```

**Example:**
```javascript
const response = await fetch('/api/sessions/business/B0100001/user/33948842-b061-7036-f02f-79b9c0b4225b/active');
const activeSession = await response.json();
```

### 2. Get Session History for User
**Endpoint:** `GET /business/{businessId}/user/{userId}/history?limit={limit}`

**Description:** Gets the session history for a specific user, ordered by most recent first.

**Parameters:**
- `businessId` (string): The business identifier
- `userId` (string): The user identifier
- `limit` (optional, number): Maximum number of sessions to return (default: 20)

**Response:**
```typescript
Session[] // Array of Session objects
```

**Example:**
```javascript
const response = await fetch('/api/sessions/business/B0100001/user/33948842-b061-7036-f02f-79b9c0b4225b/history?limit=10');
const sessionHistory = await response.json();
```

### 3. Get Session Messages
**Endpoint:** `GET /{sessionId}/messages?limit={limit}`

**Description:** Gets all messages for a specific session, ordered by timestamp.

**Parameters:**
- `sessionId` (string): The session identifier
- `limit` (optional, number): Maximum number of messages to return (default: 50)

**Response:**
```typescript
interface Message {
  messageId: string;
  sessionId: string;
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: string;
  metadata: {
    source: 'websocket' | 'webhook' | 'cron';
    externalId?: string;
    responseId?: string;
    businessType?: string;
    actions?: any[];
    clientSource?: string;
  };
}
```

**Example:**
```javascript
const response = await fetch('/api/sessions/7f9b5185-c872-48ed-8579-735f86c4fce8/messages?limit=100');
const messages = await response.json();
```

### 4. Get Specific Session
**Endpoint:** `GET /{sessionId}`

**Description:** Gets details of a specific session.

**Example:**
```javascript
const response = await fetch('/api/sessions/7f9b5185-c872-48ed-8579-735f86c4fce8');
const session = await response.json();
```

## Frontend Implementation

### 1. Chat Interface Component Structure

```typescript
interface ChatState {
  currentSession: Session | null;
  messages: Message[];
  sessionHistory: Session[];
  isLoading: boolean;
  error: string | null;
}

interface ChatProps {
  businessId: string;
  userId: string;
  onNewSession?: (session: Session) => void;
  onSessionChange?: (session: Session) => void;
}
```

### 2. Session Management Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

export const useSessionManager = (businessId: string, userId: string) => {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
    loadSessionHistory();
  }, [businessId, userId]);

  const loadActiveSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/sessions/business/${businessId}/user/${userId}/active`
      );
      
      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        
        if (session) {
          await loadSessionMessages(session.sessionId);
        }
      }
    } catch (err) {
      setError('Failed to load active session');
      console.error('Error loading active session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionHistory = async (limit: number = 20) => {
    try {
      const response = await fetch(
        `/api/sessions/business/${businessId}/user/${userId}/history?limit=${limit}`
      );
      
      if (response.ok) {
        const history = await response.json();
        setSessionHistory(history);
      }
    } catch (err) {
      console.error('Error loading session history:', err);
    }
  };

  const loadSessionMessages = async (sessionId: string, limit: number = 50) => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/messages?limit=${limit}`
      );
      
      if (response.ok) {
        const messages = await response.json();
        setMessages(messages);
      }
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    }
  };

  const startNewSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create new session by sending a message to the messages API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: businessId,
          user_id: userId,
          session_id: `new_${Date.now()}`, // Generate new session ID
          message_id: `msg_${Date.now()}`,
          payload: {
            content: 'Hello, I would like to start a new conversation.',
            context: {
              businessId,
              locationId: 'L0100001',
              userId,
              timestamp: new Date().toISOString(),
              aiProcessing: true
            }
          },
          timestamp: new Date().toISOString(),
          type: 'agent.response'
        })
      });

      if (response.ok) {
        const result = await response.json();
        // The new session will be created automatically
        await loadActiveSession();
        await loadSessionHistory();
      }
    } catch (err) {
      setError('Failed to start new session');
      console.error('Error starting new session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/sessions/${sessionId}`);
      
      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        await loadSessionMessages(sessionId);
      }
    } catch (err) {
      setError('Failed to switch session');
      console.error('Error switching session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentSession) {
      await startNewSession();
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: businessId,
          user_id: userId,
          session_id: currentSession.sessionId,
          message_id: `msg_${Date.now()}`,
          payload: {
            content,
            context: {
              businessId,
              locationId: currentSession.locationId,
              userId,
              timestamp: new Date().toISOString(),
              aiProcessing: true
            }
          },
          timestamp: new Date().toISOString(),
          type: 'agent.response'
        })
      });

      if (response.ok) {
        // Reload messages to get the updated conversation
        await loadSessionMessages(currentSession.sessionId);
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  return {
    currentSession,
    sessionHistory,
    messages,
    isLoading,
    error,
    loadActiveSession,
    loadSessionHistory,
    loadSessionMessages,
    startNewSession,
    switchToSession,
    sendMessage
  };
};
```

### 3. Chat Interface Component

```typescript
import React, { useState } from 'react';
import { useSessionManager } from './useSessionManager';

interface ChatInterfaceProps {
  businessId: string;
  userId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  businessId, 
  userId 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  
  const {
    currentSession,
    sessionHistory,
    messages,
    isLoading,
    error,
    startNewSession,
    switchToSession,
    sendMessage
  } = useSessionManager(businessId, userId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  const handleStartNewSession = async () => {
    await startNewSession();
    setShowSessionHistory(false);
  };

  const handleSessionSelect = async (sessionId: string) => {
    await switchToSession(sessionId);
    setShowSessionHistory(false);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <h3>Chat Assistant</h3>
        <div className="header-actions">
          <button 
            onClick={() => setShowSessionHistory(!showSessionHistory)}
            className="btn-secondary"
          >
            {showSessionHistory ? 'Hide' : 'Show'} History
          </button>
          <button 
            onClick={handleStartNewSession}
            className="btn-primary"
            disabled={isLoading}
          >
            New Session
          </button>
        </div>
      </div>

      {/* Session History Sidebar */}
      {showSessionHistory && (
        <div className="session-history">
          <h4>Session History</h4>
          <div className="session-list">
            {sessionHistory.map((session) => (
              <div 
                key={session.sessionId}
                className={`session-item ${
                  currentSession?.sessionId === session.sessionId ? 'active' : ''
                }`}
                onClick={() => handleSessionSelect(session.sessionId)}
              >
                <div className="session-info">
                  <div className="session-id">
                    {session.sessionId.substring(0, 8)}...
                  </div>
                  <div className="session-date">
                    {formatDate(session.lastMessageAt)}
                  </div>
                  <div className="session-status">
                    Status: {session.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Loading...
          </div>
        )}

        <div className="messages-list">
          {messages.map((message) => (
            <div 
              key={message.messageId}
              className={`message ${message.type}`}
            >
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-meta">
                <span className="message-type">
                  {message.type === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="message-time">
                  {formatDate(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={isLoading || !newMessage.trim()}
            className="send-button"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
```

### 4. CSS Styles

```css
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.session-history {
  position: absolute;
  left: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #ddd;
  padding: 1rem;
  overflow-y: auto;
  z-index: 10;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-item {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.session-item:hover {
  background: #e9ecef;
}

.session-item.active {
  background: #007bff;
  color: white;
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.messages-list {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
}

.message.agent {
  align-self: flex-start;
}

.message-content {
  padding: 0.75rem;
  border-radius: 8px;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #007bff;
  color: white;
}

.message.agent .message-content {
  background: #f8f9fa;
  border: 1px solid #ddd;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.message-input-form {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #ddd;
  background: white;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  outline: none;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.send-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  margin: 1rem;
  border-radius: 4px;
}

.loading {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}
```

## Usage Examples

### 1. Basic Chat Interface

```typescript
import React from 'react';
import { ChatInterface } from './ChatInterface';

const App: React.FC = () => {
  return (
    <div className="app">
      <ChatInterface 
        businessId="B0100001"
        userId="33948842-b061-7036-f02f-79b9c0b4225b"
      />
    </div>
  );
};

export default App;
```

### 2. Custom Session Management

```typescript
import { useSessionManager } from './useSessionManager';

const CustomChatComponent = () => {
  const {
    currentSession,
    sessionHistory,
    messages,
    startNewSession,
    switchToSession
  } = useSessionManager('B0100001', 'user123');

  return (
    <div>
      <h2>Current Session: {currentSession?.sessionId}</h2>
      
      <div>
        <h3>Session History</h3>
        {sessionHistory.map(session => (
          <div key={session.sessionId}>
            <button onClick={() => switchToSession(session.sessionId)}>
              {session.sessionId} - {session.status}
            </button>
          </div>
        ))}
      </div>
      
      <button onClick={startNewSession}>
        Start New Session
      </button>
    </div>
  );
};
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `404`: Session not found
- `500`: Internal server error

Always handle errors gracefully in your frontend:

```typescript
const handleApiCall = async () => {
  try {
    const response = await fetch('/api/sessions/...');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    // Handle error in UI
    setError('Failed to load data');
  }
};
```

## Best Practices

1. **Session Management**: Always check for an active session before starting a new one
2. **Message Loading**: Load messages in batches to avoid performance issues
3. **Error Handling**: Implement proper error boundaries and user feedback
4. **Real-time Updates**: Consider implementing WebSocket connections for real-time message updates
5. **Caching**: Cache session history and messages to improve performance
6. **Loading States**: Show loading indicators during API calls
7. **Responsive Design**: Ensure the chat interface works on mobile devices

## Testing

Use the test endpoints for development:

```javascript
// Create a test session
const testSession = await fetch('/api/sessions/test/create-session/B0100001/user123');

// Get active session
const activeSession = await fetch('/api/sessions/test/get-active-session/B0100001/user123');
```

This guide provides a complete foundation for integrating the Session Service with your frontend chat interface.
