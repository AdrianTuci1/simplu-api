import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import WebSocket from 'ws';
import { AppModule } from '../src/app.module';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let client: WebSocket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001);
  });

  beforeEach(() => {
    client = new WebSocket('ws://localhost:3001/socket/websocket');
  });

  afterEach(() => {
    client.close();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to WebSocket', (done) => {
    client.on('open', () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
      done();
    });
  });

  it('should handle Phoenix join and message', (done) => {
    client.on('open', () => {
      // Join Phoenix channel
      const joinMessage = {
        event: 'phx_join',
        topic: 'messages:test-business',
        payload: { businessId: 'test-business', userId: 'test-user' },
        ref: '1'
      };
      
      client.send(JSON.stringify(joinMessage));
      
      // Send message
      const testMessage = {
        event: 'new_message',
        topic: 'messages:test-business',
        payload: {
          businessId: 'test-business',
          locationId: 'test-location',
          userId: 'test-user',
          message: 'Test message'
        }
      };
      
      client.send(JSON.stringify(testMessage));
    });

    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.event === 'new_message') {
        expect(message.payload).toHaveProperty('responseId');
        expect(message.payload).toHaveProperty('message');
        expect(message.payload).toHaveProperty('sessionId');
        done();
      }
    });
  });
}); 