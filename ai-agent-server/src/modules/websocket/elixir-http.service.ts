import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MessageDto } from '@/shared/interfaces/message.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ElixirHttpService {
  private readonly notificationHubUrl: string;
  private readonly logger = new Logger(ElixirHttpService.name);

  constructor(private readonly httpService: HttpService) {
    this.notificationHubUrl = process.env.NOTIFICATION_HUB_HTTP_URL || 'http://notification-hub:4000';
    this.logger.log(`Notification Hub URL configured: ${this.notificationHubUrl}`);
  }

  // Trimite răspunsul AI înapoi la Notification Hub
  async sendAIResponse(tenantId: string, userId: string, sessionId: string, messageId: string, content: string, context: any = {}): Promise<void> {
    this.logger.log('=== Sending AI Response to Notification Hub ===');
    this.logger.log(`Tenant ID: ${tenantId}`);
    this.logger.log(`User ID: ${userId}`);
    this.logger.log(`Session ID: ${sessionId}`);
    this.logger.log(`Message ID: ${messageId}`);
    this.logger.log(`Content: "${content}"`);
    this.logger.log(`Context: ${JSON.stringify(context)}`);
    this.logger.log(`Target URL: ${this.notificationHubUrl}/api/ai-responses`);

    const requestBody = {
      tenant_id: tenantId,
      user_id: userId,
      session_id: sessionId,
      message_id: messageId,
      content: content,
      context: context,
      timestamp: new Date().toISOString(),
      type: 'agent.response'
    };

    this.logger.log(`Request body: ${JSON.stringify(requestBody)}`);

    try {
      const startTime = Date.now();
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.notificationHubUrl}/api/ai-responses`, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Agent-Server/1.0'
          },
          timeout: 10000 // 10 seconds timeout
        })
      );
      
      const duration = Date.now() - startTime;
      
      this.logger.log('=== AI Response Sent Successfully ===');
      this.logger.log(`Response status: ${response.status}`);
      this.logger.log(`Response headers: ${JSON.stringify(response.headers)}`);
      this.logger.log(`Response data: ${JSON.stringify(response.data)}`);
      this.logger.log(`Request duration: ${duration}ms`);
      this.logger.log(`Message ${messageId} processed and sent successfully`);
      
    } catch (error) {
      this.logger.error('=== Error Sending AI Response ===');
      this.logger.error(`Message ID: ${messageId}`);
      this.logger.error(`Error type: ${error.constructor.name}`);
      this.logger.error(`Error message: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`HTTP Status: ${error.response.status}`);
        this.logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        this.logger.error(`Request details: ${JSON.stringify(error.request)}`);
        this.logger.error('No response received from Notification Hub');
      } else {
        this.logger.error(`Error stack: ${error.stack}`);
      }
      
      // Nu aruncăm eroarea pentru că aceasta nu este critică pentru fluxul principal
      this.logger.warn('Continuing without throwing error - non-critical for main flow');
    }
  }

  // Verifică starea Notification Hub-ului
  async checkNotificationHubHealth(): Promise<boolean> {
    this.logger.log('=== Checking Notification Hub Health ===');
    this.logger.log(`Health check URL: ${this.notificationHubUrl}/health`);
    
    try {
      const startTime = Date.now();
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.notificationHubUrl}/health`, {
          timeout: 5000 // 5 seconds timeout
        })
      );
      
      const duration = Date.now() - startTime;
      
      this.logger.log('=== Health Check Results ===');
      this.logger.log(`Status: ${response.status}`);
      this.logger.log(`Response time: ${duration}ms`);
      this.logger.log(`Response data: ${JSON.stringify(response.data)}`);
      this.logger.log('Notification Hub is healthy');
      
      return response.status === 200;
    } catch (error) {
      this.logger.error('=== Health Check Failed ===');
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Error type: ${error.constructor.name}`);
      
      if (error.response) {
        this.logger.error(`HTTP Status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNREFUSED') {
        this.logger.error('Connection refused - Notification Hub may be down');
      } else if (error.code === 'ETIMEDOUT') {
        this.logger.error('Request timeout - Notification Hub may be slow');
      }
      
      this.logger.error('Notification Hub health check failed');
      return false;
    }
  }

  // Metodă pentru testarea conectivității
  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    this.logger.log('=== Testing Connection to Notification Hub ===');
    
    try {
      const startTime = Date.now();
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.notificationHubUrl}/health`, {
          timeout: 3000
        })
      );
      
      const latency = Date.now() - startTime;
      
      this.logger.log(`Connection test successful - Latency: ${latency}ms`);
      
      return {
        success: true,
        latency: latency
      };
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
} 