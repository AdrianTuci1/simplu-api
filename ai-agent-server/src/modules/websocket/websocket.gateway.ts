import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'ws';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { SessionService } from '../session/session.service';
import { ElixirHttpService } from './elixir-http.service';

@NestWebSocketGateway({
  cors: true,
  path: '/socket/websocket',
  transports: ['websocket']
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map pentru a ține evidența conexiunilor per user/business
  private connections = new Map<string, Socket>();

  constructor(
    private readonly sessionService: SessionService,
    private readonly elixirHttpService: ElixirHttpService
  ) {}

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
      
      // Salvare mesaj în baza de date
      const messageId = this.generateMessageId();
      const timestamp = new Date().toISOString();
      
      await this.sessionService.saveMessage({
        messageId,
        sessionId: data.sessionId || this.generateSessionId(data),
        businessId: data.businessId,
        userId: data.userId,
        content: data.message,
        type: 'user',
        timestamp,
        metadata: {
          source: 'websocket'
        }
      });
      
      // Procesare mesaj prin agent (va fi implementat în etapa următoare)
      const response: AgentResponse = {
        responseId: this.generateResponseId(),
        message: `Răspuns temporar pentru: ${data.message}`,
        actions: [],
        timestamp: timestamp,
        sessionId: data.sessionId || this.generateSessionId(data)
      };
      
      // Salvare răspuns în baza de date
      await this.sessionService.saveMessage({
        messageId: this.generateMessageId(),
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

  // Notifică Elixir despre conversația AI pentru sincronizare
  private async forwardToElixir(data: MessageDto, response: AgentResponse): Promise<void> {
    try {
      console.log('AI conversation processed:', {
        businessId: data.businessId,
        userId: data.userId,
        message: data.message,
        response: response.message
      });

      // Notifică Elixir despre conversația AI
      await this.elixirHttpService.notifyNewAIConversation(data);
      
      // Trimite context AI către Elixir pentru agent
      const context = {
        sessionId: data.sessionId,
        businessId: data.businessId,
        userId: data.userId,
        lastMessage: data.message,
        aiResponse: response.message,
        timestamp: response.timestamp
      };
      await this.elixirHttpService.sendAIContextToElixir(data.sessionId, context);
      
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

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 