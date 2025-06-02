import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { CommunicationConfigService } from '../services/communication-config.service';

@Injectable()
export class TwilioService {
  private clientCache: Map<string, twilio.Twilio> = new Map();

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => CommunicationConfigService))
    private communicationConfigService: CommunicationConfigService,
  ) {}

  private async getTwilioClient(tenantId: string, config: any): Promise<twilio.Twilio> {
    // Check cache first
    const cachedClient = this.clientCache.get(tenantId);
    if (cachedClient) {
      return cachedClient;
    }
    
    // Create new client
    const client = twilio(config.twilio.accountSid, config.twilio.authToken);
    
    // Cache the client
    this.clientCache.set(tenantId, client);
    return client;
  }

  async sendWhatsAppMessage(tenantId: string, to: string, message: string, config: any) {
    try {
      const client = await this.getTwilioClient(tenantId, config);

      const response = await client.messages.create({
        body: message,
        from: `whatsapp:${config.twilio.whatsappNumber}`,
        to: `whatsapp:${to}`,
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  async sendSMS(tenantId: string, to: string, message: string, config: any) {
    try {
      const client = await this.getTwilioClient(tenantId, config);

      const response = await client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to,
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async handleIncomingWhatsApp(tenantId: string, message: any) {
    // Process incoming WhatsApp messages
    // This will be called by the webhook endpoint
    return {
      success: true,
      message: 'WhatsApp message received',
      tenantId,
    };
  }

  clearClientCache(tenantId?: string) {
    if (tenantId) {
      this.clientCache.delete(tenantId);
    } else {
      this.clientCache.clear();
    }
  }
} 