# ETAPA 2: WebSocket Gateway și Session Management

## Obiectiv
Implementarea sistemului de comunicare WebSocket pentru coordonatori și gestionarea sesiunilor de conversație în DynamoDB.

## Durată Estimată: 4-5 zile

### 2.1 Interfețe și DTO-uri
```typescript
// src/shared/interfaces/message.interface.ts
export interface MessageDto {
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId?: string;
  timestamp?: string;
}

export interface AgentResponse {
  responseId: string;
  message: string;
  actions: AgentAction[];
  timestamp: string;
  sessionId: string;
}

export interface AgentAction {
  type: string;
  status: 'success' | 'failed' | 'pending';
  details: any;
}

// src/shared/interfaces/session.interface.ts
export interface Session {
  sessionId: string;           // Partition Key
  businessId: string;          // Sort Key
  locationId: string;
  userId: string;
  status: 'active' | 'closed' | 'resolved';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata: {
    businessType: string;
    context: any;
  };
}

export interface Message {
  messageId: string;           // Partition Key
  sessionId: string;           // Sort Key
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: string;
  metadata: {
    source: 'websocket' | 'webhook' | 'cron';
    externalId?: string;
  };
}
```

### 2.2 WebSocket Gateway
```typescript
// src/modules/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';

@WebSocketGateway({
  cors: true,
  namespace: '/agent',
  transports: ['websocket', 'polling']
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map pentru a ține evidența conexiunilor per user/business
  private connections = new Map<string, Socket>();

  @SubscribeMessage('connect')
  async handleConnection(
    @ConnectedSocket() client: Socket,
    @MessageBody() authData: { businessId: string; userId: string }
  ) {
    const connectionKey = `${authData.businessId}:${authData.userId}`;
    this.connections.set(connectionKey, client);
    
    // Join la room-ul specific business-ului
    client.join(`business:${authData.businessId}`);
    client.join(`user:${authData.userId}`);
    
    console.log(`Client connected: ${connectionKey}`);
  }

  @SubscribeMessage('disconnect')
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    // Găsire și ștergere conexiune
    for (const [key, socket] of this.connections.entries()) {
      if (socket === client) {
        this.connections.delete(key);
        console.log(`Client disconnected: ${key}`);
        break;
      }
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: MessageDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      console.log(`Received message from ${data.userId} in business ${data.businessId}: ${data.message}`);
      
      // Procesare mesaj prin agent (va fi implementat în etapa următoare)
      const response: AgentResponse = {
        responseId: this.generateResponseId(),
        message: `Răspuns temporar pentru: ${data.message}`,
        actions: [],
        timestamp: new Date().toISOString(),
        sessionId: data.sessionId || this.generateSessionId(data)
      };
      
      // Trimitere răspuns către client
      client.emit('response', response);
      
      // Broadcast către toți coordonatorii business-ului (opțional)
      this.server.to(`business:${data.businessId}`).emit('message_processed', {
        userId: data.userId,
        message: data.message,
        responseId: response.responseId,
        timestamp: response.timestamp
      });
      
    } catch (error) {
      console.error('Error processing message:', error);
      client.emit('error', {
        message: 'Eroare la procesarea mesajului',
        error: error.message
      });
    }
  }

  // Metode pentru broadcasting
  broadcastToBusiness(businessId: string, event: string, data: any) {
    this.server.to(`business:${businessId}`).emit(event, data);
  }

  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(data: MessageDto): string {
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }
}

// src/modules/websocket/websocket.module.ts
import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

@Module({
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
```

### 2.3 Session Service
```typescript
// src/modules/session/session.service.ts
import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Session, Message } from '@/shared/interfaces/session.interface';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

@Injectable()
export class SessionService {
  private dynamoClient = dynamoDBClient;

  async createSession(
    businessId: string,
    locationId: string,
    userId: string,
    businessType: string
  ): Promise<Session> {
    const sessionId = `${businessId}:${userId}:${Date.now()}`;
    
    const session: Session = {
      sessionId,
      businessId,
      locationId,
      userId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      metadata: {
        businessType,
        context: {}
      }
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.sessions,
      Item: marshall(session)
    }));

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.sessions,
        Key: marshall({ sessionId })
      }));

      return result.Item ? unmarshall(result.Item) as Session : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async getActiveSessionsForBusiness(businessId: string): Promise<Session[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.sessions,
        KeyConditionExpression: 'businessId = :businessId',
        FilterExpression: 'status = :status',
        ExpressionAttributeValues: marshall({
          ':businessId': businessId,
          ':status': 'active'
        })
      }));

      return result.Items ? result.Items.map(item => unmarshall(item) as Session) : [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach(key => {
      if (key !== 'sessionId' && key !== 'businessId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    if (updateExpression.length === 0) return;

    await this.dynamoClient.send(new UpdateCommand({
      TableName: tableNames.sessions,
      Key: marshall({ sessionId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues)
    }));
  }

  async markConversationResolved(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'resolved',
      updatedAt: new Date().toISOString()
    });
  }

  async saveMessage(message: Message): Promise<void> {
    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.messages,
      Item: marshall(message)
    }));

    // Actualizare timestamp ultimului mesaj în sesiune
    await this.updateSession(message.sessionId, {
      lastMessageAt: message.timestamp
    });
  }

  async getSessionMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.messages,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: marshall({
          ':sessionId': sessionId
        }),
        ScanIndexForward: false, // Cele mai recente primele
        Limit: limit
      }));

      return result.Items ? result.Items.map(item => unmarshall(item) as Message) : [];
    } catch (error) {
      console.error('Error getting session messages:', error);
      return [];
    }
  }

  async cleanupResolvedSessions(): Promise<void> {
    // Implementare cleanup pentru sesiuni rezolvate mai vechi de 30 de zile
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query pentru sesiuni rezolvate vechi
    // Implementare conform strategiei de cleanup
  }
}

// src/modules/session/session.module.ts
import { Module } from '@nestjs/common';
import { SessionService } from './session.service';

@Module({
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
```

### 2.4 Configurare WebSocket
```typescript
// src/config/websocket.config.ts
export const websocketConfig = {
  cors: {
    origin: true,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling'],
  namespace: '/agent'
};
```

### 2.5 Testare WebSocket
```typescript
// test/websocket.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let client: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001);
  });

  beforeEach(() => {
    client = io('http://localhost:3001/agent');
  });

  afterEach(() => {
    client.close();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to WebSocket', (done) => {
    client.on('connect', () => {
      expect(client.connected).toBe(true);
      done();
    });
  });

  it('should handle message and return response', (done) => {
    const testMessage = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Test message'
    };

    client.emit('message', testMessage);

    client.on('response', (response) => {
      expect(response).toHaveProperty('responseId');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('sessionId');
      done();
    });
  });
});
```

### 2.6 Client Test pentru WebSocket
```html
<!-- test-websocket.html -->
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test Client</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>AI Agent WebSocket Test</h1>
    
    <div>
        <label>Business ID:</label>
        <input type="text" id="businessId" value="test-business">
    </div>
    
    <div>
        <label>Location ID:</label>
        <input type="text" id="locationId" value="test-location">
    </div>
    
    <div>
        <label>User ID:</label>
        <input type="text" id="userId" value="test-user">
    </div>
    
    <div>
        <label>Message:</label>
        <input type="text" id="message" value="Salut! Vreau să fac o rezervare">
        <button onclick="sendMessage()">Send</button>
    </div>
    
    <div id="responses"></div>

    <script>
        const socket = io('http://localhost:3001/agent');
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            document.getElementById('responses').innerHTML += '<p>Connected!</p>';
        });
        
        socket.on('response', (response) => {
            console.log('Received response:', response);
            document.getElementById('responses').innerHTML += 
                `<p><strong>Response:</strong> ${response.message}</p>`;
        });
        
        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            document.getElementById('responses').innerHTML += 
                `<p style="color: red;"><strong>Error:</strong> ${error.message}</p>`;
        });
        
        function sendMessage() {
            const message = {
                businessId: document.getElementById('businessId').value,
                locationId: document.getElementById('locationId').value,
                userId: document.getElementById('userId').value,
                message: document.getElementById('message').value
            };
            
            socket.emit('message', message);
            document.getElementById('responses').innerHTML += 
                `<p><strong>Sent:</strong> ${message.message}</p>`;
        }
    </script>
</body>
</html>
```

### 2.7 Actualizare App Module
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WebSocketModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Deliverables Etapa 2
- [ ] WebSocket Gateway implementat cu autentificare
- [ ] Session Service cu operații CRUD în DynamoDB
- [ ] Gestionarea conexiunilor multiple per business
- [ ] Salvare și recuperare mesaje în DynamoDB
- [ ] Testare WebSocket cu client HTML
- [ ] Testare e2e pentru WebSocket
- [ ] Gestionarea stării sesiunilor (active, closed, resolved)

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 3: Business Info Service și RAG Service**. 