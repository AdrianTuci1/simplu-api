import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MessageDto } from '@/shared/interfaces/message.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ElixirHttpService {
  private readonly notificationHubUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.notificationHubUrl = process.env.NOTIFICATION_HUB_HTTP_URL || 'http://notification-hub:4000';
  }

  // Trimite răspunsul AI înapoi la Notification Hub
  async sendAIResponse(tenantId: string, userId: string, sessionId: string, messageId: string, content: string, context: any = {}): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.notificationHubUrl}/api/ai-responses`, {
          tenant_id: tenantId,
          user_id: userId,
          session_id: sessionId,
          message_id: messageId,
          content: content,
          context: context,
          timestamp: new Date().toISOString(),
          type: 'agent.response'
        })
      );
      
      console.log('AI response sent to Notification Hub successfully');
    } catch (error) {
      console.error('Error sending AI response to Notification Hub:', error);
      // Nu aruncăm eroarea pentru că aceasta nu este critică
    }
  }

  // Verifică starea Notification Hub-ului
  async checkNotificationHubHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.notificationHubUrl}/health`)
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Notification Hub health check failed:', error);
      return false;
    }
  }
} 