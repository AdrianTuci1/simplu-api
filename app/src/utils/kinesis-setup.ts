import {
  KinesisClient,
  CreateStreamCommand,
  DescribeStreamCommand,
} from '@aws-sdk/client-kinesis';
import { ConfigService } from '@nestjs/config';

interface AwsConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface KinesisConfig {
  streamName?: string;
  shardCount?: number;
}

export class KinesisSetup {
  private kinesisClient: KinesisClient;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;

    const awsConfig = this.configService.get<AwsConfig>('aws');

    this.kinesisClient = new KinesisClient({
      region: awsConfig?.region || 'us-east-1',
      ...(awsConfig?.accessKeyId &&
        awsConfig?.secretAccessKey && {
          credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
          },
        }),
    });
  }

  async ensureStreamExists(): Promise<void> {
    const kinesisConfig = this.configService.get<KinesisConfig>('kinesis');
    const streamName = kinesisConfig?.streamName || 'resources-operations';
    const shardCount = kinesisConfig?.shardCount || 1;

    try {
      // Check if stream exists
      const describeCommand = new DescribeStreamCommand({
        StreamName: streamName,
      });

      const response = await this.kinesisClient.send(describeCommand);
      console.log(
        `Kinesis stream '${streamName}' already exists with status: ${response.StreamDescription?.StreamStatus}`,
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === 'ResourceNotFoundException'
      ) {
        // Stream doesn't exist, create it
        console.log(
          `Creating Kinesis stream '${streamName}' with ${shardCount} shard(s)...`,
        );

        const createCommand = new CreateStreamCommand({
          StreamName: streamName,
          ShardCount: shardCount,
        });

        await this.kinesisClient.send(createCommand);
        console.log(
          `Kinesis stream '${streamName}' creation initiated. It may take a few minutes to become active.`,
        );
      } else {
        console.error('Error checking Kinesis stream:', error);
        throw error;
      }
    }
  }
}
