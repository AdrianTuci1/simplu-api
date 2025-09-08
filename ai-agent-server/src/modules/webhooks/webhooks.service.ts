import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { SessionService } from '../session/session.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { WebhookData } from '../agent/interfaces/agent.interface';
import * as crypto from 'crypto';

export interface MetaWebhookDto {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface TwilioWebhookDto {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  AccountSid: string;
  ApiVersion: string;
}

@Injectable()
export class WebhooksService {
  private processingCount = 0;
  private readonly maxConcurrentProcessing = 5; // Limit concurrent webhook processing

  constructor(
    private readonly agentService: AgentService,
    private readonly sessionService: SessionService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly externalApisService: ExternalApisService
  ) {}

  async processMetaWebhook(
    businessId: string,
    payload: MetaWebhookDto,
    signature: string
  ): Promise<any> {
    console.log('🔍 META WEBHOOK PROCESSING STARTED - This should appear in logs if new code is running');
    
    // CRITICAL: Circuit breaker to prevent memory overload
    if (this.processingCount >= this.maxConcurrentProcessing) {
      console.warn(`Too many concurrent webhook processing (${this.processingCount}). Rejecting webhook.`);
      return { status: 'rejected', reason: 'too_many_concurrent_requests' };
    }

    // CRITICAL: Check payload size to prevent memory issues
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 100000) { // 100KB limit
      console.warn(`Webhook payload too large: ${payloadSize} bytes. Rejecting.`);
      return { status: 'rejected', reason: 'payload_too_large' };
    }

    // CRITICAL: Check current memory usage before processing
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 300) { // Lowered threshold from 400 to 300
      console.warn(`Memory usage too high (${heapUsedMB}MB). Rejecting webhook to prevent OOM.`);
      return { status: 'rejected', reason: 'memory_too_high' };
    }
    
    // EMERGENCY: Force exit if memory is catastrophic
    if (heapUsedMB > 700) {
      console.error(`CATASTROPHIC: Memory usage at ${heapUsedMB}MB. Forcing exit.`);
      process.exit(1);
    }

    this.processingCount++;
    try {
      // 1. Validare webhook signature
      const isValid = await this.validateMetaWebhookSignature(businessId, payload, signature);
      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

    // 2. Procesare fiecare entry din webhook
    const results = [];
    let messageCount = 0;
    const maxMessagesPerWebhook = 10; // CRITICAL: Limit messages per webhook
    
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.messages) {
          for (const message of change.value.messages) {
            if (messageCount >= maxMessagesPerWebhook) {
              console.warn(`Webhook contains too many messages (${messageCount}+). Processing only first ${maxMessagesPerWebhook}.`);
              break;
            }
            const result = await this.processMetaMessage(businessId, message, change.value);
            results.push(result);
            messageCount++;
          }
        }
      }
      if (messageCount >= maxMessagesPerWebhook) break;
    }

      return {
        status: 'ok',
        processed: results.length,
        results
      };
    } finally {
      this.processingCount--;
    }
  }

  async processTwilioWebhook(
    businessId: string,
    payload: TwilioWebhookDto
  ): Promise<any> {
    // CRITICAL: Circuit breaker to prevent memory overload
    if (this.processingCount >= this.maxConcurrentProcessing) {
      console.warn(`Too many concurrent webhook processing (${this.processingCount}). Rejecting webhook.`);
      return { status: 'rejected', reason: 'too_many_concurrent_requests' };
    }

    // CRITICAL: Check payload size to prevent memory issues
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 100000) { // 100KB limit
      console.warn(`Webhook payload too large: ${payloadSize} bytes. Rejecting.`);
      return { status: 'rejected', reason: 'payload_too_large' };
    }

    this.processingCount++;
    try {
      // 1. Validare payload Twilio
      if (!payload.From || !payload.Body) {
        throw new UnauthorizedException('Invalid Twilio webhook payload');
      }

      // 2. Procesare mesaj Twilio
      const result = await this.processTwilioMessage(businessId, payload);
      
      return {
        status: 'ok',
        processed: 1,
        result
      };
    } finally {
      this.processingCount--;
    }
  }

  async processGmailWebhook(
    businessId: string,
    body: any
  ): Promise<any> {
    // CRITICAL: Circuit breaker to prevent memory overload
    if (this.processingCount >= this.maxConcurrentProcessing) {
      console.warn(`Too many concurrent webhook processing (${this.processingCount}). Rejecting webhook.`);
      return { status: 'rejected', reason: 'too_many_concurrent_requests' };
    }

    // CRITICAL: Check payload size to prevent memory issues
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > 100000) { // 100KB limit
      console.warn(`Webhook payload too large: ${payloadSize} bytes. Rejecting.`);
      return { status: 'rejected', reason: 'payload_too_large' };
    }

    this.processingCount++;
    try {
      // Google Pub/Sub push format: body.message.data is base64
      const encoded = body?.message?.data;
      let emailAddress = '';
      let messageText = '';
      let externalId = body?.message?.messageId || '';

      if (encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        try {
          const data = JSON.parse(decoded);
          emailAddress = data?.emailAddress || '';
          messageText = `New email event (historyId=${data?.historyId || 'unknown'})`;
        } catch {
          // If not JSON, treat as raw text
          messageText = decoded;
        }
      } else if (typeof body?.message === 'string') {
        messageText = body.message;
      } else {
        messageText = 'New Gmail message received';
      }

      const userId = emailAddress || 'gmail-user';
      const locationId = `${businessId}-gmail`;

      // Ensure session exists or create new one
      let sessionId = this.generateSessionId(businessId, userId);
      const existingSession = await this.sessionService.getActiveSessionForUser(businessId, userId);
      if (existingSession) {
        sessionId = existingSession.sessionId;
      } else {
        // Create new session
        const newSession = await this.sessionService.createSession(
          businessId,
          locationId,
          userId,
          'general'
        );
        sessionId = newSession.sessionId;
      }

      const webhookData: WebhookData = {
        businessId,
        locationId,
        userId,
        message: messageText,
        source: 'email',
        externalId,
        sessionId
      };

      await this.saveWebhookMessage(webhookData);
      const result = await this.agentService.processWebhookMessage(webhookData);

      return {
        status: 'ok',
        processed: 1,
        result
      };
    } catch (error) {
      console.error('Error processing Gmail webhook:', error);
      return { status: 'error', processed: 0 };
    } finally {
      this.processingCount--;
    }
  }

  private async processMetaMessage(
    businessId: string,
    message: any,
    webhookValue: any
  ): Promise<any> {
    // 1. Descoperire locație din context
    const locationId = await this.discoverLocationFromMetaContext(businessId, webhookValue);
    
    // 2. Pregătire date pentru agent
    // Ensure session exists or create new one
    let sessionId = this.generateSessionId(businessId, message.from);
    const existingSession = await this.sessionService.getActiveSessionForUser(businessId, message.from);
    if (existingSession) {
      sessionId = existingSession.sessionId;
    } else {
      // Create new session
      const newSession = await this.sessionService.createSession(
        businessId,
        locationId,
        message.from,
        'general'
      );
      sessionId = newSession.sessionId;
    }

    const webhookData: WebhookData = {
      businessId,
      locationId,
      userId: message.from,
      message: message.text?.body || '',
      source: 'meta',
      externalId: message.id,
      sessionId
    };

    // 3. Salvare mesaj în sesiune
    await this.saveWebhookMessage(webhookData);

    // 4. Procesare prin agent autonom
    const result = await this.agentService.processWebhookMessage(webhookData);

    // 5. Răspuns automat prin Meta API dacă este necesar
    if (result.shouldRespond && result.response) {
      await this.externalApisService.sendMetaMessage(
        message.from,
        result.response,
        businessId
      );
    }

    return {
      messageId: message.id,
      userId: message.from,
      processed: true,
      autonomousAction: result.success,
      response: result.shouldRespond
    };
  }

  private async processTwilioMessage(
    businessId: string,
    payload: TwilioWebhookDto
  ): Promise<any> {
    // 1. Descoperire locație din context
    const locationId = await this.discoverLocationFromTwilioContext(businessId, payload);
    
    // 2. Pregătire date pentru agent
    // Ensure session exists or create new one
    let sessionId = this.generateSessionId(businessId, payload.From);
    const existingSession = await this.sessionService.getActiveSessionForUser(businessId, payload.From);
    if (existingSession) {
      sessionId = existingSession.sessionId;
    } else {
      // Create new session
      const newSession = await this.sessionService.createSession(
        businessId,
        locationId,
        payload.From,
        'general'
      );
      sessionId = newSession.sessionId;
    }

    const webhookData: WebhookData = {
      businessId,
      locationId,
      userId: payload.From,
      message: payload.Body,
      source: 'twilio',
      externalId: payload.MessageSid,
      sessionId
    };

    // 3. Salvare mesaj în sesiune
    await this.saveWebhookMessage(webhookData);

    // 4. Procesare prin agent autonom
    const result = await this.agentService.processWebhookMessage(webhookData);

    // 5. Răspuns automat prin Twilio API dacă este necesar
    if (result.shouldRespond && result.response) {
      await this.externalApisService.sendSMS(
        payload.From,
        result.response,
        businessId
      );
    }

    return {
      messageId: payload.MessageSid,
      userId: payload.From,
      processed: true,
      autonomousAction: result.success,
      response: result.shouldRespond
    };
  }

  private async validateMetaWebhookSignature(
    businessId: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      // Obținere app secret pentru business
      const credentials = await this.externalApisService.getMetaCredentials(businessId);
      if (!credentials) {
        console.error(`No Meta credentials found for business ${businessId}`);
        return false;
      }

      // Validare signature folosind app secret
      const expectedSignature = crypto
        .createHmac('sha256', credentials.appSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating Meta webhook signature:', error);
      return false;
    }
  }

  private async discoverLocationFromMetaContext(
    businessId: string,
    webhookValue: any
  ): Promise<string> {
    try {
      // Încercare descoperire locație din phone number
      const phoneNumberId = webhookValue.metadata?.phone_number_id;
      
      if (phoneNumberId) {
        // Căutare locație după phone number ID - folosim phone ca identificator
        const locations = await this.businessInfoService.getBusinessLocations(businessId);
        const location = locations.find(loc => 
          loc.phone === phoneNumberId
        );
        
        if (location) {
          return location.locationId;
        }
      }

      // Fallback la prima locație activă
      const locations = await this.businessInfoService.getBusinessLocations(businessId);
      const activeLocation = locations.find(loc => loc.isActive);
      
      return activeLocation?.locationId || `${businessId}-default`;
    } catch (error) {
      console.error('Error discovering location from Meta context:', error);
      return `${businessId}-default`;
    }
  }

  private async discoverLocationFromTwilioContext(
    businessId: string,
    payload: TwilioWebhookDto
  ): Promise<string> {
    try {
      // Încercare descoperire locație din numărul de telefon
      const toNumber = payload.To;
      
      if (toNumber) {
        const locations = await this.businessInfoService.getBusinessLocations(businessId);
        const location = locations.find(loc => 
          loc.phone === toNumber
        );
        
        if (location) {
          return location.locationId;
        }
      }

      // Fallback la prima locație activă
      const locations = await this.businessInfoService.getBusinessLocations(businessId);
      const activeLocation = locations.find(loc => loc.isActive);
      
      return activeLocation?.locationId || `${businessId}-default`;
    } catch (error) {
      console.error('Error discovering location from Twilio context:', error);
      return `${businessId}-default`;
    }
  }

  private async saveWebhookMessage(webhookData: WebhookData): Promise<void> {
    try {
      await this.sessionService.saveMessage({
        messageId: `${webhookData.source}_${Date.now()}`,
        sessionId: webhookData.sessionId,
        businessId: webhookData.businessId,
        userId: webhookData.userId,
        content: webhookData.message,
        type: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'webhook',
          externalId: webhookData.externalId
        }
      });
    } catch (error) {
      console.error('Error saving webhook message:', error);
    }
  }

  private generateSessionId(businessId: string, userId: string): string {
    // Generate session ID per day to group conversations as per user preference
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return `${businessId}:${userId}:${today}`;
  }
} 