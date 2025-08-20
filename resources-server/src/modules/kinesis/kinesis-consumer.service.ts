import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, GetRecordsCommand, GetShardIteratorCommand, DescribeStreamCommand, ListShardsCommand } from '@aws-sdk/client-kinesis';
import { ResourceDataService } from '../resources/services/resource-data.service';

export interface KinesisResourceMessage {
  operation: 'create' | 'update' | 'delete' | 'patch';
  resourceType: string;
  businessId: string;
  locationId: string;
  resourceId?: string;
  shardId?: string;
  data?: any;
  timestamp: string;
  requestId?: string;
}

@Injectable()
export class KinesisConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KinesisConsumerService.name);
  private kinesisClient: KinesisClient;
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout;
  private shardIterators: Map<string, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly resourceDataService: ResourceDataService,
  ) {
    this.initializeKinesisClient();
  }

  async onModuleInit() {
    // Log configuration for debugging
    const region = this.configService.get<string>('aws.region');
    const streamName = this.configService.get<string>('kinesis.streamName');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    
    this.logger.log(`Kinesis Consumer Configuration:`);
    this.logger.log(`- AWS Region: ${region || 'us-east-1'}`);
    this.logger.log(`- Stream Name: ${streamName || 'resources-stream'}`);
    this.logger.log(`- AWS Access Key ID: ${accessKeyId ? 'Configured' : 'Not configured (using IAM roles)'}`);
    this.logger.log(`- Database Type: ${this.configService.get<string>('database.type') || 'citrus'}`);
    
    // Additional debug logging
    this.logger.log(`- Raw AWS_REGION env: ${process.env.AWS_REGION}`);
    this.logger.log(`- Raw KINESIS_STREAM_NAME env: ${process.env.KINESIS_STREAM_NAME}`);
    
    await this.startPolling();
  }

  async onModuleDestroy() {
    await this.stopPolling();
  }

  private initializeKinesisClient() {
    const region = this.configService.get<string>('aws.region');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    if (!region) {
      this.logger.warn('AWS region not configured, using default: us-east-1');
    }

    const clientConfig: any = {
      region: region || 'us-east-1',
    };

    // Only add credentials if both are provided
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
      this.logger.log('Using explicit AWS credentials from config');
    } else {
      this.logger.log('Using AWS credential provider chain (IAM roles, environment, etc.)');
    }

    this.kinesisClient = new KinesisClient(clientConfig);
  }

  async startPolling() {
    if (this.isPolling) {
      this.logger.warn('Kinesis polling is already running');
      return;
    }

    const streamName = this.configService.get<string>('kinesis.streamName');
    this.logger.log(`Starting Kinesis consumer polling for stream: ${streamName}`);

    this.isPolling = true;
    this.logger.log('Starting Kinesis consumer polling...');

    try {
      await this.initializeShardIterators();
      this.pollingInterval = setInterval(() => {
        this.pollForRecords();
      }, 1000); // Poll every second
      
      this.logger.log('Kinesis consumer polling started successfully');
    } catch (error) {
      this.logger.error('Error starting Kinesis consumer:', error);
      this.logger.error(`Stream name being used: ${streamName}`);
      this.isPolling = false;
    }
  }

  async stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.logger.log('Kinesis consumer polling stopped');
  }

  private async initializeShardIterators() {
    const streamName = this.configService.get<string>('kinesis.streamName');
    const region = this.configService.get<string>('aws.region');
    
    this.logger.log(`Attempting to connect to Kinesis stream: ${streamName} in region: ${region}`);
    
    try {
      // Get stream description
      const describeCommand = new DescribeStreamCommand({ StreamName: streamName });
      this.logger.log(`Sending DescribeStreamCommand for stream: ${streamName} in region: ${region}`);
      const streamDescription = await this.kinesisClient.send(describeCommand);
      
      // Get all shards
      const listShardsCommand = new ListShardsCommand({ StreamName: streamName });
      const shardsResponse = await this.kinesisClient.send(listShardsCommand);
      
      // Initialize shard iterators
      for (const shard of shardsResponse.Shards || []) {
        const getIteratorCommand = new GetShardIteratorCommand({
          StreamName: streamName,
          ShardId: shard.ShardId,
          ShardIteratorType: 'TRIM_HORIZON', // Start from the beginning of the stream
        });
        
        const iteratorResponse = await this.kinesisClient.send(getIteratorCommand);
        if (iteratorResponse.ShardIterator) {
          this.shardIterators.set(shard.ShardId, iteratorResponse.ShardIterator);
        }
      }
      
      this.logger.log(`Initialized ${this.shardIterators.size} shard iterators`);
    } catch (error) {
      this.logger.error('Error initializing shard iterators:', error);
      throw error;
    }
  }

  private async pollForRecords() {
    if (!this.isPolling) {
      return;
    }

    for (const [shardId, iterator] of this.shardIterators) {
      try {
        const getRecordsCommand = new GetRecordsCommand({
          ShardIterator: iterator,
          Limit: 100,
        });
        
        const response = await this.kinesisClient.send(getRecordsCommand);
        
        if (response.Records && response.Records.length > 0) {
          this.logger.log(`Processing ${response.Records.length} records from shard ${shardId}`);
          
          for (const record of response.Records) {
            await this.processRecord(record);
          }
          
          this.logger.log(`Completed processing ${response.Records.length} records from shard ${shardId}`);
        } else {
          // Log less frequently when no records are found
          if (Math.random() < 0.1) { // Log only 10% of the time
            this.logger.debug(`No new records found in shard ${shardId}`);
          }
        }
        
        // Update shard iterator for next poll
        if (response.NextShardIterator) {
          this.shardIterators.set(shardId, response.NextShardIterator);
        } else {
          // Shard is closed, remove iterator
          this.shardIterators.delete(shardId);
          this.logger.warn(`Shard ${shardId} is closed, removing iterator`);
        }
        
      } catch (error) {
        this.logger.error(`Error polling shard ${shardId}:`, error);
        
        // Try to reinitialize this shard iterator
        try {
          await this.reinitializeShardIterator(shardId);
        } catch (reinitError) {
          this.logger.error(`Error reinitializing shard iterator for ${shardId}:`, reinitError);
        }
      }
    }
  }

  private async reinitializeShardIterator(shardId: string) {
    const streamName = this.configService.get<string>('kinesis.streamName');
    
    try {
      const getIteratorCommand = new GetShardIteratorCommand({
        StreamName: streamName,
        ShardId: shardId,
        ShardIteratorType: 'TRIM_HORIZON',
      });
      
      const iteratorResponse = await this.kinesisClient.send(getIteratorCommand);
      if (iteratorResponse.ShardIterator) {
        this.shardIterators.set(shardId, iteratorResponse.ShardIterator);
        this.logger.log(`Reinitialized shard iterator for ${shardId}`);
      }
    } catch (error) {
      this.logger.error(`Error reinitializing shard iterator for ${shardId}:`, error);
      throw error;
    }
  }

  private async processRecord(record: any) {
    try {
      const data = JSON.parse(Buffer.from(record.Data).toString('utf-8'));
      const message: KinesisResourceMessage = data;
      
      // Validate required fields
      if (!message.businessId || !message.locationId || !message.resourceType || !message.operation) {
        throw new Error(`Invalid message format: missing required fields. Message: ${JSON.stringify(message)}`);
      }
      
      this.logger.log(`Processing ${message.operation} operation for ${message.resourceType}`);
      this.logger.log(`Business: ${message.businessId}, Location: ${message.locationId}, RequestId: ${message.requestId}`);
      
      // Process the message based on operation type
      await this.executeResourceOperation(message);
      
      this.logger.log(`Successfully processed ${message.operation} operation for ${message.resourceType}`);
      
    } catch (error) {
      this.logger.error('Error processing Kinesis record:', error);
      this.logger.error('Record data:', record);
      this.logger.error('Raw record data:', Buffer.from(record.Data).toString('utf-8'));
    }
  }

  private async executeResourceOperation(message: KinesisResourceMessage) {
    const { operation, businessId, locationId, resourceType, resourceId, data } = message;

    try {
      switch (operation) {
        case 'create':
          await this.resourceDataService.createResource(
            businessId,
            locationId,
            resourceType,
            data || {}
          );
          break;

        case 'update':
          if (!resourceId) {
            throw new Error('Resource ID is required for update operation');
          }
          await this.resourceDataService.updateResource(
            businessId,
            locationId,
            resourceType,
            resourceId,
            data || {}
          );
          break;

        case 'patch':
          if (!resourceId) {
            throw new Error('Resource ID is required for patch operation');
          }
          await this.resourceDataService.patchResource(
            businessId,
            locationId,
            resourceType,
            resourceId,
            data || {}
          );
          break;

        case 'delete':
          if (!resourceId) {
            throw new Error('Resource ID is required for delete operation');
          }
          await this.resourceDataService.deleteResource(
            businessId,
            locationId,
            resourceType,
            resourceId
          );
          break;

        default:
          this.logger.warn(`Unknown operation type: ${operation}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Error executing ${operation} operation for ${resourceType}:`, error);
      throw error;
    }
  }
}
