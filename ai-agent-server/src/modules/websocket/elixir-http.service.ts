import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { firstValueFrom } from 'rxjs';
import { elixirConfig } from '@/config/elixir.config';

@Injectable()
export class ElixirHttpService {
  private readonly elixirHttpUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.elixirHttpUrl = elixirConfig.httpUrl;
  }

  // Notifică Elixir despre o nouă conversație AI
  async notifyNewAIConversation(data: MessageDto): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.elixirHttpUrl}${elixirConfig.endpoints.aiConversation}`, {
          businessId: data.businessId,
          locationId: data.locationId,
          userId: data.userId,
          sessionId: data.sessionId,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          type: 'ai_conversation'
        })
      );
      
      console.log('AI conversation notification sent to Elixir successfully');
    } catch (error) {
      console.error('Error notifying Elixir about AI conversation:', error);
      // Nu aruncăm eroarea pentru că aceasta nu este critică
    }
  }

  // Trimite context AI către Elixir pentru agent
  async sendAIContextToElixir(sessionId: string, context: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.elixirHttpUrl}${elixirConfig.endpoints.aiContext}`, {
          sessionId,
          context,
          timestamp: new Date().toISOString()
        })
      );
      
      console.log('AI context sent to Elixir successfully');
    } catch (error) {
      console.error('Error sending AI context to Elixir:', error);
      // Nu aruncăm eroarea pentru că aceasta nu este critică
    }
  }

  // Actualizează statusul conversației în Elixir
  async updateConversationStatus(sessionId: string, status: string, summary?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.put(`${this.elixirHttpUrl}${elixirConfig.endpoints.conversationStatus}/${sessionId}`, {
          status,
          summary,
          updatedAt: new Date().toISOString()
        })
      );
      
      console.log('Conversation status update sent to Elixir successfully');
    } catch (error) {
      console.error('Error updating conversation status in Elixir:', error);
      // Nu aruncăm eroarea pentru că aceasta nu este critică
    }
  }

  // Verifică starea aplicației Elixir
  async checkElixirHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.elixirHttpUrl}${elixirConfig.endpoints.health}`)
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Elixir health check failed:', error);
      return false;
    }
  }
} 