import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import axios from 'axios';

/**
 * Elixir Notification Tool - trimite notificări către Elixir notification hub
 */
@Injectable()
export class ElixirNotificationTool implements ToolExecutor {
  private readonly logger = new Logger(ElixirNotificationTool.name);
  private readonly elixirUrl: string;

  constructor() {
    this.elixirUrl = process.env.ELIXIR_HTTP_URL || 'http://localhost:4000';
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'send_elixir_notification',
      description: 'Sends a notification to the Elixir notification hub to be delivered via WebSocket to frontend clients. Use this when you need to notify operators or users about AI responses, drafts, or other real-time events.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            businessId: {
              type: 'string',
              description: 'Business ID (tenant_id)',
            },
            userId: {
              type: 'string',
              description: 'User ID to notify',
            },
            sessionId: {
              type: 'string',
              description: 'Session ID for the conversation',
            },
            messageId: {
              type: 'string',
              description: 'Message ID',
            },
            content: {
              type: 'string',
              description: 'The notification content/message',
            },
            context: {
              type: 'object',
              description: 'Additional context data (actions, drafts, etc.)',
            },
            draft: {
              type: 'object',
              description: 'Draft data if creating/updating a draft',
            },
          },
          required: ['businessId', 'userId', 'sessionId', 'content'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters } = input;
    const { businessId, userId, sessionId, messageId, content, context, draft } = parameters;

    try {
      this.logger.log(`📤 Sending notification to Elixir for session: ${sessionId}`);

      const url = `${this.elixirUrl}/api/ai-responses`;
      
      const payload = {
        tenant_id: businessId,
        user_id: userId,
        session_id: sessionId,
        message_id: messageId || `msg_${Date.now()}`,
        content,
        context: context || {},
        draft: draft || null,
        timestamp: new Date().toISOString(),
        type: 'agent.response',
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      this.logger.log(`✅ Notification sent to Elixir successfully`);

      return {
        success: true,
        data: {
          statusCode: response.status,
          messageId: payload.message_id,
          timestamp: payload.timestamp,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to send notification to Elixir:`, error.message);

      return {
        success: false,
        error: error.message,
        data: {
          statusCode: error.response?.status,
        },
      };
    }
  }
}

