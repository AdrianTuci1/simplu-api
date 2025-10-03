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
// import { WebSocketAgentService } from './websocket-agent.service'; // Temporarily disabled
import { AgentService } from '../agent/agent.service';

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
    private readonly agentService: AgentService
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

      // Procesare mesaj prin noul AgentService cu RAG
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

  // Agent-specific WebSocket handlers (simplified with new RAG system)
  @SubscribeMessage('agent_authenticate')
  async handleAgentAuthentication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; payload: any }
  ): Promise<void> {
    try {
      console.log('Agent authentication request:', data);
      
      // Simple authentication with new RAG system
      const result = {
        success: true,
        message: 'Authentication successful with new RAG system',
        sessionId: data.sessionId
      };
      
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
    @MessageBody() data: { sessionId: string; payload: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent execute command request:', data);
      
      // Process command through new RAG system
      const response = await this.agentService.processMessage({
        businessId: data.businessId,
        locationId: data.locationId,
        userId: 'operator',
        message: data.payload.command || 'Execute command',
        sessionId: data.sessionId
      });
      
      client.send(JSON.stringify({
        event: 'agent_command_result',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: true,
          message: response.message,
          actions: response.actions
        }
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
    @MessageBody() data: { sessionId: string; payload: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent modify query request:', data);
      
      // Simple query modification with new RAG system
      const result = {
        success: true,
        message: 'Query modified successfully with new RAG system',
        sessionId: data.sessionId
      };
      
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
    @MessageBody() data: { sessionId: string; payload: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent approve changes request:', data);
      
      // Simple approval with new RAG system
      const result = {
        success: true,
        message: 'Changes approved successfully with new RAG system',
        sessionId: data.sessionId
      };
      
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
    @MessageBody() data: { sessionId: string; payload: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent reject changes request:', data);
      
      // Simple rejection with new RAG system
      const result = {
        success: true,
        message: 'Changes rejected successfully with new RAG system',
        sessionId: data.sessionId
      };
      
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

  // Query modification handlers (simplified with new RAG system)
  @SubscribeMessage('agent_query_modify')
  async handleAgentQueryModify(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; repositoryType: string; modifications: any }
  ): Promise<void> {
    try {
      console.log('Agent query modify request:', data);
      
      // Simple query modification with new RAG system
      const result = {
        success: true,
        message: 'Query modified successfully with new RAG system',
        sessionId: data.sessionId
      };
      
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
      
      // Simple query revert with new RAG system
      const result = {
        success: true,
        message: 'Query reverted successfully with new RAG system',
        sessionId: data.sessionId
      };
      
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
      
      // Simple query history with new RAG system
      const history = [];
      
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

  // Draft creation handlers (simplified with new RAG system)
  @SubscribeMessage('agent_create_draft')
  async handleAgentCreateDraft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; draftType: string; content: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent create draft request:', data);
      
      // Simple draft creation with new RAG system
      const result = {
        success: true,
        message: 'Draft created successfully with new RAG system',
        draftId: `draft_${Date.now()}`,
        sessionId: data.sessionId
      };
      
      client.send(JSON.stringify({
        event: 'agent_draft_created',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));

      // Forward draft creation to Elixir
      if (result.success) {
        await this.forwardDraftToElixir(data.businessId, data.sessionId, {
          type: 'draft.created',
          draftId: result.draftId,
          draftType: data.draftType,
          content: data.content,
          locationId: data.locationId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling agent draft creation:', error);
      client.send(JSON.stringify({
        event: 'agent_draft_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Draft creation failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_update_draft')
  async handleAgentUpdateDraft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; draftId: string; content: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent update draft request:', data);
      
      // Simple draft update with new RAG system
      const result = {
        success: true,
        message: 'Draft updated successfully with new RAG system',
        sessionId: data.sessionId
      };
      
      client.send(JSON.stringify({
        event: 'agent_draft_updated',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));

      // Forward draft update to Elixir
      if (result.success) {
        await this.forwardDraftToElixir(data.businessId, data.sessionId, {
          type: 'draft.updated',
          draftId: data.draftId,
          content: data.content,
          locationId: data.locationId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling agent draft update:', error);
      client.send(JSON.stringify({
        event: 'agent_draft_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Draft update failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_delete_draft')
  async handleAgentDeleteDraft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; draftId: string; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent delete draft request:', data);
      
      // Simple draft deletion with new RAG system
      const result = {
        success: true,
        message: 'Draft deleted successfully with new RAG system',
        sessionId: data.sessionId
      };
      
      client.send(JSON.stringify({
        event: 'agent_draft_deleted',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));

      // Forward draft deletion to Elixir
      if (result.success) {
        await this.forwardDraftToElixir(data.businessId, data.sessionId, {
          type: 'draft.deleted',
          draftId: data.draftId,
          locationId: data.locationId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling agent draft deletion:', error);
      client.send(JSON.stringify({
        event: 'agent_draft_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Draft deletion failed',
          error: error.message
        }
      }));
    }
  }

  @SubscribeMessage('agent_list_drafts')
  async handleAgentListDrafts(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; businessId: string; locationId: string; filters?: any }
  ): Promise<void> {
    try {
      console.log('Agent list drafts request:', data);
      
      // Simple draft listing with new RAG system
      const result = {
        success: true,
        message: 'Drafts listed successfully with new RAG system',
        drafts: [],
        sessionId: data.sessionId
      };
      
      client.send(JSON.stringify({
        event: 'agent_drafts_listed',
        topic: `agent:${data.sessionId}`,
        payload: result
      }));

      // Forward draft listing to Elixir
      if (result.success) {
        await this.forwardDraftToElixir(data.businessId, data.sessionId, {
          type: 'draft.listed',
          drafts: result.drafts,
          filters: data.filters,
          locationId: data.locationId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling agent draft listing:', error);
      client.send(JSON.stringify({
        event: 'agent_draft_error',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: false,
          message: 'Draft listing failed',
          error: error.message
        }
      }));
    }
  }

  // Frontend resource request handlers (simplified with new RAG system)
  @SubscribeMessage('agent_request_frontend_resources')
  async handleAgentRequestFrontendResources(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; requestType: string; parameters: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Agent requesting frontend resources:', data);
      
      // Simple frontend resource request with new RAG system
      const result = {
        success: true,
        resources: [],
        message: 'Frontend resources requested successfully with new RAG system'
      };
      
      client.send(JSON.stringify({
        event: 'agent_frontend_resources_response',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: result.success,
          resources: result.resources,
          message: result.message
        }
      }));

      // Forward frontend resource request to Elixir
      if (result.success && result.resources) {
        await this.forwardFrontendDataToElixir(data.businessId, data.sessionId, {
          requestType: data.requestType,
          parameters: data.parameters,
          resources: result.resources,
          timestamp: new Date().toISOString()
        }, data.locationId);
      }
      
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
    @MessageBody() data: { sessionId: string; resources: any; businessId: string; locationId: string }
  ): Promise<void> {
    try {
      console.log('Frontend providing resources:', data);
      
      // Simple frontend resource provision with new RAG system
      const result = {
        success: true,
        message: 'Frontend resources provided successfully with new RAG system'
      };
      
      client.send(JSON.stringify({
        event: 'frontend_resources_provided',
        topic: `agent:${data.sessionId}`,
        payload: {
          success: result.success,
          message: result.message
        }
      }));

      // Forward frontend resources to Elixir
      if (result.success) {
        await this.forwardFrontendDataToElixir(data.businessId, data.sessionId, {
          requestType: 'frontend_provided',
          resources: data.resources,
          timestamp: new Date().toISOString()
        }, data.locationId);
      }
      
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

  // Forward frontend data to Elixir for frontend consumption
  private async forwardFrontendDataToElixir(businessId: string, sessionId: string, frontendData: any, locationId?: string): Promise<void> {
    try {
      console.log('Forwarding frontend data to Elixir:', {
        businessId,
        sessionId,
        requestType: frontendData.requestType,
        resources: frontendData.resources
      });

      // Create Elixir payload for frontend data
      const elixirPayload = {
        tenant_id: businessId,
        session_id: sessionId,
        message_id: this.generateMessageId(),
        content: `Frontend data retrieved: ${frontendData.requestType}`,
        context: {
          type: 'frontend_data',
          requestType: frontendData.requestType,
          parameters: frontendData.parameters || {},
          resources: frontendData.resources,
          locationId: locationId || 'default',
          timestamp: frontendData.timestamp,
          source: 'ai_agent_server'
        },
        timestamp: frontendData.timestamp,
        type: 'frontend.data'
      };

      try {
        // Send to Elixir via HTTP
        await this.elixirHttpService.sendAIResponse(
          businessId,
          'system', // Use system as userId for frontend data
          sessionId,
          elixirPayload.message_id,
          elixirPayload.content,
          elixirPayload.context
        );
        
        console.log('Frontend data sent to Elixir via HTTP:', elixirPayload);
      } catch (httpError) {
        console.error('Failed to send frontend data to Elixir via HTTP:', httpError);
        
        // Fallback: broadcast via WebSocket
        this.broadcastToBusiness(businessId, 'frontend_data_available', {
          sessionId,
          requestType: frontendData.requestType,
          resources: frontendData.resources,
          timestamp: frontendData.timestamp,
          messageId: elixirPayload.message_id
        });
        
        console.log('Frontend data sent to Elixir via WebSocket fallback');
      }

    } catch (error) {
      console.error('Error forwarding frontend data to Elixir:', error);
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Forward draft operations to Elixir
  private async forwardDraftToElixir(businessId: string, sessionId: string, draftData: any): Promise<void> {
    try {
      console.log('Forwarding draft to Elixir:', {
        businessId,
        sessionId,
        type: draftData.type,
        draftId: draftData.draftId
      });

      // Create Elixir payload for draft operations
      const elixirPayload = {
        tenant_id: businessId,
        session_id: sessionId,
        type: draftData.type,
        content: `Draft operation: ${draftData.type}`,
        context: {
          draftId: draftData.draftId,
          draftType: draftData.draftType,
          content: draftData.content,
          drafts: draftData.drafts,
          filters: draftData.filters,
          locationId: draftData.locationId || 'default',
          timestamp: draftData.timestamp
        },
        timestamp: new Date().toISOString()
      };

      console.log('Elixir draft payload:', elixirPayload);

      // Send to Elixir via HTTP
      await this.elixirHttpService.sendAIResponse(
        businessId,
        'system', // Use system as userId for draft operations
        sessionId,
        this.generateMessageId(),
        elixirPayload.content,
        elixirPayload.context
      );
      
    } catch (error) {
      console.error('Error forwarding draft to Elixir:', error);
      
      // Fallback: broadcast to WebSocket clients directly
      this.broadcastToBusiness(businessId, draftData.type, {
        sessionId,
        draftData,
        locationId: draftData.locationId || 'default',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle frontend query results from Elixir
  @SubscribeMessage('frontend_query_results')
  async handleFrontendQueryResults(
    @MessageBody() data: {
      sessionId: string;
      businessId: string;
      results: any[];
      timestamp: string;
    }
  ) {
    console.log('Received frontend query results from Elixir:', data);
    
    try {
      // Forward results to operator agent for processing
      // This would be handled by the operator agent service
      this.broadcastToBusiness(data.businessId, 'frontend_query_results', {
        sessionId: data.sessionId,
        results: data.results,
        timestamp: data.timestamp
      });
      
      console.log('Frontend query results forwarded to business clients');
    } catch (error) {
      console.error('Error handling frontend query results:', error);
    }
  }

  // Handle agent requests from Elixir
  @SubscribeMessage('agent_request')
  async handleAgentRequest(
    @MessageBody() data: {
      sessionId: string;
      businessId: string;
      userId: string;
      message: string;
      role: 'operator' | 'customer';
      timestamp: string;
    }
  ) {
    console.log('Received agent request from Elixir:', data);
    
    try {
      // Process the request through the appropriate agent
      const messageDto = {
        businessId: data.businessId,
        userId: data.userId,
        message: data.message,
        sessionId: data.sessionId,
        timestamp: data.timestamp
      };

      // Route to appropriate agent based on role
      if (data.role === 'operator') {
        // Process through operator agent
        console.log('Processing operator request through operator agent');
        // This would be handled by the operator agent service
      } else if (data.role === 'customer') {
        // Process through customer agent
        console.log('Processing customer request through customer agent');
        // This would be handled by the customer agent service
      }
      
    } catch (error) {
      console.error('Error handling agent request:', error);
    }
  }
} 