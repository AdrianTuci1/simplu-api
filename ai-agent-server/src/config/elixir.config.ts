export const elixirConfig = {
  // WebSocket URL pentru Elixir (chat live cu coordonatori)
  websocketUrl: process.env.ELIXIR_WEBSOCKET_URL || 'ws://localhost:4000/socket/websocket',
  
  // HTTP URL pentru notificări și sincronizare (opțional)
  httpUrl: process.env.ELIXIR_HTTP_URL || 'http://localhost:4000',
  
  timeout: parseInt(process.env.ELIXIR_TIMEOUT) || 5000,
  retryAttempts: parseInt(process.env.ELIXIR_RETRY_ATTEMPTS) || 3,
  
  // Endpoint-uri pentru sincronizare cu AI Agent Server
  endpoints: {
    aiConversation: '/api/ai-conversation',
    aiContext: '/api/ai-context',
    conversationStatus: '/api/conversation-status',
    health: '/health'
  }
}; 