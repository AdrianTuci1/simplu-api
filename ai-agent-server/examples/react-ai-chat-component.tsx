/**
 * Complete AI Chat Component Example
 * 
 * This is a full implementation example showing how to integrate
 * with the AI Agent Server sessions and WebSocket.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Session {
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

interface Message {
  messageId: string;
  sessionId: string;
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: string;
  metadata?: {
    source?: string;
    responseId?: string;
    actions?: any[];
  };
}

interface WebSocketMessage {
  event: string;
  topic: string;
  payload: any;
  ref?: string;
}

// ============================================================================
// API Service
// ============================================================================

const AI_AGENT_BASE_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:3003';

class SessionAPI {
  static async getActiveSession(businessId: string, userId: string): Promise<Session | null> {
    try {
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/business/${businessId}/user/${userId}/active`
      );
      
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch active session');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching active session:', error);
      return null;
    }
  }

  static async getSessionHistory(
    businessId: string,
    userId: string,
    limit: number = 20
  ): Promise<Session[]> {
    try {
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/business/${businessId}/user/${userId}/history?limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch session history');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }

  static async getSessionMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await fetch(
        `${AI_AGENT_BASE_URL}/api/sessions/${sessionId}/messages?limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch session messages');
      
      const messages = await response.json();
      
      // Sort by timestamp ascending (oldest first)
      return messages.sort((a: Message, b: Message) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  }
}

// ============================================================================
// WebSocket Hook
// ============================================================================

function useAIWebSocket(businessId: string, userId: string, onMessage: (message: any) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageRefCounter = useRef(0);

  const connect = useCallback(() => {
    const wsUrl = process.env.REACT_APP_AI_AGENT_WS_URL || 'ws://localhost:3003/socket/websocket';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);

      // Join the channel
      const joinMessage: WebSocketMessage = {
        event: 'phx_join',
        topic: `messages:${businessId}`,
        payload: { businessId, userId },
        ref: String(messageRefCounter.current++)
      };
      ws.send(JSON.stringify(joinMessage));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);

        if (data.event === 'new_message' || data.event === 'message_processed') {
          onMessage(data.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Reconnecting...');
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [businessId, userId, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    const wsMessage: WebSocketMessage = {
      event: 'new_message',
      topic: `messages:${businessId}`,
      payload: message,
      ref: String(messageRefCounter.current++)
    };

    wsRef.current.send(JSON.stringify(wsMessage));
    return true;
  }, [businessId]);

  return { connected, sendMessage };
}

// ============================================================================
// Main AI Chat Component
// ============================================================================

interface AIChatProps {
  businessId: string;
  userId: string;
  locationId?: string;
}

export function AIChat({ businessId, userId, locationId = 'default' }: AIChatProps) {
  // State
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  const handleWebSocketMessage = useCallback((payload: any) => {
    console.log('Received message from WebSocket:', payload);

    // Add agent response to messages
    if (payload.message) {
      const agentMessage: Message = {
        messageId: payload.responseId || `msg_${Date.now()}`,
        sessionId: payload.sessionId,
        businessId: payload.businessId || businessId,
        userId: 'agent',
        content: payload.message,
        type: 'agent',
        timestamp: payload.timestamp || new Date().toISOString(),
        metadata: {
          source: 'websocket',
          responseId: payload.responseId,
          actions: payload.actions || []
        }
      };

      setMessages(prev => [...prev, agentMessage]);

      // Update session with new sessionId if it was created
      if (payload.sessionId && (!currentSession || !currentSession.sessionId)) {
        loadActiveSession();
      }
    }
  }, [businessId, currentSession]);

  const { connected, sendMessage } = useAIWebSocket(businessId, userId, handleWebSocketMessage);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
    loadSessionHistory();
  }, [businessId, userId]);

  // Load active session
  const loadActiveSession = async () => {
    try {
      setLoading(true);
      
      const session = await SessionAPI.getActiveSession(businessId, userId);
      
      if (session) {
        console.log('✅ Loaded active session:', session.sessionId);
        setCurrentSession(session);
        
        // Load messages for this session
        const sessionMessages = await SessionAPI.getSessionMessages(session.sessionId);
        setMessages(sessionMessages);
      } else {
        console.log('📝 No active session found');
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load session history
  const loadSessionHistory = async () => {
    try {
      const history = await SessionAPI.getSessionHistory(businessId, userId, 20);
      setSessionHistory(history);
    } catch (error) {
      console.error('Error loading session history:', error);
    }
  };

  // Switch to a different session
  const switchToSession = async (session: Session) => {
    try {
      setLoading(true);
      setCurrentSession(session);
      
      const sessionMessages = await SessionAPI.getSessionMessages(session.sessionId);
      setMessages(sessionMessages);
      setShowHistory(false);
    } catch (error) {
      console.error('Error switching session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new session
  const createNewSession = () => {
    setCurrentSession(null);
    setMessages([]);
    setShowHistory(false);
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !connected) return;

    const messageData = {
      businessId,
      locationId,
      userId,
      message: inputValue.trim(),
      sessionId: currentSession?.sessionId || undefined,
      timestamp: new Date().toISOString()
    };

    const success = sendMessage(messageData);

    if (success) {
      // Optimistically add user message to UI
      const userMessage: Message = {
        messageId: `temp_${Date.now()}`,
        sessionId: currentSession?.sessionId || '',
        businessId,
        userId,
        content: inputValue.trim(),
        type: 'user',
        timestamp: new Date().toISOString(),
        metadata: { source: 'websocket' }
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="ai-chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>AI Assistant</h2>
        <div className="header-actions">
          <button onClick={() => setShowHistory(!showHistory)}>
            📋 History
          </button>
          <button onClick={createNewSession}>
            ➕ New Chat
          </button>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="history-sidebar">
          <h3>Conversation History</h3>
          <div className="history-list">
            {sessionHistory.map(session => (
              <div
                key={session.sessionId}
                className={`history-item ${session.sessionId === currentSession?.sessionId ? 'active' : ''}`}
                onClick={() => switchToSession(session)}
              >
                <div className="history-date">
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
                <div className="history-time">
                  {new Date(session.createdAt).toLocaleTimeString()}
                </div>
                <div className={`history-status ${session.status}`}>
                  {session.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-area">
        {loading ? (
          <div className="loading">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <h3>👋 Bună ziua!</h3>
            <p>Cum vă pot ajuta astăzi?</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={msg.messageId || index} className={`message message-${msg.type}`}>
                <div className="message-content">
                  {msg.content}
                </div>
                <div className="message-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                {msg.metadata?.actions && msg.metadata.actions.length > 0 && (
                  <div className="message-actions">
                    {msg.metadata.actions.map((action: any, idx: number) => (
                      <button key={idx} className="action-button">
                        {action.title || action.type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={connected ? "Type your message..." : "Connecting..."}
          disabled={!connected}
          className="message-input"
        />
        <button
          onClick={handleSendMessage}
          disabled={!connected || !inputValue.trim()}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Styles (optional - use your own styling system)
// ============================================================================

export const aiChatStyles = `
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.connection-status {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.connection-status.connected {
  background: #e8f5e9;
  color: #2e7d32;
}

.connection-status.disconnected {
  background: #ffebee;
  color: #c62828;
}

.history-sidebar {
  position: absolute;
  right: 0;
  top: 60px;
  width: 300px;
  height: calc(100% - 60px);
  background: white;
  border-left: 1px solid #e0e0e0;
  padding: 1rem;
  overflow-y: auto;
  z-index: 10;
}

.history-item {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f5f5f5;
}

.history-item.active {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #757575;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 70%;
  padding: 1rem;
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

.message-user {
  align-self: flex-end;
  background: #2196f3;
  color: white;
  margin-left: auto;
}

.message-agent {
  align-self: flex-start;
  background: white;
  border: 1px solid #e0e0e0;
}

.message-timestamp {
  font-size: 0.75rem;
  color: #757575;
  margin-top: 0.5rem;
}

.message-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border: 1px solid #2196f3;
  background: white;
  color: #2196f3;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.action-button:hover {
  background: #e3f2fd;
}

.input-area {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
}

.message-input:focus {
  outline: none;
  border-color: #2196f3;
}

.send-button {
  padding: 0.75rem 2rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #1976d2;
}

.send-button:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

