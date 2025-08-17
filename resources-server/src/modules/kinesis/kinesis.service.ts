import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { KinesisErrorHandlerService } from './kinesis-error-handler.service';

@Injectable()
export class KinesisService {
  private readonly logger = new Logger(KinesisService.name);
  private readonly kinesisClient: KinesisClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly errorHandler: KinesisErrorHandlerService,
  ) {
    const region = this.configService.get<string>('aws.region');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    if (!region) {
      this.logger.warn('AWS region not configured, using default: us-east-1');
    }

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not fully configured. Kinesis operations may fail.');
    }

    this.kinesisClient = new KinesisClient({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Send data to a Kinesis stream
   */
  async sendToStream(streamName: string, data: any): Promise<void> {
    // Check if credentials are configured
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');
    
    if (!accessKeyId || !secretAccessKey) {
      const error = new Error('AWS credentials not configured');
      this.errorHandler.handleConnectionError(error, 'KinesisService.sendToStream');
      throw error;
    }

    try {
      const record = {
        StreamName: streamName,
        Data: Buffer.from(JSON.stringify(data)),
        PartitionKey: this.generatePartitionKey(data),
      };

      const command = new PutRecordCommand(record);
      const result = await this.kinesisClient.send(command);

      this.logger.log(`Successfully sent data to stream ${streamName}, sequence: ${result.SequenceNumber}`);
      this.errorHandler.handleSuccess('KinesisService.sendToStream');
    } catch (error) {
      this.errorHandler.handleConnectionError(error, 'KinesisService.sendToStream');
      throw error;
    }
  }

  /**
   * Generate partition key based on data content
   */
  private generatePartitionKey(data: any): string {
    // Use businessId and locationId if available, otherwise use timestamp
    if (data.businessId && data.locationId) {
      return `${data.businessId}-${data.locationId}`;
    }
    
    if (data.businessId) {
      return data.businessId;
    }

    // Fallback to timestamp-based partition key
    return Date.now().toString();
  }

  /**
   * Send resource operation to resources stream
   */
  async sendResourceOperation(operation: string, resourceData: any): Promise<void> {
    const streamName = this.configService.get<string>('kinesis.streamName', 'resources-stream');
    await this.sendToStream(streamName, {
      ...resourceData,
      operation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification to Elixir
   */
  async sendElixirNotification(notificationData: any): Promise<void> {
    const streamName = this.configService.get<string>('kinesis.elixirStreamName', 'elixir-notifications');
    await this.sendToStream(streamName, {
      ...notificationData,
      timestamp: new Date().toISOString(),
    });
  }
} 