import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';

/**
 * Broadcast Tool - trimite mesaje către clienți WebSocket
 * 
 * Nota: Acest tool va fi injectat cu WebSocketGateway pentru a avea acces la server
 */
@Injectable()
export class BroadcastTool implements ToolExecutor {
  private readonly logger = new Logger(BroadcastTool.name);
  private wsGateway: any = null; // Will be set by ToolsModule

  setWebSocketGateway(gateway: any): void {
    this.wsGateway = gateway;
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'broadcast_websocket_message',
      description: 'Broadcasts a message to WebSocket clients connected to a specific user. Use this to send real-time updates, notifications, or AI responses.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              enum: ['user'],
              description: 'Broadcast target: only "user" is supported',
            },
            businessId: {
              type: 'string',
              description: 'Deprecated: business broadcast not supported',
            },
            userId: {
              type: 'string',
              description: 'User ID to broadcast to (required if target is "user")',
            },
            event: {
              type: 'string',
              description: 'Event name for the WebSocket message',
            },
            data: {
              type: 'object',
              description: 'Payload data to send',
            },
          },
          required: ['target', 'event', 'data'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    const { target, businessId, userId, event, data } = parameters;

    try {
      if (!this.wsGateway) {
        this.logger.error('❌ WebSocket Gateway not initialized');
        return {
          success: false,
          error: 'WebSocket Gateway not available',
        };
      }

      this.logger.log(`📡 Broadcasting to ${target}: ${event}`);

      if (target === 'user') {
        const targetUserId = userId || context.userId;
        this.wsGateway.broadcastToUser(targetUserId, event, data);
        
        this.logger.log(`✅ Broadcast sent to user: ${targetUserId}`);
        
        return {
          success: true,
          data: {
            target: 'user',
            userId: targetUserId,
            event,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        return {
          success: false,
          error: `Invalid broadcast target: ${target}. Only "user" is supported.`,
        };
      }
    } catch (error: any) {
      this.logger.error(`❌ Broadcast failed:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

