# Frontend Integration Guide

## Overview

This guide explains how to integrate the chat functionality into your React application. The integration involves:
1. WebSocket connection for real-time messages (via Elixir server)
2. HTTP endpoints for message history and session management (via ai-agent-server)
3. Message handling and state management

## WebSocket Integration (Elixir Server)

### 1. Connection Setup

```typescript
import { Socket } from 'phoenix';

// Create a socket connection
const socket = new Socket('ws://localhost:4000/socket/websocket', {
  params: {
    token: 'your-auth-token' // If you have authentication
  }
});

// Connect to the socket
socket.connect();

// Join the channel for your tenant
const channel = socket.channel(`messages:${tenantId}`, {});
channel.join()
  .receive('ok', resp => { console.log('Joined successfully', resp) })
  .receive('error', resp => { console.log('Unable to join', resp) });
```

### 2. Message Handling

```typescript
// Listen for new messages
channel.on('new_message', payload => {
  console.log('Received message:', payload);
  // payload structure:
  // {
  //   message_id: string;
  //   content: string;
  //   context: {
  //     lastAgentMessage: string;
  //     metadata: any;
  //   };
  //   userId: string;
  //   sessionId: string;
  //   timestamp: string;
  // }
});

// Listen for typing indicators
channel.on('typing', payload => {
  console.log('User is typing:', payload);
});
```

## HTTP API Integration (ai-agent-server)

### 1. Session Management

```typescript
// Get all sessions for a user
async function getSessions(tenantId: string, userId: string, limit = 10) {
  const url = new URL('http://localhost:3000/api/conversations/sessions');
  url.searchParams.append('tenantId', tenantId);
  url.searchParams.append('userId', userId);
  url.searchParams.append('limit', limit.toString());
  
  const response = await fetch(url);
  return response.json();
}

// Get a specific session
async function getSession(tenantId: string, sessionId: string) {
  const response = await fetch(`http://localhost:3000/api/conversations/${tenantId}/sessions/${sessionId}`);
  return response.json();
}

// Close a session
async function closeSession(tenantId: string, sessionId: string) {
  const response = await fetch(`http://localhost:3000/api/conversations/${tenantId}/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  return response.json();
}
```

### 2. Message History

```typescript
// Get messages for a specific session
async function getSessionMessages(tenantId: string, sessionId: string, limit = 20, before?: string) {
  const url = new URL(`http://localhost:3000/api/conversations/${tenantId}/sessions/${sessionId}/messages`);
  url.searchParams.append('limit', limit.toString());
  if (before) {
    url.searchParams.append('before', before);
  }
  
  const response = await fetch(url);
  return response.json();
}

// Get all messages for a tenant
async function getMessages(tenantId: string, limit = 20, before?: string) {
  const url = new URL(`http://localhost:3000/api/conversations/${tenantId}/messages`);
  url.searchParams.append('limit', limit.toString());
  if (before) {
    url.searchParams.append('before', before);
  }
  
  const response = await fetch(url);
  return response.json();
}

// Get a specific message
async function getMessage(messageId: string) {
  const response = await fetch(`http://localhost:3000/api/conversations/messages/${messageId}`);
  return response.json();
}
```

## React Component Example

Here's a complete example of a chat component that uses both WebSocket and HTTP endpoints:

```typescript
import React, { useEffect, useState } from 'react';
import { Socket } from 'phoenix';

interface Message {
  message_id: string;
  content: string;
  userId: string;
  sessionId: string;
  timestamp: string;
}

interface Session {
  id: string;
  tenantId: string;
  userId: string;
  isActive: boolean;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatProps {
  tenantId: string;
  userId: string;
}

export const Chat: React.FC<ChatProps> = ({ tenantId, userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channel, setChannel] = useState<any>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = new Socket('ws://localhost:4000/socket/websocket');
    newSocket.connect();

    const newChannel = newSocket.channel(`messages:${tenantId}`);
    newChannel.join()
      .receive('ok', () => console.log('Joined channel'))
      .receive('error', (resp) => console.error('Unable to join', resp));

    // Listen for new messages
    newChannel.on('new_message', (payload) => {
      setMessages(prev => [...prev, payload]);
    });

    setSocket(newSocket);
    setChannel(newChannel);

    // Load sessions and messages
    loadSessions();
    loadMessages();

    return () => {
      newChannel.leave();
      newSocket.disconnect();
    };
  }, [tenantId]);

  // Load sessions
  const loadSessions = async () => {
    try {
      const response = await fetch(`/api/conversations/${tenantId}/sessions?userId=${userId}`);
      const data = await response.json();
      setSessions(data);
      if (data.length > 0) {
        setCurrentSession(data[0]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Load messages
  const loadMessages = async () => {
    if (!currentSession) return;

    try {
      const response = await fetch(
        `/api/conversations/${tenantId}/sessions/${currentSession.id}/messages`
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!currentSession || messages.length === 0) return;

    try {
      const oldestMessage = messages[messages.length - 1];
      const response = await fetch(
        `/api/conversations/${tenantId}/sessions/${currentSession.id}/messages?before=${oldestMessage.timestamp}`
      );
      const data = await response.json();
      setMessages(prev => [...prev, ...data]);
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          userId: userId,
          sessionId: currentSession.id,
          payload: {
            content: inputMessage,
            context: {
              lastAgentMessage: messages[messages.length - 1]?.content || null,
              metadata: {}
            }
          }
        })
      });

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="sessions-sidebar">
        <h3>Conversations</h3>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session ${session.id === currentSession?.id ? 'active' : ''}`}
            onClick={() => setCurrentSession(session)}
          >
            <div className="session-preview">
              {session.messages[session.messages.length - 1]?.content || 'No messages'}
            </div>
            <div className="session-date">
              {new Date(session.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-main">
        <div className="messages">
          {messages.map((message) => (
            <div key={message.message_id} className={`message ${message.userId === userId ? 'sent' : 'received'}`}>
              <div className="content">{message.content}</div>
              <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
          <button className="load-more" onClick={loadMoreMessages}>
            Load More
          </button>
        </div>
        <div className="input-area">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};
```

## State Management

For larger applications, consider using a state management solution like Redux or Zustand. Here's an example using Zustand:

```typescript
import create from 'zustand';

interface ChatState {
  messages: Message[];
  sessions: Session[];
  currentSession: Session | null;
  addMessage: (message: Message) => void;
  setCurrentSession: (session: Session) => void;
  setSessions: (sessions: Session[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessions: [],
  currentSession: null,
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setCurrentSession: (session) => set({ currentSession: session }),
  setSessions: (sessions) => set({ sessions }),
  clearMessages: () => set({ messages: [] })
}));
```

## Best Practices

1. **Error Handling**
   - Implement proper error handling for WebSocket disconnections
   - Add reconnection logic
   - Handle API errors gracefully

2. **Message Queue**
   - Implement a message queue for offline support
   - Store messages locally when offline
   - Sync messages when connection is restored

3. **Performance**
   - Implement message pagination
   - Use virtualization for long message lists
   - Optimize re-renders

4. **Security**
   - Implement proper authentication
   - Validate all incoming messages
   - Sanitize user input

5. **UX Considerations**
   - Add typing indicators
   - Show message status (sent, delivered, read)
   - Add loading states
   - Implement message retry logic

## Example CSS

```css
.chat-container {
  display: flex;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

.sessions-sidebar {
  width: 300px;
  border-right: 1px solid #dee2e6;
  padding: 20px;
  overflow-y: auto;
}

.session {
  padding: 10px;
  border-bottom: 1px solid #dee2e6;
  cursor: pointer;
}

.session.active {
  background-color: #e9ecef;
}

.session-preview {
  font-size: 0.9em;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 0.8em;
  color: #999;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 10px;
  max-width: 70%;
}

.message.sent {
  margin-left: auto;
  background-color: #007bff;
  color: white;
  border-radius: 15px 15px 0 15px;
}

.message.received {
  margin-right: auto;
  background-color: #e9ecef;
  border-radius: 15px 15px 15px 0;
}

.message .content {
  padding: 10px 15px;
}

.message .timestamp {
  font-size: 0.8em;
  opacity: 0.7;
  margin-top: 5px;
}

.load-more {
  display: block;
  margin: 20px auto;
  padding: 8px 16px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.load-more:hover {
  background-color: #e9ecef;
}

.input-area {
  display: flex;
  padding: 20px;
  border-top: 1px solid #dee2e6;
}

.input-area input {
  flex: 1;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-right: 10px;
}

.input-area button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.input-area button:hover {
  background-color: #0056b3;
}
``` 