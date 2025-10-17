import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'ws';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { SessionService } from '../session/session.service';
import { ElixirHttpService } from './elixir-http.service';
import { AgentService } from '../agent/agent.service';
import { ToolsService } from '../tools/tools.service';

@NestWebSocketGateway({
  cors: true,
  path: '/socket/websocket',
  transports: ['websocket']
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Map pentru a ține evidența conexiunilor per user/business
  private connections = new Map<string, Socket>();

  constructor(
    private readonly sessionService: SessionService,
    private readonly elixirHttpService: ElixirHttpService,
    private readonly agentService: AgentService,
    private readonly toolsService: ToolsService,
  ) { }

  afterInit(server: Server) {
    // Set WebSocket Gateway in tools service for WebSocket tools
    this.toolsService.setWebSocketGateway(this);
    console.log('✅ WebSocket Gateway initialized and set in ToolsService');
  }

  async handleConnection(client: Socket) {
    console.log('Client connected');
  }

  async handleDisconnect(client: Socket) {
    // Găsire și ștergere conexiune
    for (const [key, socket] of this.connections.entries()) {
      if (socket === client) {
        this.connections.delete(key);
        console.log(`Client disconnected: ${key}`);
        break;
      }
    }
  }

  @SubscribeMessage('phx_join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { topic: string; payload: any; ref: string }
  ) {
    const { topic, payload, ref } = data;
    // Folosim topic-ul ca atare, ex: "user:{userId}"
    const connectionKey = `${topic}`;
    this.connections.set(connectionKey, client);

    console.log(`Client joined topic: ${topic}`);

    // Răspuns Phoenix pentru join
    client.send(JSON.stringify({
      event: 'phx_reply',
      topic: topic,
      payload: { status: 'ok' },
      ref: ref
    }));
  }

  @SubscribeMessage('phx_leave')
  async handleLeave(@ConnectedSocket() client: Socket) {
    // Găsire și ștergere conexiune
    for (const [key, socket] of this.connections.entries()) {
      if (socket === client) {
        this.connections.delete(key);
        console.log(`Client left: ${key}`);
        break;
      }
    }
  }



  @SubscribeMessage('new_message')
  async handleMessage(
    @MessageBody() data: MessageDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      console.log(`Received message from ${data.userId} in business ${data.businessId}: ${data.message}`);

      // Ensure session exists or create new one
      let sessionId = data.sessionId;
      console.log(`🔧 WebSocketGateway: Processing message for sessionId: ${sessionId}`);
      
      if (!sessionId) {
        console.log(`🔧 WebSocketGateway: No sessionId provided, creating new session`);
        // Create new session
        const newSession = await this.sessionService.createSession(
          data.businessId,
          data.locationId || 'default',
          data.userId,
          'general' // Will be updated with actual business type later
        );
        sessionId = newSession.sessionId;
        console.log(`✅ WebSocketGateway: Created new session: ${sessionId}`);
      } else {
        console.log(`🔧 WebSocketGateway: Using provided sessionId: ${sessionId}`);
        // Verify that the provided session exists in database
        const existingSession = await this.sessionService.getSession(sessionId);
        if (!existingSession) {
          console.log(`⚠️ WebSocketGateway: Provided sessionId ${sessionId} does not exist in database, creating new session`);
          const newSession = await this.sessionService.createSession(
            data.businessId,
            data.locationId || 'default',
            data.userId,
            'general'
          );
          sessionId = newSession.sessionId;
          console.log(`✅ WebSocketGateway: Created new session: ${sessionId}`);
        } else {
          console.log(`✅ WebSocketGateway: Session ${sessionId} exists in database`);
        }
      }

      // Salvare mesaj în baza de date - fără a genera local messageId
      const timestamp = new Date().toISOString();

      await this.sessionService.saveMessage({
        sessionId,
        businessId: data.businessId,
        userId: data.userId,
        content: data.message,
        type: 'user',
        timestamp,
        metadata: {
          source: 'websocket'
        },
        view: data.view || {}
      });

      // Procesare mesaj prin noul AgentService cu RAG
      const response = await this.agentService.processMessage({
        ...data,
        sessionId
      });

      // Salvare răspuns în baza de date - fără a genera local messageId
      await this.sessionService.saveMessage({
        sessionId: response.sessionId,
        businessId: data.businessId,
        userId: 'agent',
        content: response.message,
        type: 'agent',
        timestamp: response.timestamp,
        metadata: {
          source: 'websocket',
          responseId: response.responseId
        },
        view: data.view || {}
      });

      // Nu mai trimitem direct către client; Elixir va face broadcast către frontend

      // Eliminat broadcast-ul la nivel de business

      // Notifică Elixir despre conversația AI pentru sincronizare (Elixir va broadcasta către frontend)
      await this.forwardToElixir(data, response);

    } catch (error) {
      console.error('Error processing message:', error);
      this.broadcastToUser(data.userId, 'error', {
        message: 'Eroare la procesarea mesajului',
        error: error.message
      });
    }
  }

  // Metode pentru broadcasting

  broadcastToUser(userId: string, event: string, data: any) {
    const message = JSON.stringify({
      event: event,
      topic: `messages:${userId}`,
      payload: data
    });

    // Găsirea tuturor conexiunilor pentru utilizatorul respectiv
    for (const [key, socket] of this.connections.entries()) {
      if (key.includes(`messages:${userId}`)) {
        socket.send(message);
      }
    }
  }

  // Method pentru call_frontend_function tool
  sendMessageToSession(businessId: string, sessionId: string, messageData: any, locationId?: string) {
    console.log(`Sending message to session: ${sessionId} in business: ${businessId}`);
    
    // Mesajele sunt trimise pe canalul utilizatorului
    if (messageData?.data?.userId) {
      this.broadcastToUser(messageData.data.userId, messageData.event, messageData.data);
    }
  }

  // Notifică Elixir despre conversația AI pentru sincronizare
  private async forwardToElixir(data: MessageDto, response: AgentResponse): Promise<void> {
    try {
      console.log('AI conversation processed:', {
        businessId: data.businessId,
        userId: data.userId,
        message: data.message,
        response: response.message
      });

      // Trimitere răspuns AI către Elixir prin HTTP
      // Elixir va primi acest răspuns prin endpoint-ul /api/ai-responses
      const elixirPayload = {
        tenant_id: data.businessId,
        user_id: data.userId,
        session_id: response.sessionId,
        message_id: response.responseId,
        content: response.message,
        context: {
          actions: response.actions || [],
          timestamp: response.timestamp,
          source: 'ai_agent_server'
        },
        timestamp: response.timestamp,
        type: 'agent.response'
      };

      try {
        // Trimitere către Elixir prin HTTP
        await this.elixirHttpService.sendAIResponse(
          data.businessId,
          data.userId,
          response.sessionId,
          response.responseId,
          response.message,
          { actions: response.actions || [] },
          response.draft // Include draft if available
        );
        
        console.log('AI response sent to Elixir via HTTP:', elixirPayload);
      } catch (httpError) {
        console.error('Failed to send AI response to Elixir via HTTP:', httpError);
        
        // Fallback: trimitem prin WebSocket pe canalul utilizatorului
        this.broadcastToUser(data.userId, 'new_message', {
          responseId: response.responseId,
          message: response.message,
          timestamp: response.timestamp,
          sessionId: response.sessionId,
          actions: response.actions || [],
          businessId: data.businessId,
          userId: data.userId
        });
        
        console.log('AI response sent to Elixir via WebSocket fallback');
      }

    } catch (error) {
      console.error('Error forwarding AI conversation to Elixir:', error);
    }
  }

}