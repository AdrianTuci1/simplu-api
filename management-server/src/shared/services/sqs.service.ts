import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export interface ShardCreationMessage {
  businessId: string;
  locationId: string;
  businessType: string;
  shardId: string;
  connectionString: string;
  timestamp: string;
}

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.queueUrl = this.configService.get('SQS_SHARD_CREATION_QUEUE_URL');
  }

  async sendShardCreationMessage(message: ShardCreationMessage): Promise<void> {
    try {
      if (!this.queueUrl) {
        this.logger.warn('SQS queue URL not configured, skipping message send');
        return;
      }

      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          'MessageType': {
            DataType: 'String',
            StringValue: 'SHARD_CREATION'
          },
          'BusinessId': {
            DataType: 'String',
            StringValue: message.businessId
          },
          'LocationId': {
            DataType: 'String',
            StringValue: message.locationId
          }
        }
      });

      await this.sqsClient.send(command);
      this.logger.log(`Shard creation message sent for business ${message.businessId}, location ${message.locationId}`);
    } catch (error) {
      this.logger.error(`Failed to send SQS message: ${error.message}`, error.stack);
      throw new Error(`Failed to send shard creation message: ${error.message}`);
    }
  }

  async sendBatchShardCreationMessages(messages: ShardCreationMessage[]): Promise<void> {
    try {
      if (!this.queueUrl) {
        this.logger.warn('SQS queue URL not configured, skipping batch message send');
        return;
      }

      // Process messages in batches of 10 (SQS limit)
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        const promises = batch.map(message => this.sendShardCreationMessage(message));
        await Promise.all(promises);
      }

      this.logger.log(`Successfully sent ${messages.length} shard creation messages`);
    } catch (error) {
      this.logger.error(`Failed to send batch SQS messages: ${error.message}`, error.stack);
      throw new Error(`Failed to send batch shard creation messages: ${error.message}`);
    }
  }
} 