import { Injectable } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { Message } from '@/shared/interfaces/session.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';

@Injectable()
export class MessagesService {
  constructor(
    private readonly sessionService: SessionService
  ) {}

  /**
   * Store both user message and AI response in the database
   */
  async storeMessageExchange(
    messageData: MessageDto,
    agentResponse: AgentResponse
  ): Promise<void> {
    try {
      // For now, use 'general' as default businessType
      // In the future, this could be obtained from a business service
      const businessType = 'general';
      
      // Store the incoming user message
      const userMessage: Message = {
        messageId: this.generateMessageId(),
        sessionId: messageData.sessionId,
        businessId: messageData.businessId,
        userId: messageData.userId,
        content: messageData.message,
        type: 'user',
        timestamp: messageData.timestamp,
        metadata: {
          source: 'websocket',
          businessType: businessType
        }
      };

      await this.sessionService.saveMessage(userMessage);
      console.log(`MessagesService: Saved user message for session ${messageData.sessionId}`);

      // Store the AI response
      const agentMessage: Message = {
        messageId: this.generateMessageId(),
        sessionId: agentResponse.sessionId,
        businessId: messageData.businessId,
        userId: messageData.userId,
        content: agentResponse.message,
        type: 'agent',
        timestamp: agentResponse.timestamp,
        metadata: {
          source: 'websocket',
          businessType: businessType,
          responseId: agentResponse.responseId,
          actions: agentResponse.actions || []
        }
      };

      await this.sessionService.saveMessage(agentMessage);
      console.log(`MessagesService: Saved agent response for session ${agentResponse.sessionId}`);

    } catch (error) {
      console.error('MessagesService: Failed to store message exchange:', error);
      throw error;
    }
  }

  /**
   * Store only a user message (for incoming messages)
   */
  async storeUserMessage(messageData: MessageDto): Promise<void> {
    try {
      // For now, use 'general' as default businessType
      const businessType = 'general';
      
      const userMessage: Message = {
        messageId: this.generateMessageId(),
        sessionId: messageData.sessionId,
        businessId: messageData.businessId,
        userId: messageData.userId,
        content: messageData.message,
        type: 'user',
        timestamp: messageData.timestamp,
        metadata: {
          source: 'websocket',
          businessType: businessType
        }
      };

      await this.sessionService.saveMessage(userMessage);
      console.log(`MessagesService: Saved user message for session ${messageData.sessionId}`);

    } catch (error) {
      console.error('MessagesService: Failed to store user message:', error);
      throw error;
    }
  }

  /**
   * Store only an agent response (for outgoing messages)
   */
  async storeAgentResponse(
    sessionId: string,
    businessId: string,
    userId: string,
    agentResponse: AgentResponse,
    businessType: string = 'general'
  ): Promise<void> {
    try {
      const agentMessage: Message = {
        messageId: this.generateMessageId(),
        sessionId: sessionId,
        businessId: businessId,
        userId: userId,
        content: agentResponse.message,
        type: 'agent',
        timestamp: agentResponse.timestamp,
        metadata: {
          source: 'websocket',
          businessType: businessType,
          responseId: agentResponse.responseId,
          actions: agentResponse.actions || []
        }
      };

      await this.sessionService.saveMessage(agentMessage);
      console.log(`MessagesService: Saved agent response for session ${sessionId}`);

    } catch (error) {
      console.error('MessagesService: Failed to store agent response:', error);
      throw error;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
