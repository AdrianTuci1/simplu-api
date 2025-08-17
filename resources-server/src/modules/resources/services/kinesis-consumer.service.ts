import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KinesisClient, GetRecordsCommand, GetShardIteratorCommand, DescribeStreamCommand, ListShardsCommand } from '@aws-sdk/client-kinesis';
import { DatabaseService } from './database.service';
import { NotificationService } from '../../notification/notification.service';
import { KinesisErrorHandlerService } from '../../kinesis/kinesis-error-handler.service';

export interface KinesisResourceMessage {
  operation: 'create' | 'update' | 'delete' | 'patch';
  resourceType: string;
  businessId: string;
  locationId: string;
  resourceId?: string;
  shardId?: string;
  data?: any;
  timestamp: string;
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
    private readonly databaseService: DatabaseService,
    private readonly notificationService: NotificationService,
    private readonly errorHandler: KinesisErrorHandlerService,
  ) {
    this.initializeKinesisClient();
  }

  /**
   * Extract business date from resource data for indexing
   */
  private extractBusinessDate(data: any, resourceType: string): string {
    // Try common date fields based on resource type and data structure
    const dateFields = [
      'date',
      'appointmentDate', 
      'startDate',
      'reservationDate',
      'checkInDate',
      'eventDate',
      'scheduledDate'
    ];

    for (const field of dateFields) {
      if (data[field]) {
        // Ensure it's in YYYY-MM-DD format
        const date = new Date(data[field]);
        return date.toISOString().split('T')[0];
      }
    }

    // Fallback to current date if no business date found
    return new Date().toISOString().split('T')[0];
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
    const streamName = this.configService.get<string>('kinesis.consumerStreamName');
    
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
          ShardIteratorType: 'LATEST', // Start from latest records
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
    const streamName = this.configService.get<string>('kinesis.consumerStreamName');
    
    try {
      const getIteratorCommand = new GetShardIteratorCommand({
        StreamName: streamName,
        ShardId: shardId,
        ShardIteratorType: 'LATEST',
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
      
      await this.handleResourceOperation(message);
      
    } catch (error) {
      this.logger.error('Error processing Kinesis record:', error);
      this.logger.error('Record data:', record);
    }
  }

  private async handleResourceOperation(message: KinesisResourceMessage) {
    const { operation, resourceType, businessId, locationId, resourceId, data } = message;
    
    try {
      switch (operation) {
        case 'create':
          await this.handleCreateOperation(businessId, locationId, resourceType, resourceId || data.id, data);
          break;
          
        case 'update':
          await this.handleUpdateOperation(businessId, locationId, resourceType, resourceId, data);
          break;
          
        case 'patch':
          await this.handlePatchOperation(businessId, locationId, resourceType, resourceId, data);
          break;
          
        case 'delete':
          await this.handleDeleteOperation(businessId, locationId, resourceType, resourceId);
          break;
          
        default:
          this.logger.warn(`Unknown operation: ${operation}`);
      }
      
      // Send success notification to Elixir
      await this.notificationService.notifyElixir({
        type: 'resource_processed',
        operation,
        resourceType,
        businessId,
        locationId,
        resourceId,
        success: true,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.logger.error(`Error handling ${operation} operation:`, error);
      
      // Send error notification to Elixir
      await this.notificationService.notifyElixir({
        type: 'resource_error',
        operation,
        resourceType,
        businessId,
        locationId,
        resourceId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleCreateOperation(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ) {
    // Extract business date for indexing
    const businessDate = this.extractBusinessDate(data, resourceType);
    
    await this.databaseService.saveResource(
      businessId,
      locationId,
      resourceType,
      resourceId,
      data,
      'create',
      businessDate,
    );
    
    this.logger.log(`Created resource ${resourceId} of type ${resourceType}`);
  }

  private async handleUpdateOperation(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ) {
    // Extract business date for indexing
    const businessDate = this.extractBusinessDate(data, resourceType);
    
    await this.databaseService.saveResource(
      businessId,
      locationId,
      resourceType,
      resourceId,
      data,
      'update',
      businessDate,
    );
    
    this.logger.log(`Updated resource ${resourceId} of type ${resourceType}`);
  }

  private async handlePatchOperation(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ) {
    // For patch operations, we might want to merge with existing data
    const existingResource = await this.databaseService.getResource(businessId, locationId, resourceId);
    
    let mergedData = data;
    if (existingResource && existingResource.data) {
      mergedData = {
        ...existingResource.data,
        ...data,
        updatedAt: new Date().toISOString(),
      };
    }
    
    // Extract business date for indexing (use existing date if patching and no new date provided)
    const businessDate = this.extractBusinessDate(data, resourceType) || existingResource?.date;
    
    await this.databaseService.saveResource(
      businessId,
      locationId,
      resourceType,
      resourceId,
      mergedData,
      'patch',
      businessDate,
    );
    
    this.logger.log(`Patched resource ${resourceId} of type ${resourceType}`);
  }

  private async handleDeleteOperation(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ) {
    await this.databaseService.deleteResource(businessId, locationId, resourceId);
    
    this.logger.log(`Deleted resource ${resourceId} of type ${resourceType}`);
  }
}