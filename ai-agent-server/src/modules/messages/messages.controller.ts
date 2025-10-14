import { Controller, Post, Body, Logger, Inject, forwardRef } from '@nestjs/common';
import { ElixirHttpService } from '../websocket/elixir-http.service';
import { MessagesService } from './messages.service';
import { AgentService } from '../agent/agent.service';
import { MessageDto } from '@/shared/interfaces/message.interface';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { SessionService } from '../session/session.service';

interface MessageRequest {
  tenant_id: string;
  user_id: string;
  session_id?: string;
  message_id: string;
  payload: {
    content: string;
    context?: any;
  };
  timestamp: string;
}

@Controller('api/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly elixirHttpService: ElixirHttpService,
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly webSocketGateway: WebSocketGateway,
    private readonly sessionService: SessionService
  ) {}

  @Post()
  async handleMessage(@Body() messageRequest: MessageRequest) {
    this.logger.log('=== Processing Message from Notification Hub ===');
    this.logger.log(`Message ID: ${messageRequest.message_id}`);
    this.logger.log(`Tenant ID: ${messageRequest.tenant_id}`);
    this.logger.log(`User ID: ${messageRequest.user_id}`);
    this.logger.log(`Session ID: ${messageRequest.session_id}`);
    this.logger.log(`Timestamp: ${messageRequest.timestamp}`);
    this.logger.log(`Content: "${messageRequest.payload.content}"`);
    this.logger.log(`Context: ${JSON.stringify(messageRequest.payload.context)}`);

    try {
      // Construiește MessageDto și procesează prin AgentService
      const context = messageRequest.payload.context || {};
      const messageData: MessageDto = {
        businessId: context.businessId || messageRequest.tenant_id,
        locationId: context.locationId || 'default',
        userId: context.userId || messageRequest.user_id,
        message: messageRequest.payload.content,
        sessionId: messageRequest.session_id,
        timestamp: messageRequest.timestamp
      };

      // Ensure session exists or create when missing
      if (!messageData.sessionId) {
        this.logger.log('No sessionId provided. Creating new session for HTTP message...');
        const newSession = await this.sessionService.createSession(
          messageData.businessId,
          messageData.locationId || 'default',
          messageData.userId,
          'general'
        );
        messageData.sessionId = newSession.sessionId;
        this.logger.log(`Created new session: ${newSession.sessionId}`);
      } else {
        const existing = await this.sessionService.getSession(messageData.sessionId);
        if (!existing) {
          this.logger.warn(`Provided sessionId ${messageData.sessionId} not found. Creating replacement session...`);
          const newSession = await this.sessionService.createSession(
            messageData.businessId,
            messageData.locationId || 'default',
            messageData.userId,
            'general'
          );
          messageData.sessionId = newSession.sessionId;
          this.logger.log(`Created replacement session: ${newSession.sessionId}`);
        }
      }

      const agentResponse = await this.agentService.processMessage(messageData);

      // Asigură consistență: folosește sessionId-ul generat de AgentService pentru stocare
      messageData.sessionId = agentResponse.sessionId;

      // Store both user message and AI response in database
      this.logger.log('Storing message exchange in database...');
      await this.messagesService.storeMessageExchange(messageData, agentResponse);

      // NOTE: Nu mai trimitem răspunsul aici deoarece bedrock-agent.service.ts
      // deja trimite streaming chunks și mesajul complet către Elixir
      // Acest lucru previne trimiterea duplicată a răspunsurilor
      
      this.logger.log('=== Message Processing Completed Successfully ===');
      this.logger.log(`Response sent for message: ${messageRequest.message_id}`);

      return {
        status: 'success',
        message: 'Message processed and response sent',
        data: {
          messageId: messageRequest.message_id,
          responseId: agentResponse.responseId,
          sessionId: agentResponse.sessionId,
          processingTime: Date.now() - new Date(messageRequest.timestamp).getTime()
        }
      };
    } catch (error) {
      this.logger.error('=== Error Processing Message ===');
      this.logger.error(`Message ID: ${messageRequest.message_id}`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      return {
        status: 'error',
        message: 'Failed to process message',
        error: error.message
      };
    }
  }

  @Post('websocket/message')
  async handleWebSocketMessage(@Body() messageDto: MessageDto) {
    this.logger.log('=== Processing WebSocket Message from Elixir ===');
    this.logger.log(`Business ID: ${messageDto.businessId}`);
    this.logger.log(`User ID: ${messageDto.userId}`);
    this.logger.log(`Location ID: ${messageDto.locationId}`);
    this.logger.log(`Session ID: ${messageDto.sessionId}`);
    this.logger.log(`Message: "${messageDto.message}"`);
    this.logger.log(`Timestamp: ${messageDto.timestamp}`);

    try {
      // Ensure session exists or create a new one when missing
      let sessionId = messageDto.sessionId;
      if (!sessionId) {
        this.logger.log('No sessionId provided. Creating new session...');
        const newSession = await this.sessionService.createSession(
          messageDto.businessId,
          messageDto.locationId || 'default',
          messageDto.userId,
          'general'
        );
        sessionId = newSession.sessionId;
        messageDto.sessionId = sessionId;
        this.logger.log(`Created new session: ${sessionId}`);
      } else {
        const existing = await this.sessionService.getSession(sessionId);
        if (!existing) {
          this.logger.warn(`Provided sessionId ${sessionId} not found. Creating new session...`);
          const newSession = await this.sessionService.createSession(
            messageDto.businessId,
            messageDto.locationId || 'default',
            messageDto.userId,
            'general'
          );
          sessionId = newSession.sessionId;
          messageDto.sessionId = sessionId;
          this.logger.log(`Created replacement session: ${sessionId}`);
        }
      }

      // Procesare mesaj prin Agent Service
      const response = await this.agentService.processMessage(messageDto);

      this.logger.log('=== WebSocket Message Processing Results ===');
      this.logger.log(`Response ID: ${response.responseId}`);
      this.logger.log(`Session ID: ${response.sessionId}`);
      this.logger.log(`AI Response: "${response.message}"`);
      this.logger.log(`Timestamp: ${response.timestamp}`);

      // NOTE: Nu mai trimitem răspunsul aici deoarece bedrock-agent.service.ts
      // deja trimite streaming chunks și mesajul complet către Elixir
      // Acest lucru previne trimiterea duplicată a răspunsurilor

      this.logger.log('=== WebSocket Message Processing Completed Successfully ===');

      return {
        status: 'success',
        message: 'WebSocket message processed and response sent',
        data: {
          responseId: response.responseId,
          sessionId: response.sessionId,
          timestamp: response.timestamp
        }
      };
      
    } catch (error) {
      this.logger.error('=== Error Processing WebSocket Message ===');
      this.logger.error(`Business ID: ${messageDto.businessId}`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      return {
        status: 'error',
        message: 'Failed to process WebSocket message',
        error: error.message
      };
    }
  }
}