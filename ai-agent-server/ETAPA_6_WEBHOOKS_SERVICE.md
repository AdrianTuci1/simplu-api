# ETAPA 6: Webhooks Service

## Obiectiv
Implementarea serviciului pentru procesarea webhook-urilor de la Meta, Twilio și alte servicii externe.

## Durată Estimată: 4-5 zile

### 6.1 Webhooks Service Principal
```typescript
// src/modules/webhooks/webhooks.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { SessionService } from '../session/session.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { WebhookData, Intent } from '../agent/interfaces/agent.interface';

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
    // 1. Validare webhook signature
    const isValid = await this.validateMetaWebhookSignature(businessId, payload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 2. Procesare fiecare entry din webhook
    const results = [];
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.messages) {
          for (const message of change.value.messages) {
            const result = await this.processMetaMessage(businessId, message, change.value);
            results.push(result);
          }
        }
      }
    }

    return {
      status: 'ok',
      processed: results.length,
      results
    };
  }

  async processTwilioWebhook(
    businessId: string,
    payload: TwilioWebhookDto
  ): Promise<any> {
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
  }

  private async processMetaMessage(
    businessId: string,
    message: any,
    webhookValue: any
  ): Promise<any> {
    // 1. Descoperire locație din context
    const locationId = await this.discoverLocationFromMetaContext(businessId, webhookValue);
    
    // 2. Pregătire date pentru agent
    const webhookData: WebhookData = {
      businessId,
      locationId,
      userId: message.from,
      message: message.text?.body || '',
      source: 'meta',
      externalId: message.id,
      sessionId: this.generateSessionId(businessId, message.from)
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
    const webhookData: WebhookData = {
      businessId,
      locationId,
      userId: payload.From,
      message: payload.Body,
      source: 'twilio',
      externalId: payload.MessageSid,
      sessionId: this.generateSessionId(businessId, payload.From)
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
      const crypto = require('crypto');
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
        // Căutare locație după phone number ID
        const locations = await this.businessInfoService.getBusinessLocations(businessId);
        const location = locations.find(loc => 
          loc.metadata?.phoneNumberId === phoneNumberId
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
          loc.phone === toNumber || loc.metadata?.twilioNumber === toNumber
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
          source: webhookData.source,
          externalId: webhookData.externalId
        }
      });
    } catch (error) {
      console.error('Error saving webhook message:', error);
    }
  }

  private generateSessionId(businessId: string, userId: string): string {
    return `${businessId}:${userId}:${Date.now()}`;
  }
}

// src/modules/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AgentModule } from '../agent/agent.module';
import { SessionModule } from '../session/session.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    AgentModule,
    SessionModule,
    BusinessInfoModule,
    ExternalApisModule,
  ],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
```

### 6.2 Webhooks Controller
```typescript
// src/modules/webhooks/webhooks.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Headers, 
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { MetaWebhookDto, TwilioWebhookDto } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('meta/:businessId')
  @HttpCode(HttpStatus.OK)
  async handleMetaWebhook(
    @Param('businessId') businessId: string,
    @Body() payload: MetaWebhookDto,
    @Headers('x-hub-signature-256') signature: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string
  ) {
    // 1. Verificare webhook verification (pentru setup)
    if (mode === 'subscribe' && verifyToken) {
      return this.handleMetaVerification(verifyToken, challenge);
    }

    // 2. Validare signature
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    // 3. Procesare webhook
    const result = await this.webhooksService.processMetaWebhook(
      businessId,
      payload,
      signature
    );

    return result;
  }

  @Post('twilio/:businessId')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(
    @Param('businessId') businessId: string,
    @Body() payload: TwilioWebhookDto
  ) {
    // 1. Validare payload
    if (!payload.From || !payload.Body) {
      throw new BadRequestException('Invalid Twilio webhook payload');
    }

    // 2. Procesare webhook
    const result = await this.webhooksService.processTwilioWebhook(
      businessId,
      payload
    );

    return result;
  }

  @Get('meta/:businessId')
  async handleMetaVerification(
    @Param('businessId') businessId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string
  ) {
    if (mode === 'subscribe' && verifyToken) {
      return this.handleMetaVerification(verifyToken, challenge);
    }

    throw new BadRequestException('Invalid verification request');
  }

  private handleMetaVerification(verifyToken: string, challenge: string): string {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (verifyToken === expectedToken) {
      return challenge;
    } else {
      throw new UnauthorizedException('Invalid verification token');
    }
  }

  @Post('test/:businessId')
  async testWebhook(
    @Param('businessId') businessId: string,
    @Body() testData: {
      source: 'meta' | 'twilio';
      message: string;
      userId: string;
    }
  ) {
    // Endpoint pentru testare webhook-uri
    const webhookData = {
      businessId,
      locationId: `${businessId}-test`,
      userId: testData.userId,
      message: testData.message,
      source: testData.source,
      sessionId: `${businessId}:${testData.userId}:${Date.now()}`
    };

    const result = await this.webhooksService['agentService'].processWebhookMessage(webhookData);
    
    return {
      status: 'test_completed',
      result
    };
  }
}

// Actualizare webhooks.module.ts pentru a include controller
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { AgentModule } from '../agent/agent.module';
import { SessionModule } from '../session/session.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { ExternalApisModule } from '../external-apis/external-apis.module';

@Module({
  imports: [
    AgentModule,
    SessionModule,
    BusinessInfoModule,
    ExternalApisModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
```

### 6.3 Middleware pentru Webhook Security
```typescript
// src/modules/webhooks/middleware/webhook-security.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ExternalApisService } from '../../external-apis/external-apis.service';

@Injectable()
export class WebhookSecurityMiddleware implements NestMiddleware {
  constructor(private readonly externalApisService: ExternalApisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const businessId = req.params.businessId;
    const source = this.detectWebhookSource(req);

    if (source === 'meta') {
      await this.validateMetaWebhook(req, businessId);
    } else if (source === 'twilio') {
      await this.validateTwilioWebhook(req, businessId);
    }

    next();
  }

  private detectWebhookSource(req: Request): 'meta' | 'twilio' | 'unknown' {
    if (req.path.includes('/meta/')) {
      return 'meta';
    } else if (req.path.includes('/twilio/')) {
      return 'twilio';
    }
    return 'unknown';
  }

  private async validateMetaWebhook(req: Request, businessId: string): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!signature) {
      throw new UnauthorizedException('Missing Meta webhook signature');
    }

    // Validare signature (implementare similară cu cea din service)
    const isValid = await this.validateMetaSignature(businessId, req.body, signature);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid Meta webhook signature');
    }
  }

  private async validateTwilioWebhook(req: Request, businessId: string): Promise<void> {
    // Twilio nu folosește signature, dar putem valida alte aspecte
    const from = req.body.From;
    const body = req.body.Body;
    
    if (!from || !body) {
      throw new UnauthorizedException('Invalid Twilio webhook payload');
    }
  }

  private async validateMetaSignature(
    businessId: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      const credentials = await this.externalApisService.getMetaCredentials(businessId);
      if (!credentials) {
        return false;
      }

      const crypto = require('crypto');
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
      console.error('Error validating Meta signature:', error);
      return false;
    }
  }
}
```

### 6.4 Testare Webhooks
```typescript
// src/modules/webhooks/webhooks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { AgentService } from '../agent/agent.service';
import { SessionService } from '../session/session.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ExternalApisService } from '../external-apis/external-apis.service';

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: AgentService,
          useValue: {
            processWebhookMessage: jest.fn().mockResolvedValue({
              success: true,
              shouldRespond: true,
              response: 'Test response'
            })
          }
        },
        {
          provide: SessionService,
          useValue: {
            saveMessage: jest.fn()
          }
        },
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessLocations: jest.fn().mockResolvedValue([
              { locationId: 'test-location', isActive: true }
            ])
          }
        },
        {
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: jest.fn().mockResolvedValue({ success: true }),
            getMetaCredentials: jest.fn().mockResolvedValue({
              appSecret: 'test-secret'
            })
          }
        }
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process Meta webhook', async () => {
    const mockPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test-entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+40712345678',
              phone_number_id: 'test-phone-id'
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '+40787654321'
            }],
            messages: [{
              from: '+40787654321',
              id: 'test-message-id',
              timestamp: '1234567890',
              type: 'text',
              text: { body: 'Test message' }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const result = await service.processMetaWebhook(
      'test-business',
      mockPayload,
      'sha256=test-signature'
    );

    expect(result.status).toBe('ok');
    expect(result.processed).toBeGreaterThan(0);
  });

  it('should process Twilio webhook', async () => {
    const mockPayload = {
      MessageSid: 'test-message-sid',
      From: '+40787654321',
      To: '+40712345678',
      Body: 'Test SMS message',
      NumMedia: '0',
      AccountSid: 'test-account-sid',
      ApiVersion: '2010-04-01'
    };

    const result = await service.processTwilioWebhook('test-business', mockPayload);

    expect(result.status).toBe('ok');
    expect(result.processed).toBe(1);
  });
});
```

### 6.5 Script pentru Testare Webhook-uri
```typescript
// src/modules/webhooks/scripts/test-webhooks.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testMetaWebhook() {
  const businessId = 'test-business';
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '+40712345678',
            phone_number_id: 'test-phone-id'
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: '+40787654321'
          }],
          messages: [{
            from: '+40787654321',
            id: 'test-message-id',
            timestamp: '1234567890',
            type: 'text',
            text: { body: 'Vreau să fac o rezervare pentru mâine' }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/meta/${businessId}`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=test-signature'
        }
      }
    );

    console.log('Meta webhook test result:', response.data);
  } catch (error) {
    console.error('Meta webhook test failed:', error.response?.data || error.message);
  }
}

async function testTwilioWebhook() {
  const businessId = 'test-business';
  const testPayload = {
    MessageSid: 'test-message-sid',
    From: '+40787654321',
    To: '+40712345678',
    Body: 'Vreau să fac o rezervare pentru mâine',
    NumMedia: '0',
    AccountSid: 'test-account-sid',
    ApiVersion: '2010-04-01'
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/twilio/${businessId}`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Twilio webhook test result:', response.data);
  } catch (error) {
    console.error('Twilio webhook test failed:', error.response?.data || error.message);
  }
}

async function testWebhookEndpoint() {
  const businessId = 'test-business';
  const testData = {
    source: 'meta',
    message: 'Vreau să fac o rezervare pentru mâine',
    userId: '+40787654321'
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/test/${businessId}`,
      testData
    );

    console.log('Test webhook result:', response.data);
  } catch (error) {
    console.error('Test webhook failed:', error.response?.data || error.message);
  }
}

// Rulare teste
async function runTests() {
  console.log('Testing webhooks...\n');
  
  console.log('1. Testing Meta webhook:');
  await testMetaWebhook();
  
  console.log('\n2. Testing Twilio webhook:');
  await testTwilioWebhook();
  
  console.log('\n3. Testing webhook endpoint:');
  await testWebhookEndpoint();
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\nAll tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}
```

### 6.6 Actualizare App Module
```typescript
// src/app.module.ts
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { RagModule } from './modules/rag/rag.module';
import { AgentModule } from './modules/agent/agent.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ExternalApisModule } from './modules/external-apis/external-apis.module';
import { CredentialsModule } from './modules/external-apis/credentials/credentials.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebhookSecurityMiddleware } from './modules/webhooks/middleware/webhook-security.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    WebSocketModule,
    SessionModule,
    BusinessInfoModule,
    RagModule,
    AgentModule,
    ResourcesModule,
    ExternalApisModule,
    CredentialsModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WebhookSecurityMiddleware)
      .forRoutes(
        { path: 'webhooks/meta/:businessId', method: RequestMethod.POST },
        { path: 'webhooks/twilio/:businessId', method: RequestMethod.POST }
      );
  }
}
```

## Deliverables Etapa 6
- [ ] Webhooks Service implementat pentru Meta și Twilio
- [ ] Webhooks Controller cu endpoint-uri pentru webhook-uri
- [ ] Middleware pentru securitatea webhook-urilor
- [ ] Validare signature pentru Meta webhook-uri
- [ ] Descoperire automată a locației din context
- [ ] Integrare cu Agent Service pentru procesare autonomă
- [ ] Testare pentru webhook-uri
- [ ] Script pentru testare webhook-uri

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 7: Cron Jobs Service**. 