# ETAPA 1: Setup Proiect și Configurare de Bază

## Obiectiv
Configurarea proiectului AI Agent Server cu structura de bază, dependențe și configurare inițială.

## Durată Estimată: 3-4 zile

### 1.1 Setup Proiect NestJS
```bash
# Creare structură de bază
mkdir -p ai-agent-server/src/{config,modules,shared}
cd ai-agent-server

# Inițializare package.json cu dependențe
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/config @nestjs/platform-express
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
npm install @google/generative-ai langchain lang-graph
npm install twilio @nestjs/schedule
npm install class-validator class-transformer
npm install reflect-metadata rxjs

# Dev dependencies
npm install -D @nestjs/cli @nestjs/testing
npm install -D typescript @types/node
npm install -D jest @types/jest ts-jest
npm install -D eslint prettier
```

### 1.2 Configurare TypeScript
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 1.3 Configurare Variabile de Mediu
```env
# .env.example
# Server Configuration
PORT=3001
NODE_ENV=development

# AWS Configuration
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

# External APIs (Global defaults)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
META_ACCESS_TOKEN=your_meta_token
META_PHONE_NUMBER_ID=your_phone_number_id

# Meta Webhook Configuration
META_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
META_APP_SECRET=your_app_secret

# LangChain Configuration - Gemini 2.5 Flash
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL_NAME=gemini-2.0-flash-exp
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.1
GEMINI_TOP_P=0.8
GEMINI_TOP_K=40

# Redis (pentru cache)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

### 1.4 Structura de Bază a Fișierelor
```
ai-agent-server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── config/
│   │   ├── configuration.ts
│   │   ├── dynamodb.config.ts
│   │   ├── websocket.config.ts
│   │   ├── langchain.config.ts
│   │   └── gemini.config.ts
│   ├── modules/
│   │   ├── websocket/
│   │   ├── session/
│   │   ├── agent/
│   │   ├── business-info/
│   │   ├── rag/
│   │   ├── resources/
│   │   ├── webhooks/
│   │   ├── cron/
│   │   └── external-apis/
│   └── shared/
│       ├── interfaces/
│       ├── utils/
│       └── constants/
├── test/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### 1.5 Configurare DynamoDB
```typescript
// src/config/dynamodb.config.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

export const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

export const tableNames = {
  sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
  messages: process.env.DYNAMODB_MESSAGES_TABLE || 'ai-agent-messages',
  businessInfo: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
  ragInstructions: process.env.DYNAMODB_RAG_TABLE || 'rag-instructions',
  externalCredentials: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
};
```

### 1.6 Configurare Gemini
```typescript
// src/config/gemini.config.ts
export const geminiConfig = {
  modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp',
  maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.1'),
  topP: parseFloat(process.env.GEMINI_TOP_P || '0.8'),
  topK: parseInt(process.env.GEMINI_TOP_K || '40'),
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ],
  systemPrompt: `
    Ești un asistent AI specializat pentru business-uri din România.
    Te ocupi de:
    - Programări și rezervări
    - Gestionarea clienților
    - Operații pe resurse business
    - Comunicare prin SMS, email, WhatsApp
    - Răspunsuri în limba română
    
    Răspunsurile tale trebuie să fie:
    - Prietenoase și profesionale
    - Specific pentru tipul de business
    - În limba română
    - Concise și utile
  `
};
```

### 1.7 App Module de Bază
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 1.8 Main.ts
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
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

  // Start the server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`AI Agent Server is running on: http://localhost:${port}`);
}

bootstrap();
```

### 1.9 Scripts Package.json
```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### 1.10 Testare Setup
```bash
# Testare build
npm run build

# Testare start development
npm run start:dev

# Testare că serverul pornește și răspunde
curl http://localhost:3001
```

## Deliverables Etapa 1
- [ ] Proiect NestJS configurat cu toate dependențele
- [ ] Configurare TypeScript și ESLint
- [ ] Variabile de mediu configurate
- [ ] Configurare DynamoDB și Gemini
- [ ] Structura de bază a fișierelor
- [ ] Server pornește și răspunde la request-uri
- [ ] Testare că toate dependențele funcționează

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 2: WebSocket Gateway și Session Management**. 