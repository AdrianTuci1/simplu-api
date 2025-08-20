import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';

export interface ResourceOperation {
  operation: 'create' | 'update' | 'patch' | 'delete' | 'read' | 'list';
  businessId: string;
  locationId: string;
  resourceType?: string;
  resourceId?: string;
  data?: any; // The actual resource data
  timestamp: string;
  requestId: string;
}

interface AwsConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface KinesisConfig {
  streamName?: string;
}

@Injectable()
export class KinesisService {
  private readonly logger = new Logger(KinesisService.name);
  private readonly kinesisClient: KinesisClient;
  private readonly streamName: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get<AwsConfig>('aws');
    const kinesisConfig = this.configService.get<KinesisConfig>('kinesis');

    // Log configuration for debugging
    this.logger.log(`AWS Region: ${awsConfig?.region || 'us-east-1'}`);
    this.logger.log(`AWS Access Key ID: ${awsConfig?.accessKeyId ? 'Set' : 'Not set'}`);
    this.logger.log(`AWS Secret Access Key: ${awsConfig?.secretAccessKey ? 'Set' : 'Not set'}`);

    const clientConfig: any = {
      region: awsConfig?.region || 'us-east-1',
    };

    // Only add credentials if both are provided
    if (awsConfig?.accessKeyId && awsConfig?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      };
      this.logger.log('Using explicit AWS credentials');
    } else {
      this.logger.log('Using default AWS credential provider chain (IAM roles, environment, etc.)');
    }

    this.kinesisClient = new KinesisClient(clientConfig);
    this.streamName = kinesisConfig?.streamName || 'resources-operations';
  }

  async sendResourceOperation(operation: ResourceOperation): Promise<void> {
    try {
      const partitionKey = operation.resourceType 
        ? `${operation.businessId}-${operation.locationId}-${operation.resourceType}`
        : `${operation.businessId}-${operation.locationId}`;

      const command = new PutRecordCommand({
        StreamName: this.streamName,
        Data: Buffer.from(JSON.stringify(operation)),
        PartitionKey: partitionKey,
      });

      const result = await this.kinesisClient.send(command);

      this.logger.log(
        `Resource operation sent to Kinesis: ${operation.operation} for ${operation.resourceType || 'business-location'} ` +
          `(Business: ${operation.businessId}, Location: ${operation.locationId}) - ` +
          `Sequence: ${result.SequenceNumber}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send resource operation to Kinesis: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async sendBatchResourceOperations(
    operations: ResourceOperation[],
  ): Promise<void> {
    // For batch operations, we'll send them individually for now
    // In production, you might want to use PutRecordsCommand for better performance
    const promises = operations.map((operation) =>
      this.sendResourceOperation(operation),
    );

    await Promise.all(promises);
  }
}
