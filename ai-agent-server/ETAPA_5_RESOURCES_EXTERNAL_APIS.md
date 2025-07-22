# ETAPA 5: Resources Service și External APIs

## Obiectiv
Implementarea serviciilor pentru operații pe resursele API-ului principal și integrarea cu API-uri externe (Meta, Twilio).

## Durată Estimată: 5-6 zile

### 5.1 Resources Service
```typescript
// src/modules/resources/resources.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ResourceOperation {
  type: 'create' | 'read' | 'update' | 'delete';
  resourceType: string;
  businessId: string;
  locationId: string;
  data: any;
  headers?: Record<string, string>;
}

export interface ResourceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

@Injectable()
export class ResourcesService {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiBaseUrl = this.configService.get<string>('API_SERVER_URL');
    this.apiKey = this.configService.get<string>('API_SERVER_KEY');
  }

  async executeOperation(operation: ResourceOperation): Promise<ResourceResponse> {
    try {
      const url = this.buildResourceUrl(operation);
      const headers = this.buildHeaders(operation.headers);
      
      let response: any;

      switch (operation.type) {
        case 'create':
          response = await firstValueFrom(
            this.httpService.post(url, operation.data, { headers })
          );
          break;
        case 'read':
          response = await firstValueFrom(
            this.httpService.get(url, { headers })
          );
          break;
        case 'update':
          response = await firstValueFrom(
            this.httpService.put(url, operation.data, { headers })
          );
          break;
        case 'delete':
          response = await firstValueFrom(
            this.httpService.delete(url, { headers })
          );
          break;
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };

    } catch (error) {
      console.error('Resource operation failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  // Operații specifice pentru rezervări
  async createReservation(
    businessId: string,
    locationId: string,
    reservationData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'create',
      resourceType: 'reservations',
      businessId,
      locationId,
      data: reservationData
    });
  }

  async getReservations(
    businessId: string,
    locationId: string,
    filters?: any
  ): Promise<ResourceResponse> {
    const url = this.buildResourceUrl({
      type: 'read',
      resourceType: 'reservations',
      businessId,
      locationId,
      data: {}
    });

    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}${queryParams}`, {
          headers: this.buildHeaders()
        })
      );

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  // Operații specifice pentru clienți
  async getCustomer(
    businessId: string,
    locationId: string,
    customerId: string
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: `customers/${customerId}`,
      businessId,
      locationId,
      data: {}
    });
  }

  async createCustomer(
    businessId: string,
    locationId: string,
    customerData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'create',
      resourceType: 'customers',
      businessId,
      locationId,
      data: customerData
    });
  }

  // Operații specifice pentru servicii
  async getServices(
    businessId: string,
    locationId: string
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: 'services',
      businessId,
      locationId,
      data: {}
    });
  }

  // Operații specifice pentru disponibilitate
  async checkAvailability(
    businessId: string,
    locationId: string,
    availabilityData: any
  ): Promise<ResourceResponse> {
    return this.executeOperation({
      type: 'read',
      resourceType: 'availability',
      businessId,
      locationId,
      data: availabilityData
    });
  }

  private buildResourceUrl(operation: ResourceOperation): string {
    return `${this.apiBaseUrl}/resources/${operation.businessId}/${operation.locationId}/${operation.resourceType}`;
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };
  }
}

// src/modules/resources/resources.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResourcesService } from './resources.service';

@Module({
  imports: [HttpModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
```

### 5.2 External APIs Service
```typescript
// src/modules/external-apis/external-apis.service.ts
import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetCommand, PutCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

export interface MetaCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  appSecret: string;
  phoneNumber: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface ExternalCredentials {
  businessId: string;
  serviceType: 'meta' | 'twilio';
  credentials: MetaCredentials | TwilioCredentials;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    webhookUrl?: string;
    permissions?: string[];
    rateLimits?: any;
  };
}

@Injectable()
export class ExternalApisService {
  private dynamoClient = dynamoDBClient;
  private metaClients = new Map<string, any>();
  private twilioClients = new Map<string, any>();

  // Meta API Methods
  async sendMetaMessage(
    to: string,
    message: string,
    businessId: string
  ): Promise<any> {
    const metaClient = await this.getMetaClient(businessId);
    
    try {
      const response = await metaClient.post('/messages', {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Meta API error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async sendMetaTemplate(
    to: string,
    templateName: string,
    parameters: any[],
    businessId: string
  ): Promise<any> {
    const metaClient = await this.getMetaClient(businessId);
    
    try {
      const response = await metaClient.post('/messages', {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'ro'
          },
          components: parameters.map(param => ({
            type: 'body',
            parameters: [{
              type: 'text',
              text: param
            }]
          }))
        }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Meta template error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Twilio API Methods
  async sendSMS(
    to: string,
    message: string,
    businessId: string
  ): Promise<any> {
    const twilioClient = await this.getTwilioClient(businessId);
    const credentials = await this.getTwilioCredentials(businessId);
    
    try {
      const response = await twilioClient.messages.create({
        body: message,
        from: credentials.phoneNumber,
        to: to
      });

      return {
        success: true,
        messageId: response.sid,
        data: response
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    businessId: string
  ): Promise<any> {
    // Implementare pentru serviciu de email (SendGrid, AWS SES, etc.)
    // Pentru moment, simulăm trimiterea
    console.log(`Email would be sent to ${to}: ${subject}`);
    
    return {
      success: true,
      messageId: `email_${Date.now()}`,
      data: { to, subject, body }
    };
  }

  // Credentials Management
  async saveMetaCredentials(
    businessId: string,
    credentials: MetaCredentials
  ): Promise<ExternalCredentials> {
    const externalCredentials: ExternalCredentials = {
      businessId,
      serviceType: 'meta',
      credentials,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalCredentials,
      Item: marshall(externalCredentials)
    }));

    // Clear cached client
    this.metaClients.delete(businessId);

    return externalCredentials;
  }

  async saveTwilioCredentials(
    businessId: string,
    credentials: TwilioCredentials
  ): Promise<ExternalCredentials> {
    const externalCredentials: ExternalCredentials = {
      businessId,
      serviceType: 'twilio',
      credentials,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalCredentials,
      Item: marshall(externalCredentials)
    }));

    // Clear cached client
    this.twilioClients.delete(businessId);

    return externalCredentials;
  }

  async getMetaCredentials(businessId: string): Promise<MetaCredentials | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.externalCredentials,
        Key: marshall({
          businessId,
          serviceType: 'meta'
        })
      }));

      if (!result.Item) {
        return null;
      }

      const credentials = unmarshall(result.Item) as ExternalCredentials;
      return credentials.isActive ? credentials.credentials as MetaCredentials : null;
    } catch (error) {
      console.error('Error getting Meta credentials:', error);
      return null;
    }
  }

  async getTwilioCredentials(businessId: string): Promise<TwilioCredentials | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.externalCredentials,
        Key: marshall({
          businessId,
          serviceType: 'twilio'
        })
      }));

      if (!result.Item) {
        return null;
      }

      const credentials = unmarshall(result.Item) as ExternalCredentials;
      return credentials.isActive ? credentials.credentials as TwilioCredentials : null;
    } catch (error) {
      console.error('Error getting Twilio credentials:', error);
      return null;
    }
  }

  async getBusinessPhoneNumber(businessId: string, serviceType: 'meta' | 'twilio'): Promise<string | null> {
    if (serviceType === 'meta') {
      const credentials = await this.getMetaCredentials(businessId);
      return credentials?.phoneNumber || null;
    } else {
      const credentials = await this.getTwilioCredentials(businessId);
      return credentials?.phoneNumber || null;
    }
  }

  // Private methods for client management
  private async getMetaClient(businessId: string): Promise<any> {
    if (this.metaClients.has(businessId)) {
      return this.metaClients.get(businessId);
    }

    const credentials = await this.getMetaCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Meta credentials found for business ${businessId}`);
    }

    // Create Meta client (using axios for simplicity)
    const { default: axios } = await import('axios');
    const client = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.metaClients.set(businessId, client);
    return client;
  }

  private async getTwilioClient(businessId: string): Promise<any> {
    if (this.twilioClients.has(businessId)) {
      return this.twilioClients.get(businessId);
    }

    const credentials = await this.getTwilioCredentials(businessId);
    if (!credentials) {
      throw new Error(`No Twilio credentials found for business ${businessId}`);
    }

    // Create Twilio client
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);

    this.twilioClients.set(businessId, client);
    return client;
  }
}

// src/modules/external-apis/external-apis.module.ts
import { Module } from '@nestjs/common';
import { ExternalApisService } from './external-apis.service';

@Module({
  providers: [ExternalApisService],
  exports: [ExternalApisService],
})
export class ExternalApisModule {}
```

### 5.3 Credentials Controller
```typescript
// src/modules/external-apis/credentials/credentials.controller.ts
import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { MetaCredentialsDto, TwilioCredentialsDto } from './dto/credentials.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post('meta/:businessId')
  async saveMetaCredentials(
    @Param('businessId') businessId: string,
    @Body() credentials: MetaCredentialsDto
  ) {
    return this.credentialsService.saveMetaCredentials(businessId, credentials);
  }

  @Post('twilio/:businessId')
  async saveTwilioCredentials(
    @Param('businessId') businessId: string,
    @Body() credentials: TwilioCredentialsDto
  ) {
    return this.credentialsService.saveTwilioCredentials(businessId, credentials);
  }

  @Get('meta/:businessId')
  async getMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.getMetaCredentials(businessId);
  }

  @Get('twilio/:businessId')
  async getTwilioCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.getTwilioCredentials(businessId);
  }

  @Post('meta/:businessId/test')
  async testMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.testMetaCredentials(businessId);
  }

  @Post('twilio/:businessId/test')
  async testTwilioCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.testTwilioCredentials(businessId);
  }

  @Put('meta/:businessId')
  async updateMetaCredentials(
    @Param('businessId') businessId: string,
    @Body() updates: Partial<MetaCredentialsDto>
  ) {
    return this.credentialsService.updateMetaCredentials(businessId, updates);
  }

  @Put('twilio/:businessId')
  async updateTwilioCredentials(
    @Param('businessId') businessId: string,
    @Body() updates: Partial<TwilioCredentialsDto>
  ) {
    return this.credentialsService.updateTwilioCredentials(businessId, updates);
  }
}

// src/modules/external-apis/credentials/credentials.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { MetaCredentialsDto, TwilioCredentialsDto } from './dto/credentials.dto';

@Injectable()
export class CredentialsService {
  constructor(private readonly externalApisService: ExternalApisService) {}

  async saveMetaCredentials(
    businessId: string,
    credentials: MetaCredentialsDto
  ): Promise<any> {
    await this.validateMetaCredentials(credentials);
    return this.externalApisService.saveMetaCredentials(businessId, credentials);
  }

  async saveTwilioCredentials(
    businessId: string,
    credentials: TwilioCredentialsDto
  ): Promise<any> {
    await this.validateTwilioCredentials(credentials);
    return this.externalApisService.saveTwilioCredentials(businessId, credentials);
  }

  async getMetaCredentials(businessId: string): Promise<any> {
    return this.externalApisService.getMetaCredentials(businessId);
  }

  async getTwilioCredentials(businessId: string): Promise<any> {
    return this.externalApisService.getTwilioCredentials(businessId);
  }

  async testMetaCredentials(businessId: string): Promise<any> {
    try {
      const result = await this.externalApisService.sendMetaMessage(
        'test',
        'Test message from AI Agent',
        businessId
      );
      
      return {
        success: result.success,
        message: result.success ? 'Meta credentials are valid' : 'Meta credentials are invalid',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test Meta credentials',
        error: error.message
      };
    }
  }

  async testTwilioCredentials(businessId: string): Promise<any> {
    try {
      const result = await this.externalApisService.sendSMS(
        '+40712345678', // Test number
        'Test SMS from AI Agent',
        businessId
      );
      
      return {
        success: result.success,
        message: result.success ? 'Twilio credentials are valid' : 'Twilio credentials are invalid',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test Twilio credentials',
        error: error.message
      };
    }
  }

  async updateMetaCredentials(
    businessId: string,
    updates: Partial<MetaCredentialsDto>
  ): Promise<any> {
    const existing = await this.getMetaCredentials(businessId);
    if (!existing) {
      throw new BadRequestException('No existing Meta credentials found');
    }

    const updatedCredentials = { ...existing, ...updates };
    await this.validateMetaCredentials(updatedCredentials);
    
    return this.externalApisService.saveMetaCredentials(businessId, updatedCredentials);
  }

  async updateTwilioCredentials(
    businessId: string,
    updates: Partial<TwilioCredentialsDto>
  ): Promise<any> {
    const existing = await this.getTwilioCredentials(businessId);
    if (!existing) {
      throw new BadRequestException('No existing Twilio credentials found');
    }

    const updatedCredentials = { ...existing, ...updates };
    await this.validateTwilioCredentials(updatedCredentials);
    
    return this.externalApisService.saveTwilioCredentials(businessId, updatedCredentials);
  }

  private async validateMetaCredentials(credentials: MetaCredentialsDto): Promise<void> {
    if (!credentials.accessToken || !credentials.phoneNumberId || !credentials.appSecret) {
      throw new BadRequestException('Missing required Meta credentials');
    }
  }

  private async validateTwilioCredentials(credentials: TwilioCredentialsDto): Promise<void> {
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      throw new BadRequestException('Missing required Twilio credentials');
    }
  }
}

// src/modules/external-apis/credentials/dto/credentials.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class MetaCredentialsDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsOptional()
  businessAccountId?: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class TwilioCredentialsDto {
  @IsString()
  @IsNotEmpty()
  accountSid: string;

  @IsString()
  @IsNotEmpty()
  authToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

// src/modules/external-apis/credentials/credentials.module.ts
import { Module } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { ExternalApisModule } from '../external-apis.module';

@Module({
  imports: [ExternalApisModule],
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
```

### 5.4 Integrare cu Agent Service
```typescript
// Actualizare Agent Service pentru a include Resources și External APIs

// În agent.service.ts, adăugare în constructor:
constructor(
  private readonly businessInfoService: BusinessInfoService,
  private readonly ragService: RagService,
  private readonly sessionService: SessionService,
  private readonly websocketGateway: WebSocketGateway,
  private readonly resourcesService: ResourcesService,
  private readonly externalApisService: ExternalApisService
) {
  // ... restul constructorului
}

// Actualizare executeWorkflowStep pentru a folosi Resources Service:
private async executeWorkflowStep(
  step: any,
  context: WorkflowContext
): Promise<WorkflowStepResult> {
  if (step.apiCall) {
    // Executare operație pe resurse
    const operation = {
      type: step.apiCall.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete',
      resourceType: step.apiCall.endpoint.split('/').pop(),
      businessId: context.webhookData.businessId,
      locationId: context.webhookData.locationId,
      data: this.parseDataTemplate(step.apiCall.dataTemplate, context)
    };

    const result = await this.resourcesService.executeOperation(operation);
    
    return {
      step: step.step,
      action: step.action,
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    };
  }

  if (step.action === 'send_confirmation') {
    // Trimitere confirmare prin canalul original
    const source = context.webhookData.source;
    const userId = context.webhookData.userId;
    const message = this.generateConfirmationMessage(context);

    let result;
    if (source === 'meta') {
      result = await this.externalApisService.sendMetaMessage(
        userId,
        message,
        context.webhookData.businessId
      );
    } else if (source === 'twilio') {
      result = await this.externalApisService.sendSMS(
        userId,
        message,
        context.webhookData.businessId
      );
    }

    return {
      step: step.step,
      action: step.action,
      success: result?.success || false,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  // ... restul implementării
}

private parseDataTemplate(template: string, context: WorkflowContext): any {
  // Înlocuire placeholder-uri cu date reale
  return template
    .replace('{businessId}', context.webhookData.businessId)
    .replace('{locationId}', context.webhookData.locationId)
    .replace('{customerId}', context.webhookData.userId)
    .replace('{date}', new Date().toISOString().split('T')[0])
    .replace('{time}', new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
}

private generateConfirmationMessage(context: WorkflowContext): string {
  // Generare mesaj de confirmare cu Gemini
  const prompt = `
    Generează un mesaj de confirmare pentru utilizator.
    
    Context: ${context.businessInfo.businessName} - ${context.businessInfo.businessType}
    Acțiunea: ${context.intent.action}
    
    Mesajul trebuie să fie:
    - Confirmare pozitivă
    - În limba română
    - Specific pentru tipul de business
    - Să includă detalii relevante
  `;

  // Pentru moment, returnăm un mesaj simplu
  return `Confirmare: Acțiunea a fost realizată cu succes!`;
}
```

### 5.5 Testare Resources Service
```typescript
// src/modules/resources/resources.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ResourcesService } from './resources.service';
import { of } from 'rxjs';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_SERVER_URL') return 'https://api.example.com';
              if (key === 'API_SERVER_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create reservation successfully', async () => {
    const mockResponse = { data: { id: 'res-123' }, status: 201 };
    jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as any));

    const result = await service.createReservation(
      'business-1',
      'location-1',
      { customerId: 'cust-1', serviceId: 'serv-1', date: '2024-01-15' }
    );

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('res-123');
  });

  it('should handle API errors gracefully', async () => {
    const mockError = {
      response: {
        status: 400,
        data: { message: 'Invalid data' }
      }
    };
    jest.spyOn(httpService, 'post').mockImplementation(() => {
      throw mockError;
    });

    const result = await service.createReservation(
      'business-1',
      'location-1',
      { invalid: 'data' }
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
  });
});
```

### 5.6 Testare External APIs Service
```typescript
// src/modules/external-apis/external-apis.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalApisService } from './external-apis.service';

describe('ExternalApisService', () => {
  let service: ExternalApisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalApisService],
    }).compile();

    service = module.get<ExternalApisService>(ExternalApisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save Meta credentials', async () => {
    const credentials = {
      accessToken: 'test-token',
      phoneNumberId: 'test-phone-id',
      appSecret: 'test-secret',
      phoneNumber: '+40712345678'
    };

    const result = await service.saveMetaCredentials('business-1', credentials);
    
    expect(result.businessId).toBe('business-1');
    expect(result.serviceType).toBe('meta');
    expect(result.isActive).toBe(true);
  });

  it('should send SMS via Twilio', async () => {
    // Mock Twilio credentials
    jest.spyOn(service as any, 'getTwilioCredentials').mockResolvedValue({
      accountSid: 'test-sid',
      authToken: 'test-token',
      phoneNumber: '+40712345678'
    });

    const result = await service.sendSMS(
      '+40787654321',
      'Test message',
      'business-1'
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });
});
```

### 5.7 Actualizare App Module
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Deliverables Etapa 5
- [ ] Resources Service implementat cu operații CRUD
- [ ] External APIs Service cu Meta și Twilio
- [ ] Credentials Service pentru gestionarea credențialelor
- [ ] Integrare cu Agent Service pentru operații automate
- [ ] Testare pentru toate serviciile
- [ ] Endpoint-uri pentru gestionarea credențialelor
- [ ] Trimitere mesaje prin Meta și Twilio

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 6: Webhooks Service**. 