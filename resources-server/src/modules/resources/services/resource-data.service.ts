import { Injectable } from '@nestjs/common';
import { citrusShardingService } from '../../../config/citrus-sharding.config';
import { KinesisService } from '../../kinesis/kinesis.service';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class ResourceDataService {

  constructor(
    private readonly kinesisService: KinesisService,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * Create a resource and send to Kinesis stream
   */
  async createResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    data: any,
  ): Promise<any> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      console.log(`Using shard ${shardConnection.shardId} for creating ${resourceType}`);

      // Generate resource ID
      const resourceId = `${resourceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare resource data
      const resourceData = {
        id: resourceId,
        ...data,
        createdAt: new Date().toISOString(),
        businessId,
        locationId,
        shardId: shardConnection.shardId,
      };

      // Send to Kinesis stream for processing
      await this.kinesisService.sendToStream('resources-stream', {
        operation: 'create',
        resourceType,
        businessId,
        locationId,
        shardId: shardConnection.shardId,
        data: resourceData,
        timestamp: new Date().toISOString(),
      });

      // Send notification to Elixir
      await this.notificationService.notifyResourceCreated({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        data: resourceData,
      });

      console.log(`Created ${resourceType} with ID: ${resourceId} and sent to Kinesis`);
      return resourceData;
    } catch (error) {
      console.error(`Error creating ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Update a resource and send to Kinesis stream
   */
  async updateResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ): Promise<any> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      console.log(`Using shard ${shardConnection.shardId} for updating ${resourceType}`);

      // Prepare updated resource data
      const resourceData = {
        id: resourceId,
        ...data,
        updatedAt: new Date().toISOString(),
        businessId,
        locationId,
        shardId: shardConnection.shardId,
      };

      // Send to Kinesis stream for processing
      await this.kinesisService.sendToStream('resources-stream', {
        operation: 'update',
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        data: resourceData,
        timestamp: new Date().toISOString(),
      });

      // Send notification to Elixir
      await this.notificationService.notifyResourceUpdated({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        data: resourceData,
      });

      console.log(`Updated ${resourceType} with ID: ${resourceId} and sent to Kinesis`);
      return resourceData;
    } catch (error) {
      console.error(`Error updating ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Delete a resource and send to Kinesis stream
   */
  async deleteResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      console.log(`Using shard ${shardConnection.shardId} for deleting ${resourceType}`);

      // Send to Kinesis stream for processing
      await this.kinesisService.sendToStream('resources-stream', {
        operation: 'delete',
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        timestamp: new Date().toISOString(),
      });

      // Send notification to Elixir
      await this.notificationService.notifyResourceDeleted({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
      });

      console.log(`Deleted ${resourceType} with ID: ${resourceId} and sent to Kinesis`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Patch a resource (partial update) and send to Kinesis stream
   */
  async patchResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ): Promise<any> {
    try {
      const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
      console.log(`Using shard ${shardConnection.shardId} for patching ${resourceType}`);

      // Prepare patched resource data
      const resourceData = {
        id: resourceId,
        ...data,
        updatedAt: new Date().toISOString(),
        businessId,
        locationId,
        shardId: shardConnection.shardId,
      };

      // Send to Kinesis stream for processing
      await this.kinesisService.sendToStream('resources-stream', {
        operation: 'patch',
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        data: resourceData,
        timestamp: new Date().toISOString(),
      });

      // Send notification to Elixir
      await this.notificationService.notifyResourcePatched({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardConnection.shardId,
        data: resourceData,
      });

      console.log(`Patched ${resourceType} with ID: ${resourceId} and sent to Kinesis`);
      return resourceData;
    } catch (error) {
      console.error(`Error patching ${resourceType}:`, error);
      throw error;
    }
  }
} 