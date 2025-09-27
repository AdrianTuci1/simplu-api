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
import { AgentService } from '../agent/agent.service';
import { AgentWebSocketHandler } from '../agent/operator/handlers/agent-websocket.handler';
import { AgentQueryModifier } from '../agent/operator/handlers/agent-query-modifier';

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
    private readonly elixirHttpService: ElixirHttpService,
    private readonly agentService: AgentService,
    private readonly agentWebSocketHandler: AgentWebSocketHandler,
    private readonly agentQueryModifier: AgentQueryModifier
  ) { }

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
      if (!sessionId) {
        // Try to find existing active session for this user
        const existingSession = await this.sessionService.getActiveSessionForUser(
          data.businessId, 
          data.userId
        );
        if (existingSession) {
          sessionId = existingSession.sessionId;
        } else {
          // Create new session
          const newSession = await this.sessionService.createSession(
            data.businessId,
            data.locationId || 'default',
            data.userId,
            'general' // Will be updated with actual business type later
          );
          sessionId = newSession.sessionId;
        }
      }

      // Salvare mesaj în baza de date
      const messageId = this.generateMessageId();
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

      // Procesare mesaj prin agent cu sessionId corect
      const response = await this.agentService.processMessage({
        ...data,
        sessionId
      });

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
          { actions: response.actions || [] }
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

  // Agent-specific WebSocket handlers
  @SubscribeMessage('agent_authenticate')
  async handleAgentAuthentication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent authentication request:', data);
      
      const result = await this.agentWebSocketHandler.handleAuthentication(
        data.sessionId,
        data.payload
      );
      
      client.send(JSON.stringify({
        event: 'agent_authenticated',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent authentication:', error);
      client.send(JSON.stringify({
        event: 'agent_auth_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Authentication failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_execute_command')
  async handleAgentExecuteCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent execute command request:', data);
      
      const result = await this.agentWebSocketHandler.handleExecuteCommand(
        data.sessionId,
        data.payload
      );
      
      client.send(JSON.stringify({
        event: 'agent_command_result',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent command execution:', error);
      client.send(JSON.stringify({
        event: 'agent_command_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Command execution failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_modify_query')
  async handleAgentModifyQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent modify query request:', data);
      
      const result = await this.agentWebSocketHandler.handleModifyQuery(
        data.sessionId,
        data.payload
      );
      
      client.send(JSON.stringify({
        event: 'agent_query_modified',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent query modification:', error);
      client.send(JSON.stringify({
        event: 'agent_query_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Query modification failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_approve_changes')
  async handleAgentApproveChanges(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent approve changes request:', data);
      
      const result = await this.agentWebSocketHandler.handleApproveChanges(
        data.sessionId,
        data.payload
      );
      
      client.send(JSON.stringify({
        event: 'agent_changes_approved',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent changes approval:', error);
      client.send(JSON.stringify({
        event: 'agent_approval_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Changes approval failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_reject_changes')
  async handleAgentRejectChanges(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent reject changes request:', data);
      
      const result = await this.agentWebSocketHandler.handleRejectChanges(
        data.sessionId,
        data.payload
      );
      
      client.send(JSON.stringify({
        event: 'agent_changes_rejected',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent changes rejection:', error);
      client.send(JSON.stringify({
        event: 'agent_rejection_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Changes rejection failed',
          error: error.message
        }
      }));
    }
  }

  // Query modification handlers
  @SubscribeMessage('agent_query_modify')
  async handleAgentQueryModify(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; repositoryType: string; modifications: any }
  ): Promise<void> {
    try {
      console.log('Agent query modify request:', data);
      
      const result = await this.agentQueryModifier.modifyQuery(
        data.sessionId,
        data.repositoryType,
        data.modifications
      );
      
      client.send(JSON.stringify({
        event: 'agent_query_modified',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent query modification:', error);
      client.send(JSON.stringify({
        event: 'agent_query_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Query modification failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_query_revert')
  async handleAgentQueryRevert(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; modificationId: string }
  ): Promise<void> {
    try {
      console.log('Agent query revert request:', data);
      
      const result = await this.agentQueryModifier.revertQueryModification(
        data.sessionId,
        data.modificationId
      );
      
      client.send(JSON.stringify({
        event: 'agent_query_reverted',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));
      
    } catch (error) {
      console.error('Error handling agent query revert:', error);
      client.send(JSON.stringify({
        event: 'agent_revert_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Query revert failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_query_history')
  async handleAgentQueryHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ): Promise<void> {
    try {
      console.log('Agent query history request:', data);
      
      const history = this.agentQueryModifier.getModificationHistory(data.sessionId);
      
      client.send(JSON.stringify({
        event: 'agent_query_history',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: true,
          history
        }
      }));
      
    } catch (error) {
      console.error('Error handling agent query history:', error);
      client.send(JSON.stringify({
        event: 'agent_history_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Query history retrieval failed',
          error: error.message
        }
      }));
    }
  }

  // Frontend resource request handlers
  @SubscribeMessage('agent_request_frontend_resources')
  async handleAgentRequestFrontendResources(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; requestType: string; parameters: any; businessId: string }
  ): Promise<void> {
    try {
      console.log('Agent requesting frontend resources:', data);
      
      const result = await this.agentWebSocketHandler.requestFrontendResources(data.sessionId, {
        sessionId: data.sessionId,
        requestType: data.requestType,
        parameters: data.parameters,
        businessId: data.businessId
      });
      
      client.send(JSON.stringify({
        event: 'agent_frontend_resources_response',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: result.success,
          resources: result.resources,
          message: result.message
        }
      }));
      
    } catch (error) {
      console.error('Error handling agent frontend resource request:', error);
      client.send(JSON.stringify({
        event: 'agent_frontend_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Frontend resource request failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('frontend_provide_resources')
  async handleFrontendProvideResources(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; resources: any; businessId: string }
  ): Promise<void> {
    try {
      console.log('Frontend providing resources:', data);
      
      const result = await this.agentWebSocketHandler.handleFrontendResourceResponse(data.sessionId, {
        sessionId: data.sessionId,
        resources: data.resources,
        businessId: data.businessId
      });
      
      client.send(JSON.stringify({
        event: 'frontend_resources_provided',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: result.success,
          message: result.message
        }
      }));
      
    } catch (error) {
      console.error('Error handling frontend resource provision:', error);
      client.send(JSON.stringify({
        event: 'frontend_provision_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Frontend resource provision failed',
          error: error.message
        }
      }));
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 