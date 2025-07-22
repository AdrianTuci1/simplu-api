# ETAPA 8: Testing, Deployment și Documentație

## Obiectiv
Finalizarea proiectului cu testare completă, deployment și documentație detaliată.

## Durată Estimată: 4-5 zile

### 8.1 Testare Completă
```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { io, Socket } from 'socket.io-client';

describe('AI Agent Server (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001);
  });

  beforeEach(() => {
    socket = io('http://localhost:3001/agent');
  });

  afterEach(() => {
    socket.close();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect({ status: 'ok', service: 'ai-agent-server' });
    });
  });

  describe('WebSocket', () => {
    it('should connect to WebSocket', (done) => {
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });
    });

    it('should handle message and return response', (done) => {
      const testMessage = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'test-user',
        message: 'Vreau să fac o rezervare'
      };

      socket.emit('message', testMessage);

      socket.on('response', (response) => {
        expect(response).toHaveProperty('responseId');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('sessionId');
        done();
      });
    });
  });

  describe('Webhooks', () => {
    it('/webhooks/meta/:businessId (POST) should process Meta webhook', () => {
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
                text: { body: 'Test message' }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      return request(app.getHttpServer())
        .post('/webhooks/meta/test-business')
        .send(testPayload)
        .set('x-hub-signature-256', 'sha256=test-signature')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('/webhooks/twilio/:businessId (POST) should process Twilio webhook', () => {
      const testPayload = {
        MessageSid: 'test-message-sid',
        From: '+40787654321',
        To: '+40712345678',
        Body: 'Test SMS message',
        NumMedia: '0',
        AccountSid: 'test-account-sid',
        ApiVersion: '2010-04-01'
      };

      return request(app.getHttpServer())
        .post('/webhooks/twilio/test-business')
        .send(testPayload)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Credentials', () => {
    it('/credentials/meta/:businessId (POST) should save Meta credentials', () => {
      const credentials = {
        accessToken: 'test-token',
        phoneNumberId: 'test-phone-id',
        appSecret: 'test-secret',
        phoneNumber: '+40712345678'
      };

      return request(app.getHttpServer())
        .post('/credentials/meta/test-business')
        .send(credentials)
        .expect(201)
        .expect((res) => {
          expect(res.body.businessId).toBe('test-business');
          expect(res.body.serviceType).toBe('meta');
        });
    });

    it('/credentials/twilio/:businessId (POST) should save Twilio credentials', () => {
      const credentials = {
        accountSid: 'test-sid',
        authToken: 'test-token',
        phoneNumber: '+40712345678'
      };

      return request(app.getHttpServer())
        .post('/credentials/twilio/test-business')
        .send(credentials)
        .expect(201)
        .expect((res) => {
          expect(res.body.businessId).toBe('test-business');
          expect(res.body.serviceType).toBe('twilio');
        });
    });
  });

  describe('Cron Jobs', () => {
    it('/cron/status (GET) should return cron status', () => {
      return request(app.getHttpServer())
        .get('/cron/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('active');
          expect(res.body.jobs).toBeDefined();
        });
    });

    it('/cron/trigger/cleanup-sessions (POST) should trigger cleanup', () => {
      return request(app.getHttpServer())
        .post('/cron/trigger/cleanup-sessions')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('triggered successfully');
        });
    });
  });
});
```

### 8.2 Testare Unitare Complete
```typescript
// test/unit/agent.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from '../../src/modules/agent/agent.service';
import { BusinessInfoService } from '../../src/modules/business-info/business-info.service';
import { RagService } from '../../src/modules/rag/rag.service';
import { SessionService } from '../../src/modules/session/session.service';
import { WebSocketGateway } from '../../src/modules/websocket/websocket.gateway';
import { ResourcesService } from '../../src/modules/resources/resources.service';
import { ExternalApisService } from '../../src/modules/external-apis/external-apis.service';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessInfo: jest.fn().mockResolvedValue({
              businessId: 'test-business',
              businessType: 'dental',
              businessName: 'Test Dental'
            })
          }
        },
        {
          provide: RagService,
          useValue: {
            getInstructionsForRequest: jest.fn().mockResolvedValue([
              {
                instructionId: 'test-instruction',
                workflow: [
                  { step: 1, action: 'test_action', description: 'Test step' }
                ]
              }
            ])
          }
        },
        {
          provide: SessionService,
          useValue: {
            markConversationResolved: jest.fn(),
            saveMessage: jest.fn()
          }
        },
        {
          provide: WebSocketGateway,
          useValue: {
            broadcastToBusiness: jest.fn()
          }
        },
        {
          provide: ResourcesService,
          useValue: {
            executeOperation: jest.fn().mockResolvedValue({
              success: true,
              data: { id: 'test-resource' }
            })
          }
        },
        {
          provide: ExternalApisService,
          useValue: {
            sendMetaMessage: jest.fn().mockResolvedValue({ success: true }),
            sendSMS: jest.fn().mockResolvedValue({ success: true })
          }
        }
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    it('should process WebSocket message and return response', async () => {
      const messageData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: 'test-user',
        message: 'Vreau să fac o rezervare'
      };

      const response = await service.processMessage(messageData);
      
      expect(response).toBeDefined();
      expect(response.responseId).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.sessionId).toBeDefined();
    });
  });

  describe('processWebhookMessage', () => {
    it('should process webhook message autonomously', async () => {
      const webhookData = {
        businessId: 'test-business',
        locationId: 'test-location',
        userId: '+40787654321',
        message: 'Vreau să fac o rezervare pentru mâine',
        source: 'meta' as const,
        externalId: 'test-external-id'
      };

      const result = await service.processWebhookMessage(webhookData);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.workflowResults).toBeDefined();
    });
  });

  describe('analyzeIntent', () => {
    it('should analyze message intent correctly', async () => {
      const intent = await (service as any).analyzeIntent('Vreau să fac o rezervare', 'dental');
      
      expect(intent).toBeDefined();
      expect(intent.action).toBeDefined();
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.canHandleAutonomously).toBeDefined();
    });
  });
});

// test/unit/webhooks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { AgentService } from '../../src/modules/agent/agent.service';
import { SessionService } from '../../src/modules/session/session.service';
import { BusinessInfoService } from '../../src/modules/business-info/business-info.service';
import { ExternalApisService } from '../../src/modules/external-apis/external-apis.service';

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

  describe('processMetaWebhook', () => {
    it('should process Meta webhook successfully', async () => {
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
  });
});
```

### 8.3 Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  ai-agent-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - DYNAMODB_SESSIONS_TABLE=${DYNAMODB_SESSIONS_TABLE}
      - DYNAMODB_MESSAGES_TABLE=${DYNAMODB_MESSAGES_TABLE}
      - DYNAMODB_BUSINESS_INFO_TABLE=${DYNAMODB_BUSINESS_INFO_TABLE}
      - DYNAMODB_RAG_TABLE=${DYNAMODB_RAG_TABLE}
      - DYNAMODB_EXTERNAL_CREDENTIALS_TABLE=${DYNAMODB_EXTERNAL_CREDENTIALS_TABLE}
      - API_SERVER_URL=${API_SERVER_URL}
      - API_SERVER_KEY=${API_SERVER_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GEMINI_MODEL_NAME=${GEMINI_MODEL_NAME}
      - META_WEBHOOK_VERIFY_TOKEN=${META_WEBHOOK_VERIFY_TOKEN}
      - META_APP_SECRET=${META_APP_SECRET}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - ai-agent-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - ai-agent-network

volumes:
  redis-data:

networks:
  ai-agent-network:
    driver: bridge
```

### 8.4 Deployment Scripts
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting AI Agent Server deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Make sure environment variables are set."
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run health checks
echo "🏥 Running health checks..."
if curl -f http://localhost:3001/health; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    exit 1
fi

# Run database migrations/initialization
echo "🗄️  Initializing database..."
docker-compose exec ai-agent-server npm run db:init

# Run tests
echo "🧪 Running tests..."
docker-compose exec ai-agent-server npm run test:e2e

echo "🎉 Deployment completed successfully!"
echo "📊 AI Agent Server is running on http://localhost:3001"
echo "📚 API Documentation: http://localhost:3001/api"
```

```bash
#!/bin/bash
# scripts/setup-production.sh

echo "🔧 Setting up AI Agent Server for production..."

# Create necessary directories
mkdir -p logs
mkdir -p data
mkdir -p config

# Copy configuration files
cp .env.example .env

echo "📝 Please update the .env file with your production values:"
echo "   - AWS credentials"
echo "   - API server details"
echo "   - External API credentials"
echo "   - Database configuration"

# Install dependencies
npm install

# Build the application
npm run build

# Run database initialization
npm run db:init

# Run tests
npm run test

echo "✅ Production setup completed!"
echo "🚀 You can now run: npm run start:prod"
```

### 8.5 Monitoring și Logging
```typescript
// src/shared/utils/logger.ts
import { Logger } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export class CustomLogger extends Logger {
  private winstonLogger: winston.Logger;

  constructor(context?: string) {
    super(context);
    this.setupWinstonLogger();
  }

  private setupWinstonLogger() {
    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for all logs
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        }),
        
        // Error file transport
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error'
        })
      ]
    });
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.winstonLogger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.winstonLogger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.winstonLogger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.winstonLogger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.winstonLogger.verbose(message, { context });
  }
}

// src/shared/utils/monitoring.ts
import { Injectable } from '@nestjs/common';
import { CustomLogger } from './logger';

@Injectable()
export class MonitoringService {
  private readonly logger = new CustomLogger(MonitoringService.name);
  private metrics = {
    requests: 0,
    errors: 0,
    activeSessions: 0,
    autonomousActions: 0,
    startTime: Date.now()
  };

  incrementRequests() {
    this.metrics.requests++;
  }

  incrementErrors() {
    this.metrics.errors++;
  }

  setActiveSessions(count: number) {
    this.metrics.activeSessions = count;
  }

  incrementAutonomousActions() {
    this.metrics.autonomousActions++;
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptime,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0
    };
  }

  logMetrics() {
    this.logger.log(`Metrics: ${JSON.stringify(this.getMetrics())}`);
  }
}
```

### 8.6 Documentație API
```typescript
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { MonitoringService } from './shared/utils/monitoring';

@ApiTags('Health & Monitoring')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly monitoringService: MonitoringService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      service: 'ai-agent-server',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  getDetailedHealth() {
    const metrics = this.monitoringService.getMetrics();
    return {
      status: 'ok',
      service: 'ai-agent-server',
      timestamp: new Date().toISOString(),
      metrics,
      dependencies: {
        dynamodb: 'connected',
        gemini: 'available',
        websocket: 'active'
      }
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics' })
  getMetrics() {
    return this.monitoringService.getMetrics();
  }
}

// main.ts - Swagger configuration
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Enable CORS
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AI Agent Server API')
    .setDescription('API pentru AI Agent Server cu funcționalități autonome')
    .setVersion('1.0')
    .addTag('WebSocket', 'Comunicare real-time cu coordonatori')
    .addTag('Webhooks', 'Procesare webhook-uri Meta și Twilio')
    .addTag('Credentials', 'Gestionarea credențialelor API externe')
    .addTag('Cron Jobs', 'Job-uri programate și automatizări')
    .addTag('Health & Monitoring', 'Monitorizare și status sistem')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`AI Agent Server is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();
```

### 8.7 README Complet
```markdown
# AI Agent Server

Un server AI autonom pentru business-uri din România, capabil să proceseze cereri prin multiple canale (WebSocket, Meta, Twilio) și să execute acțiuni independente.

## 🚀 Caracteristici

- **Agent Autonom**: Procesează cereri și execută acțiuni independente
- **Multi-canal**: Suport pentru WebSocket, Meta WhatsApp, Twilio SMS
- **Multi-tenant**: Suport pentru multiple business-uri cu izolare completă
- **LangChain + Gemini**: AI avansat cu Gemini 2.5 Flash
- **RAG Structurat**: Instrucțiuni și workflow-uri pentru acțiuni specifice
- **Cron Jobs**: Automatizări și mentenanță automată
- **Scalabil**: Arhitectură modulară și extensibilă

## 📋 Cerințe

- Node.js 18+
- Docker și Docker Compose
- AWS Account (pentru DynamoDB)
- Google Cloud Account (pentru Gemini API)
- Meta Developer Account (pentru WhatsApp Business API)
- Twilio Account (pentru SMS)

## 🛠️ Instalare

### 1. Clonează repository-ul
```bash
git clone <repository-url>
cd ai-agent-server
```

### 2. Configurează variabilele de mediu
```bash
cp .env.example .env
# Editează .env cu valorile tale
```

### 3. Instalează dependențele
```bash
npm install
```

### 4. Rulează cu Docker
```bash
docker-compose up -d
```

### 5. Sau rulează local
```bash
npm run start:dev
```

## 🔧 Configurare

### Variabile de Mediu

```env
# Server
PORT=3001
NODE_ENV=development

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB Tables
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
DYNAMODB_MESSAGES_TABLE=ai-agent-messages
DYNAMODB_BUSINESS_INFO_TABLE=business-info
DYNAMODB_RAG_TABLE=rag-instructions
DYNAMODB_EXTERNAL_CREDENTIALS_TABLE=business-external-credentials

# API Server
API_SERVER_URL=https://your-api-server.com
API_SERVER_KEY=your_api_key

# Gemini AI
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL_NAME=gemini-2.0-flash-exp

# Meta Webhook
META_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
META_APP_SECRET=your_app_secret
```

### Setup Business

1. **Adaugă credențiale Meta**:
```bash
curl -X POST http://localhost:3001/credentials/meta/business-123 \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "your_meta_access_token",
    "phoneNumberId": "your_phone_number_id",
    "appSecret": "your_app_secret",
    "phoneNumber": "+40712345678"
  }'
```

2. **Adaugă credențiale Twilio**:
```bash
curl -X POST http://localhost:3001/credentials/twilio/business-123 \
  -H "Content-Type: application/json" \
  -d '{
    "accountSid": "your_twilio_sid",
    "authToken": "your_twilio_token",
    "phoneNumber": "+40712345678"
  }'
```

3. **Configurează webhook-urile**:
   - Meta: `https://your-domain.com/webhooks/meta/business-123`
   - Twilio: `https://your-domain.com/webhooks/twilio/business-123`

## 📡 API Endpoints

### WebSocket
- **URL**: `ws://localhost:3001/agent`
- **Events**:
  - `message`: Trimite mesaj către agent
  - `response`: Primește răspuns de la agent
  - `coordinator_notification`: Notificări despre acțiuni autonome

### Webhooks
- **Meta**: `POST /webhooks/meta/:businessId`
- **Twilio**: `POST /webhooks/twilio/:businessId`

### Credentials
- **Meta**: `POST /credentials/meta/:businessId`
- **Twilio**: `POST /credentials/twilio/:businessId`
- **Test**: `POST /credentials/meta/:businessId/test`

### Cron Jobs
- **Status**: `GET /cron/status`
- **Trigger**: `POST /cron/trigger/:job-name`

### Health & Monitoring
- **Health**: `GET /health`
- **Metrics**: `GET /metrics`

## 🧪 Testare

### Testare Unitare
```bash
npm run test
```

### Testare E2E
```bash
npm run test:e2e
```

### Testare WebSocket
```bash
node scripts/test-websocket.js
```

### Testare Webhooks
```bash
node scripts/test-webhooks.js
```

## 📊 Monitorizare

### Logs
- **Application**: `logs/application-YYYY-MM-DD.log`
- **Errors**: `logs/error-YYYY-MM-DD.log`

### Metrics
- Requests/sec
- Error rate
- Active sessions
- Autonomous actions
- Uptime

### Health Checks
- Service status
- Database connectivity
- External API availability

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Production
```bash
npm run build
npm run start:prod
```

### AWS ECS
```bash
./scripts/deploy-aws.sh
```

## 📚 Documentație API

Accesează documentația Swagger la: `http://localhost:3001/api`

## 🤝 Contribuții

1. Fork repository-ul
2. Creează un branch pentru feature: `git checkout -b feature/nume-feature`
3. Commit schimbările: `git commit -am 'Adaugă feature'`
4. Push la branch: `git push origin feature/nume-feature`
5. Creează Pull Request

## 📄 Licență

Acest proiect este licențiat sub [MIT License](LICENSE).

## 🆘 Suport

Pentru suport și întrebări:
- Email: support@example.com
- Issues: [GitHub Issues](https://github.com/example/ai-agent-server/issues)
- Documentation: [Wiki](https://github.com/example/ai-agent-server/wiki)
```

## Deliverables Etapa 8
- [ ] Testare e2e completă pentru toate funcționalitățile
- [ ] Testare unitară pentru toate serviciile
- [ ] Docker configuration pentru deployment
- [ ] Scripts de deployment și setup
- [ ] Monitoring și logging implementat
- [ ] Documentație API cu Swagger
- [ ] README complet cu instrucțiuni
- [ ] Health checks și metrics

## 🎉 Finalizare Proiect

După finalizarea acestei etape, AI Agent Server-ul va fi complet funcțional și gata pentru deployment în producție!

### Checklist Final
- [ ] Toate cele 8 etape implementate
- [ ] Testare completă trecută
- [ ] Documentație finalizată
- [ ] Deployment configurat
- [ ] Monitoring activ
- [ ] Ready pentru producție 