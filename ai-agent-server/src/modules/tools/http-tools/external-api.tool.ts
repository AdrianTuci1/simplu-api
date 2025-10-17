import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import { ExternalApisService } from '../../external-apis/external-apis.service';
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';

/**
 * External API Tool - trimite mesaje prin Meta, Twilio, Gmail, SNS
 */
@Injectable()
export class ExternalApiTool implements ToolExecutor {
  private readonly logger = new Logger(ExternalApiTool.name);

  constructor(
    private readonly externalApisService: ExternalApisService,
    private readonly kinesisLogger: KinesisLoggerService,
  ) {}

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

    const finalBusinessId = businessId || context.businessId;
    const finalLocationId = locationId || context.locationId;

    try {
      this.logger.log(`📨 Sending ${provider} message to ${to} (Agent session: ${context.sessionId})`);

      let result: any;
      let actionType: 'sms' | 'email' | 'meta_message';
      let providerType: 'twilio' | 'aws_sns' | 'meta' | 'gmail' | 'smtp';

      switch (provider) {
        case 'meta':
          actionType = 'meta_message';
          providerType = 'meta';
          result = await this.externalApisService.sendMetaMessage(
            to,
            message,
            finalBusinessId,
          );
          break;

        case 'sms':
          actionType = 'sms';
          providerType = 'aws_sns'; // Default provider
          result = await this.externalApisService.sendSMS(
            to,
            message,
            finalBusinessId,
          );
          break;

        case 'email':
          actionType = 'email';
          providerType = 'gmail';
          result = await this.externalApisService.sendEmailFromGmail(
            finalBusinessId,
            finalLocationId,
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

      // 📊 LOG to Kinesis - doar dacă a fost inițiat de agent
      if (actionType === 'sms') {
        await this.kinesisLogger.logAgentSms({
          businessId: finalBusinessId,
          locationId: finalLocationId,
          agentSessionId: context.sessionId,
          recipient: { 
            phone: to,
            userId: context.userId, // poate fi useful pentru tracking
          },
          provider: providerType as 'twilio' | 'aws_sns',
          success: result.success,
          externalId: result.messageId,
          messageLength: message.length,
          errorMessage: result.error,
        });
      } else if (actionType === 'email') {
        await this.kinesisLogger.logAgentEmail({
          businessId: finalBusinessId,
          locationId: finalLocationId,
          agentSessionId: context.sessionId,
          recipient: { 
            email: to,
            userId: context.userId,
          },
          provider: providerType as 'gmail' | 'smtp',
          success: result.success,
          externalId: result.messageId,
          subject: subject || 'Mesaj',
          errorMessage: result.error,
        });
      } else if (actionType === 'meta_message') {
        await this.kinesisLogger.logAgentMetaMessage({
          businessId: finalBusinessId,
          locationId: finalLocationId,
          agentSessionId: context.sessionId,
          recipient: { 
            phone: to,
            userId: context.userId,
          },
          success: result.success,
          externalId: result.messageId,
          messageLength: message.length,
          errorMessage: result.error,
        });
      }

      if (result.success) {
        this.logger.log(`✅ ${provider} message sent successfully and logged to Kinesis`);
      } else {
        this.logger.warn(`⚠️ ${provider} message failed: ${result.error} (logged to Kinesis)`);
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

      // Log failure to Kinesis
      try {
        if (provider === 'sms') {
          await this.kinesisLogger.logAgentSms({
            businessId: finalBusinessId,
            locationId: finalLocationId,
            agentSessionId: context.sessionId,
            recipient: { phone: to, userId: context.userId },
            provider: 'aws_sns',
            success: false,
            errorMessage: error.message,
          });
        } else if (provider === 'email') {
          await this.kinesisLogger.logAgentEmail({
            businessId: finalBusinessId,
            locationId: finalLocationId,
            agentSessionId: context.sessionId,
            recipient: { email: to, userId: context.userId },
            provider: 'gmail',
            success: false,
            errorMessage: error.message,
          });
        } else if (provider === 'meta') {
          await this.kinesisLogger.logAgentMetaMessage({
            businessId: finalBusinessId,
            locationId: finalLocationId,
            agentSessionId: context.sessionId,
            recipient: { phone: to, userId: context.userId },
            success: false,
            errorMessage: error.message,
          });
        }
      } catch (logError) {
        this.logger.warn(`Failed to log error to Kinesis: ${logError.message}`);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

