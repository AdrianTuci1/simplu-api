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
    const connectionKey = `${topic}:${payload.businessId || 'unknown'}`;
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

      // Salvare mesaj în baza de date
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      await this.sessionService.saveMessage({
        messageId,
        sessionId,
        businessId: data.businessId,
        userId: data.userId,
        content: data.message,
        type: 'user',
        timestamp,
        metadata: {
          source: 'websocket'
        }
      });

      // Procesare mesaj prin noul AgentService cu RAG
      const response = await this.agentService.processMessage({
        ...data,
        sessionId
      });

      // Salvare răspuns în baza de date
      await this.sessionService.saveMessage({
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: response.sessionId,
        businessId: data.businessId,
        userId: 'agent',
        content: response.message,
        type: 'agent',
        timestamp: response.timestamp,
        metadata: {
          source: 'websocket',
          responseId: response.responseId
        }
      });

      // Trimitere răspuns către client în format Phoenix
      client.send(JSON.stringify({
        event: 'new_message',
        topic: `messages:${data.businessId}`,
        payload: response
      }));

      // Broadcast către toți coordonatorii business-ului
      this.broadcastToBusiness(data.businessId, 'message_processed', {
        userId: data.userId,
        message: data.message,
        responseId: response.responseId,
        timestamp: response.timestamp
      });

      // Notifică Elixir despre conversația AI pentru sincronizare
      await this.forwardToElixir(data, response);

    } catch (error) {
      console.error('Error processing message:', error);
      client.send(JSON.stringify({
        event: 'error',
        topic: `messages:${data.businessId}`,
        payload: {
          message: 'Eroare la procesarea mesajului',
          error: error.message
        }
      }));
    }
  }

  // Metode pentru broadcasting
  broadcastToBusiness(businessId: string, event: string, data: any) {
    const message = JSON.stringify({
      event: event,
      topic: `messages:${businessId}`,
      payload: data
    });

    // Găsirea tuturor conexiunilor pentru business-ul respectiv
    for (const [key, socket] of this.connections.entries()) {
      if (key.includes(`messages:${businessId}`)) {
        socket.send(message);
      }
    }
  }

  broadcastToUser(userId: string, event: string, data: any) {
    const message = JSON.stringify({
      event: event,
      topic: `user:${userId}`,
      payload: data
    });

    // Găsirea tuturor conexiunilor pentru utilizatorul respectiv
    for (const [key, socket] of this.connections.entries()) {
      if (key.includes(`user:${userId}`)) {
        socket.send(message);
      }
    }
  }

  // Method pentru call_frontend_function tool
  sendMessageToSession(businessId: string, sessionId: string, messageData: any, locationId?: string) {
    console.log(`Sending message to session: ${sessionId} in business: ${businessId}`);
    
    this.broadcastToBusiness(businessId, messageData.event, messageData.data);
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
        
        // Fallback: încercăm să trimitem prin WebSocket broadcast
        // Elixir va intercepta acest mesaj și îl va trimite către clientul WebSocket
        this.broadcastToBusiness(data.businessId, 'new_message', {
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

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(data: MessageDto): string {
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }
}