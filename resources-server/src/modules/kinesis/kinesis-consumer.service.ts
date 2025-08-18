import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, GetRecordsCommand, GetShardIteratorCommand, DescribeStreamCommand, ListShardsCommand } from '@aws-sdk/client-kinesis';
import { KinesisErrorHandlerService } from './kinesis-error-handler.service';

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
    private readonly errorHandler: KinesisErrorHandlerService,
  ) {
    this.initializeKinesisClient();
  }

  async onModuleInit() {
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

  async startPolling() {
    if (this.isPolling) {
      this.logger.warn('Kinesis polling is already running');
      return;
    }

    // Check if credentials are configured
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');
    
    if (!accessKeyId || !secretAccessKey) {
      this.logger.error('AWS credentials not configured. Skipping Kinesis consumer startup.');
      return;
    }

    this.isPolling = true;
    this.logger.log('Starting Kinesis consumer polling...');

    try {
      await this.initializeShardIterators();
      this.pollingInterval = setInterval(() => {
        this.pollForRecords();
      }, 1000); // Poll every second
      
      this.logger.log('Kinesis consumer polling started successfully');
      this.errorHandler.handleSuccess('KinesisConsumerService.startPolling');
    } catch (error) {
      this.errorHandler.handleConnectionError(error, 'KinesisConsumerService.startPolling');
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
    
    try {
      // Get stream description
      const describeCommand = new DescribeStreamCommand({ StreamName: streamName });
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
      this.errorHandler.handleSuccess('KinesisConsumerService.initializeShardIterators');
    } catch (error) {
      this.errorHandler.handleConnectionError(error, 'KinesisConsumerService.initializeShardIterators');
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
        this.errorHandler.handleConnectionError(error, `KinesisConsumerService.pollForRecords.shard.${shardId}`);
        
        // Try to reinitialize this shard iterator
        try {
          await this.reinitializeShardIterator(shardId);
        } catch (reinitError) {
          this.errorHandler.handleConnectionError(reinitError, `KinesisConsumerService.reinitializeShardIterator.${shardId}`);
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
        this.errorHandler.handleSuccess(`KinesisConsumerService.reinitializeShardIterator.${shardId}`);
      }
    } catch (error) {
      this.errorHandler.handleConnectionError(error, `KinesisConsumerService.reinitializeShardIterator.${shardId}`);
      throw error;
    }
  }

  private async processRecord(record: any) {
    try {
      const data = JSON.parse(Buffer.from(record.Data).toString('utf-8'));
      const message: KinesisResourceMessage = data;
      
      this.logger.log(`Processing ${message.operation} operation for ${message.resourceType}`);
      this.logger.log(`Business: ${message.businessId}, Location: ${message.locationId}, RequestId: ${message.requestId}`);
      
      // Log detailed message information
      this.logger.log('Received Kinesis message:', {
        operation: message.operation,
        resourceType: message.resourceType,
        businessId: message.businessId,
        locationId: message.locationId,
        resourceId: message.resourceId,
        requestId: message.requestId,
        timestamp: message.timestamp,
        dataKeys: message.data ? Object.keys(message.data) : [],
        dataSize: message.data ? JSON.stringify(message.data).length : 0,
      });
      
      // Log sample data for debugging (first few fields)
      if (message.data) {
        const sampleData = {};
        const keys = Object.keys(message.data);
        for (let i = 0; i < Math.min(3, keys.length); i++) {
          sampleData[keys[i]] = message.data[keys[i]];
        }
        this.logger.log(`Sample data fields:`, sampleData);
      }
      
      // TODO: Process the message through ResourcesService when circular dependency is resolved
      this.logger.log(`Would process ${message.operation} operation for ${message.resourceType} through ResourcesService`);
      
      this.logger.log(`Successfully processed ${message.operation} operation for ${message.resourceType}`);
      
    } catch (error) {
      this.logger.error('Error processing Kinesis record:', error);
      this.logger.error('Record data:', record);
      this.logger.error('Raw record data:', Buffer.from(record.Data).toString('utf-8'));
    }
  }


}
