import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import { ExternalApisService } from '../../external-apis/external-apis.service';

/**
 * External API Tool - trimite mesaje prin Meta, Twilio, Gmail, SNS
 */
@Injectable()
export class ExternalApiTool implements ToolExecutor {
  private readonly logger = new Logger(ExternalApiTool.name);

  constructor(private readonly externalApisService: ExternalApisService) {}

  getDefinition(): ToolDefinition {
    return {
      name: 'send_external_message',
      description: 'Sends messages via external APIs like WhatsApp (Meta), SMS (Twilio/SNS), or Email (Gmail). Use this tool when the AI needs to send a message to a customer through their preferred communication channel.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['meta', 'sms', 'email'],
              description: 'The external provider to use (meta for WhatsApp, sms for SMS, email for Gmail)',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number (for meta/sms) or email address (for email)',
            },
            message: {
              type: 'string',
              description: 'The message content to send',
            },
            subject: {
              type: 'string',
              description: 'Email subject (only for email provider)',
            },
            businessId: {
              type: 'string',
              description: 'Business ID to use for credentials lookup',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (for email provider)',
            },
          },
          required: ['provider', 'to', 'message', 'businessId'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    const { provider, to, message, subject, businessId, locationId } = parameters;

    try {
      this.logger.log(`📨 Sending ${provider} message to ${to}`);

      let result: any;

      switch (provider) {
        case 'meta':
          result = await this.externalApisService.sendMetaMessage(
            to,
            message,
            businessId || context.businessId,
          );
          break;

        case 'sms':
          result = await this.externalApisService.sendSMS(
            to,
            message,
            businessId || context.businessId,
          );
          break;

        case 'email':
          result = await this.externalApisService.sendEmailFromGmail(
            businessId || context.businessId,
            locationId || context.locationId,
            to,
            subject || 'Mesaj',
            message,
          );
          break;

        default:
          return {
            success: false,
            error: `Unknown provider: ${provider}`,
          };
      }

      if (result.success) {
        this.logger.log(`✅ ${provider} message sent successfully`);
      } else {
        this.logger.warn(`⚠️ ${provider} message failed: ${result.error}`);
      }

      return {
        success: result.success,
        data: {
          messageId: result.messageId,
          provider,
          to,
        },
        error: result.error,
      };
    } catch (error: any) {
      this.logger.error(`❌ External API tool failed:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

