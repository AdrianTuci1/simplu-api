import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '@/modules/agent/agent.service';
import { ExternalApisService } from '../external-apis.service';
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';
import * as crypto from 'crypto';

interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp' | 'instagram' | 'facebook';
      metadata: {
        display_phone_number?: string;
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
        type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts';
        text?: {
          body: string;
        };
        image?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        // Add other message types as needed
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
      }>;
      // v24 format support
      sender?: {
        id: string;
      };
      recipient?: {
        id: string;
      };
      timestamp?: string;
      message?: {
        mid: string;
        text?: string;
        commands?: Array<{
          name: string;
        }>;
      };
    };
    field: string;
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

@Controller('webhooks/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly externalApisService: ExternalApisService,
    private readonly configService: ConfigService,
    private readonly kinesisLogger: KinesisLoggerService,
  ) {}

  /**
   * GET endpoint pentru verificarea webhook-ului Meta
   * Meta trimite acest request pentru a valida webhook-ul
   * NOTE: Acest endpoint nu necesită businessLocationId - e global pentru toate business-urile
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    this.logger.log(`📋 Webhook verification request (global endpoint)`);
    this.logger.log(`Mode: ${mode}, Verify Token: ${verifyToken}, Challenge: ${challenge}`);

    // Validate the verification token
    const expectedToken = this.configService.get<string>('meta.webhookVerifyToken');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('✅ Webhook verification successful');
      return challenge;
    } else {
      this.logger.error('❌ Webhook verification failed: Invalid verify token');
      throw new UnauthorizedException('Invalid verify token');
    }
  }

  /**
   * POST endpoint pentru primirea mesajelor de la Meta
   * Meta trimite aici notificări pentru mesaje, status updates, etc.
   * NOTE: Endpoint global - businessLocationId se determină din phone_number_id/page_id din payload
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: MetaWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Headers() headers: Record<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`📨 META WEBHOOK POST REQUEST RECEIVED`);
      this.logger.log(`${'='.repeat(80)}`);
      this.logger.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      this.logger.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);
      this.logger.log(`📦 Full Payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`🔐 Signature: ${signature || 'NOT PROVIDED'}`);
      this.logger.log(`${'='.repeat(80)}\n`);

      // Extract identifiers from payload to identify the business
      const phoneNumberId = payload.entry[0]?.changes[0]?.value?.metadata?.phone_number_id; // WhatsApp
      const pageId = payload.entry[0]?.id || payload.entry[0]?.changes[0]?.value?.recipient?.id; // Facebook Page ID (used for Messenger/Instagram) - support both v19 and v24 formats
      // Determine messaging product - for v24 format, if no messaging_product field, assume Facebook Messenger
      const messagingProduct = payload.entry[0]?.changes[0]?.value?.messaging_product || 'facebook'; // 'whatsapp' | 'instagram' | 'facebook'
      
      this.logger.log(`🔍 Identifying business from payload:`);
      this.logger.log(`   - Messaging Product: ${messagingProduct || 'N/A'}`);
      this.logger.log(`   - Phone Number ID (WhatsApp): ${phoneNumberId || 'N/A'}`);
      this.logger.log(`   - Page ID (Instagram/Messenger): ${pageId || 'N/A'}`);

      // Lookup businessLocationId from DynamoDB using phone_number_id or page_id
      const businessLocationId = await this.lookupBusinessLocationId(phoneNumberId, pageId, messagingProduct);
      
      this.logger.log(`✅ Mapped to businessLocationId: ${businessLocationId}`);

      // Parse businessLocationId (format: B01L01)
      const { businessId, locationId } = this.parseBusinessLocationId(businessLocationId);
      this.logger.log(`✅ Parsed: businessId=${businessId}, locationId=${locationId}`);

      // Validate signature
      this.logger.log(`🔐 Validating webhook signature...`);
      
      // TEMPORARY: Skip signature validation for debugging
      this.logger.warn(`⚠️ SIGNATURE VALIDATION DISABLED FOR DEBUGGING`);
      this.logger.warn(`⚠️ TODO: Re-enable signature validation in production!`);
      
      // Uncomment this line when credentials are properly configured:
      // await this.validateSignature(businessId, locationId, JSON.stringify(payload), signature);
      
      this.logger.log(`✅ Signature validation skipped (debugging mode)`);

      // Process webhook entries
      const results = [];
      let messageCount = 0;
      let statusCount = 0;

      this.logger.log(`📦 Processing ${payload.entry.length} webhook entries...`);

      for (const entry of payload.entry) {
        this.logger.log(`📥 Processing entry: ${entry.id} with ${entry.changes.length} changes`);
        
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            // Process incoming messages (v19 format)
            const messages = change.value.messages;
            this.logger.log(`💬 Found ${messages.length} incoming message(s) from ${change.value.messaging_product}`);
            
            for (const message of messages) {
              messageCount++;
              this.logger.log(`\n${'='.repeat(60)}`);
              this.logger.log(`📨 MESSAGE #${messageCount}: Processing incoming message (v19 format)`);
              this.logger.log(`${'='.repeat(60)}`);
              
              const result = await this.processIncomingMessage(
                businessId,
                locationId,
                message,
                change.value.metadata,
                change.value.contacts,
                change.value.messaging_product,
                pageId, // Pass page ID for Instagram/Messenger
              );
              results.push(result);
              
              this.logger.log(`${'='.repeat(60)}\n`);
            }
          } else if (change.field === 'messages' && change.value.sender && change.value.message) {
            // Process incoming messages (v24 format)
            messageCount++;
            this.logger.log(`\n${'='.repeat(60)}`);
            this.logger.log(`📨 MESSAGE #${messageCount}: Processing incoming message (v24 format)`);
            this.logger.log(`${'='.repeat(60)}`);
            
            const result = await this.processIncomingMessageV24(
              businessId,
              locationId,
              change.value,
              pageId,
              messagingProduct,
            );
            results.push(result);
            
            this.logger.log(`${'='.repeat(60)}\n`);
          } else if (change.field === 'messages' && change.value.statuses) {
            // Process message status updates
            for (const status of change.value.statuses) {
              statusCount++;
              this.logger.log(
                `📊 Status update #${statusCount}: ${status.id} -> ${status.status}`,
              );
              // You can log this to Kinesis or update message status in DB
            }
          } else {
            this.logger.log(`⚠️ Unhandled webhook field: ${change.field}`);
          }
        }
      }

      this.logger.log(`\n📊 WEBHOOK SUMMARY:`);
      this.logger.log(`   - Total messages processed: ${messageCount}`);
      this.logger.log(`   - Total status updates: ${statusCount}`);
      this.logger.log(`   - Results: ${results.length}`);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Meta webhook processed in ${executionTime}ms, ${results.length} messages processed`,
      );

      return {
        status: 'ok',
        processed: results.length,
        results,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`\n${'!'.repeat(80)}`);
      this.logger.error(`❌ META WEBHOOK ERROR`);
      this.logger.error(`${'!'.repeat(80)}`);
      this.logger.error(`⏰ Execution time: ${executionTime}ms`);
      this.logger.error(`❌ Error type: ${error.constructor.name}`);
      this.logger.error(`❌ Error message: ${error.message}`);
      this.logger.error(`📦 Payload that caused error: ${JSON.stringify(payload, null, 2)}`);
      this.logger.error(`📚 Stack trace:`);
      this.logger.error(error.stack);
      this.logger.error(`${'!'.repeat(80)}\n`);

      // Return 200 even on error so Meta doesn't retry
      // (we want to see what's wrong first)
      return {
        status: 'error',
        message: error.message,
        processed: 0,
      };
    }
  }

  /**
   * Validează signature-ul HMAC SHA256 de la Meta
   */
  private async validateSignature(
    businessId: string,
    locationId: string,
    payload: string,
    signature: string,
  ): Promise<void> {
    if (!signature) {
      this.logger.error('❌ Missing signature header');
      throw new UnauthorizedException('Missing signature header');
    }

    try {
      // Get app secret from credentials
      const credentials = await this.externalApisService.getMetaCredentials(businessId, locationId);
      
      if (!credentials || !credentials.appSecret) {
        this.logger.error('❌ Missing Meta credentials or app secret');
        throw new UnauthorizedException('Meta credentials not configured');
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', credentials.appSecret)
        .update(payload)
        .digest('hex');

      // Extract signature from header (format: "sha256=<signature>")
      const receivedSignature = signature.replace('sha256=', '');

      // Compare signatures
      if (
        !crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(receivedSignature),
        )
      ) {
        this.logger.error('❌ Invalid signature');
        throw new UnauthorizedException('Invalid signature');
      }

      this.logger.log('✅ Signature validated successfully');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('❌ Signature validation error:', error.message);
      throw new UnauthorizedException('Signature validation failed');
    }
  }

  /**
   * Procesează un mesaj primit de la Meta (format v24)
   */
  private async processIncomingMessageV24(
    businessId: string,
    locationId: string,
    value: any,
    pageId?: string,
    messagingProduct: string = 'facebook',
  ): Promise<any> {
    try {
      const messageId = value.message.mid;
      const userId = value.sender.id;
      const timestamp = value.timestamp;

      // Extract message content
      let messageContent = '';
      if (value.message.text) {
        messageContent = value.message.text;
      } else if (value.message.commands) {
        messageContent = `[Commands: ${value.message.commands.map(cmd => cmd.name).join(', ')}]`;
      } else {
        messageContent = `[${value.message.type || 'unknown'} message]`;
        this.logger.log(`⚠️ Non-text message type: ${value.message.type || 'unknown'}`);
      }

      this.logger.log(`📱 Platform: v24 format`);
      this.logger.log(`👤 From: ${userId}`);
      this.logger.log(`💬 Content: "${messageContent}"`);
      this.logger.log(`🕐 Timestamp: ${new Date(parseInt(timestamp) * 1000).toISOString()}`);

      // Generate session ID (group messages by user per day)
      const sessionId = this.generateSessionId(businessId, locationId, userId);
      this.logger.log(`🔑 Session ID: ${sessionId}`);

      // Process message through Bedrock Agent
      this.logger.log(`\n🤖 Sending to Bedrock Agent for processing...`);
      
      const webhookData = {
        businessId,
        locationId,
        userId,
        sessionId,
        message: messageContent,
        source: 'meta' as const,
        metadata: {
          messagingProduct: messagingProduct as 'whatsapp' | 'instagram' | 'facebook', // Use determined messaging product
          messageId,
          timestamp,
          contactName: 'Unknown', // v24 format doesn't include contact name
          phoneNumberId: undefined, // v24 uses pageId instead
        },
      };

      const result = await this.agentService.processWebhookMessage(webhookData);

      this.logger.log(`\n✅ Bedrock Agent processed message`);
      this.logger.log(`   - Should respond: ${result.shouldRespond}`);
      this.logger.log(`   - Has response: ${!!result.response}`);
      
      if (result.response) {
        this.logger.log(`   - Response preview: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
      }

      // Send response back to user via Meta if agent generated a response
      if (result.shouldRespond && result.response) {
        this.logger.log(`\n📤 Sending response back to user via Meta API...`);
        
        await this.sendMetaMessage(
          businessId,
          locationId,
          userId,
          result.response,
          undefined, // No phoneNumberId for v24 format
          pageId, // Use pageId for v24 format
          messagingProduct as 'whatsapp' | 'instagram' | 'facebook', // Use determined messaging product
        );
        
        this.logger.log(`✅ Response sent successfully!`);
      } else {
        this.logger.log(`ℹ️ No response needed (agent decided not to respond)`);
      }

      // Log to Kinesis if response was sent
      if (result.shouldRespond && result.response) {
        await this.kinesisLogger.logAgentMetaMessage({
          businessId,
          locationId,
          agentSessionId: sessionId,
          recipient: {
            phone: userId,
            userId: userId,
            name: 'Unknown',
          },
          success: true,
          externalId: messageId,
          messageLength: result.response.length,
        });
        
        this.logger.log(`📊 Meta conversation (v24) logged to Kinesis stream`);
      }

      return {
        messageId,
        userId,
        processed: true,
        autonomousAction: result.shouldRespond,
        response: result.shouldRespond,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error processing v24 message ${value.message?.mid}:`,
        error.stack,
      );

      return {
        messageId: value.message?.mid,
        userId: value.sender?.id,
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Procesează un mesaj primit de la Meta
   */
  private async processIncomingMessage(
    businessId: string,
    locationId: string,
    message: any,
    metadata: any,
    contacts: any[],
    messagingProduct: 'whatsapp' | 'instagram' | 'facebook',
    pageId?: string,
  ): Promise<any> {
    try {
      const messageId = message.id;
      const userId = message.from;
      const timestamp = message.timestamp;

      // Extract message content based on type
      let messageContent = '';
      if (message.type === 'text' && message.text) {
        messageContent = message.text.body;
      } else if (message.type === 'image' && message.image) {
        messageContent = `[Image${message.image.caption ? `: ${message.image.caption}` : ''}]`;
      } else {
        messageContent = `[${message.type} message]`;
        this.logger.log(`⚠️ Non-text message type: ${message.type}`);
      }

      // Get contact name if available
      const contactName =
        contacts && contacts[0] ? contacts[0].profile.name : 'Unknown';

      this.logger.log(`📱 Platform: ${messagingProduct}`);
      this.logger.log(`👤 From: ${contactName} (${userId})`);
      this.logger.log(`📝 Message type: ${message.type}`);
      this.logger.log(`💬 Content: "${messageContent}"`);
      this.logger.log(`🕐 Timestamp: ${new Date(parseInt(timestamp) * 1000).toISOString()}`);

      // Generate session ID (group messages by user per day)
      const sessionId = this.generateSessionId(businessId, locationId, userId);
      this.logger.log(`🔑 Session ID: ${sessionId}`);

      // Process message through Bedrock Agent
      this.logger.log(`\n🤖 Sending to Bedrock Agent for processing...`);
      
      const webhookData = {
        businessId,
        locationId,
        userId,
        sessionId,
        message: messageContent,
        source: 'meta' as const,
        metadata: {
          messagingProduct,
          messageId,
          timestamp,
          contactName,
          phoneNumberId: metadata.phone_number_id,
        },
      };

      const result = await this.agentService.processWebhookMessage(webhookData);

      this.logger.log(`\n✅ Bedrock Agent processed message`);
      this.logger.log(`   - Should respond: ${result.shouldRespond}`);
      this.logger.log(`   - Has response: ${!!result.response}`);
      
      if (result.response) {
        this.logger.log(`   - Response preview: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
      }

      // Send response back to user via Meta if agent generated a response
      if (result.shouldRespond && result.response) {
        this.logger.log(`\n📤 Sending response back to user via Meta API...`);
        
        await this.sendMetaMessage(
          businessId,
          locationId,
          userId,
          result.response,
          metadata.phone_number_id, // For WhatsApp
          pageId, // For Instagram/Messenger
          messagingProduct, // 'whatsapp' | 'instagram' | 'facebook'
        );
        
        this.logger.log(`✅ Response sent successfully!`);
      } else {
        this.logger.log(`ℹ️ No response needed (agent decided not to respond)`);
      }

      // Log to Kinesis if response was sent
      if (result.shouldRespond && result.response) {
        await this.kinesisLogger.logAgentMetaMessage({
          businessId,
          locationId,
          agentSessionId: sessionId,
          recipient: {
            phone: userId,
            userId: userId,
            name: contactName,
          },
          success: true,
          externalId: messageId,
          messageLength: result.response.length,
        });
        
        this.logger.log(`📊 Meta conversation logged to Kinesis stream`);
      }

      return {
        messageId,
        userId,
        processed: true,
        autonomousAction: result.shouldRespond,
        response: result.shouldRespond,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error processing message ${message.id}:`,
        error.stack,
      );

      return {
        messageId: message.id,
        userId: message.from,
        processed: false,
        error: error.message,
      };
    }
  }

  /**
   * Trimite mesaj către utilizator prin Meta API (WhatsApp, Instagram sau Messenger)
   */
  private async sendMetaMessage(
    businessId: string,
    locationId: string,
    to: string,
    message: string,
    phoneNumberId?: string,
    pageId?: string,
    messagingProduct: 'whatsapp' | 'instagram' | 'facebook' = 'whatsapp',
  ): Promise<void> {
    try {
      this.logger.log(`\n🔍 Retrieving Meta credentials for businessId: ${businessId}, locationId: ${locationId}...`);

      // Get credentials (need locationId from earlier in the flow)
      const credentials = await this.externalApisService.getMetaCredentials(businessId, locationId);

      if (!credentials || !credentials.accessToken) {
        this.logger.error(`❌ Meta credentials not found or missing access token`);
        throw new Error('Meta credentials not found');
      }

      this.logger.log(`✅ Credentials retrieved`);
      this.logger.log(`   - Has access token: ${!!credentials.accessToken}`);
      this.logger.log(`   - Token length: ${credentials.accessToken?.length} chars`);
      this.logger.log(`   - Messaging product: ${messagingProduct}`);

      // Determine API endpoint based on messaging product
      let url: string;
      let requestBody: any;

      if (messagingProduct === 'whatsapp') {
        // WhatsApp uses phone_number_id
        const phoneId = phoneNumberId || credentials.phoneNumberId;
        
        if (!phoneId) {
          this.logger.error(`❌ Phone number ID not configured for WhatsApp`);
          throw new Error('Phone number ID not configured');
        }

        this.logger.log(`   - Phone number ID: ${phoneId}`);
        
        url = `https://graph.facebook.com/v24.0/${phoneId}/messages`;
        requestBody = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message,
          },
        };
      } else if (messagingProduct === 'instagram' || messagingProduct === 'facebook') {
        // Instagram and Messenger both use page_id with /messages endpoint
        // They share the same API format (Send API)
        if (!pageId) {
          this.logger.error(`❌ Page ID not available for ${messagingProduct}`);
          throw new Error(`Page ID not configured for ${messagingProduct}`);
        }

        this.logger.log(`   - Page ID: ${pageId}`);
        
        url = `https://graph.facebook.com/v24.0/${pageId}/messages`;
        requestBody = {
          recipient: {
            id: to, // Instagram Scoped ID (IGSID) or Page-Scoped ID (PSID) for Messenger
          },
          message: {
            text: message,
          },
        };
      } else {
        throw new Error(`Unsupported messaging product: ${messagingProduct}`);
      }

      this.logger.log(`\n📡 Calling Meta Graph API...`);
      this.logger.log(`   - URL: ${url}`);
      this.logger.log(`   - To: ${to}`);
      this.logger.log(`   - Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      this.logger.log(`   - Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`❌ Meta API error response:`, JSON.stringify(errorData, null, 2));
        throw new Error(`Meta API error (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const messageId = messagingProduct === 'whatsapp' 
        ? data.messages?.[0]?.id 
        : data.message_id; // Instagram/Messenger use different response format
      
      this.logger.log(`✅ Meta message sent successfully!`);
      this.logger.log(`   - Platform: ${messagingProduct}`);
      this.logger.log(`   - Message ID: ${messageId}`);
      this.logger.log(`   - Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      this.logger.error(`\n❌ Failed to send Meta message:`);
      this.logger.error(`   - Error: ${error.message}`);
      if (error.stack) {
        this.logger.error(`   - Stack: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Parsează businessLocationId în businessId și locationId
   * Format: B01L01 → businessId: B01, locationId: L01
   */
  private parseBusinessLocationId(businessLocationId: string): { businessId: string; locationId: string } {
    // Expected format: B[businessId]L[locationId]
    // Example: B01L01, B0100001L01, etc.
    const match = businessLocationId.match(/^(B\d+)(L\d+)$/);
    
    if (!match) {
      this.logger.warn(`Invalid businessLocationId format: ${businessLocationId}, using as businessId`);
      return {
        businessId: businessLocationId,
        locationId: 'default',
      };
    }

    return {
      businessId: match[1],
      locationId: match[2],
    };
  }

  /**
   * Caută businessLocationId pe baza phone_number_id sau page_id din payload
   * 
   * Pentru WhatsApp: folosește phone_number_id
   * Pentru Instagram/Messenger: folosește page_id
   * 
   * În producție ar trebui să existe un tabel DynamoDB cu mapping-ul:
   * - WhatsApp: phone_number_id -> businessLocationId
   * - Instagram: page_id -> businessLocationId
   * - Messenger: page_id -> businessLocationId
   */
  private async lookupBusinessLocationId(
    phoneNumberId?: string, 
    pageId?: string,
    messagingProduct?: string
  ): Promise<string> {
    // Strategy pentru lookup:
    // 1. Pentru WhatsApp: caută după phone_number_id în DynamoDB
    // 2. Pentru Instagram/Messenger: caută după page_id în DynamoDB
    
    const identifier = phoneNumberId || pageId;
    const identifierType = phoneNumberId ? 'phone_number_id' : 'page_id';
    
    if (!identifier) {
      this.logger.error(`❌ No identifier found in webhook payload (phone_number_id or page_id)`);
      throw new BadRequestException('Cannot identify business from webhook payload');
    }
    
    this.logger.log(`🔍 Looking up business using ${identifierType}: ${identifier}`);
    
    // TODO: Implementează lookup în DynamoDB
    // Table structure:
    // {
    //   identifierId: "phone_number_id" sau "page_id",
    //   identifierType: "whatsapp" | "instagram" | "messenger",
    //   businessLocationId: "B0100001L0100001",
    //   businessId: "B0100001",
    //   locationId: "L0100001"
    // }
    
    // const result = await this.dynamoClient.send(new GetCommand({
    //   TableName: 'meta-platform-identifiers',
    //   Key: { identifierId: identifier }
    // }));
    
    // if (result.Item) {
    //   return result.Item.businessLocationId;
    // }

    // Fallback: folosește un default (pentru development/testing)
    const defaultBusinessLocationId = 'B0100001L0100001';
    
    this.logger.warn(`⚠️ Using default businessLocationId: ${defaultBusinessLocationId}`);
    this.logger.warn(`⚠️ PRODUCTION: Implement DynamoDB lookup for ${identifierType} mapping`);
    this.logger.warn(`⚠️ Missing mapping for ${identifierType}: ${identifier} (${messagingProduct})`);
    
    return defaultBusinessLocationId;
  }

  /**
   * Generează session ID pentru gruparea mesajelor per utilizator per zi
   */
  private generateSessionId(businessId: string, locationId: string, userId: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `meta_${businessId}_${locationId}_${userId}_${today}`;
  }
}

