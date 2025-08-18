import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { citrusShardingService } from '../../../config/citrus-sharding.config';
import { DatabaseService } from './database.service';
import { NotificationService } from '../../notification/notification.service';
import { ResourceEntity } from '../models/resource.entity';

@Injectable()
export class ResourceDataService {
  private readonly logger = new Logger(ResourceDataService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    private readonly databaseService: DatabaseService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) { }

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

  /**
   * Get shard information based on database type
   */
  private async getShardInfo(businessId: string, locationId: string): Promise<{ shardId: string | null; isRDS: boolean }> {
    const dbType = this.configService.get<string>('database.type');
    
    if (dbType === 'rds') {
      // For RDS, we don't need a shard - the primary key is businessId-locationId-resourceId
      return { shardId: null, isRDS: true };
    } else {
      // For Citrus, get the shard from the sharding service
      try {
        const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);
        return { shardId: shardConnection.shardId, isRDS: false };
      } catch (error) {
        this.logger.error(`Failed to get shard for business ${businessId} location ${locationId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Create a resource and save to database
   */
  async createResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    data: any,
  ): Promise<any> {
    try {
      const { shardId, isRDS } = await this.getShardInfo(businessId, locationId);
      
      if (isRDS) {
        this.logger.log(`Creating ${resourceType} in RDS mode using TypeORM`);
      } else {
        this.logger.log(`Using shard ${shardId} for creating ${resourceType}`);
      }

      // Generate resource ID
      const resourceId = `${resourceType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Extract business date for indexing
      const businessDate = this.extractBusinessDate(data, resourceType);

      // Create resource entity
      const resourceEntity = this.resourceRepository.create({
        id: resourceId,
        businessId,
        locationId,
        resourceType,
        resourceId,
        data: data,
        date: businessDate,
        operation: 'create',
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(resourceEntity);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...data,
        createdAt: savedResource.createdAt.toISOString(),
        businessId,
        locationId,
        shardId: shardId,
      };

      // Send notification to Elixir
      await this.notificationService.notifyResourceCreated({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardId,
        data: resourceData,
      });

      this.logger.log(`Created ${resourceType} with ID: ${resourceId} and saved to database using TypeORM`);
      return resourceData;
    } catch (error) {
      this.logger.error(`Error creating ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Update a resource and save to database
   */
  async updateResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ): Promise<any> {
    try {
      const { shardId, isRDS } = await this.getShardInfo(businessId, locationId);
      
      if (isRDS) {
        this.logger.log(`Updating ${resourceType} in RDS mode using TypeORM`);
      } else {
        this.logger.log(`Using shard ${shardId} for updating ${resourceType}`);
      }

      // Extract business date for indexing
      const businessDate = this.extractBusinessDate(data, resourceType);

      // Find existing resource
      const existingResource = await this.resourceRepository.findOne({
        where: { id: resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} not found`);
      }

      // Update resource entity
      Object.assign(existingResource, {
        data: data,
        date: businessDate,
        operation: 'update',
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(existingResource);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...data,
        updatedAt: savedResource.updatedAt.toISOString(),
        businessId,
        locationId,
        shardId: shardId,
      };

      // Send notification to Elixir
      await this.notificationService.notifyResourceUpdated({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardId,
        data: resourceData,
      });

      this.logger.log(`Updated ${resourceType} with ID: ${resourceId} and saved to database using TypeORM`);
      return resourceData;
    } catch (error) {
      this.logger.error(`Error updating ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Delete a resource from database
   */
  async deleteResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      const { shardId, isRDS } = await this.getShardInfo(businessId, locationId);
      
      if (isRDS) {
        this.logger.log(`Deleting ${resourceType} in RDS mode using TypeORM`);
      } else {
        this.logger.log(`Using shard ${shardId} for deleting ${resourceType}`);
      }

      // Find and delete using TypeORM repository
      const existingResource = await this.resourceRepository.findOne({
        where: { id: resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} not found`);
      }

      await this.resourceRepository.remove(existingResource);

      // Send notification to Elixir
      await this.notificationService.notifyResourceDeleted({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardId,
      });

      this.logger.log(`Deleted ${resourceType} with ID: ${resourceId} from database using TypeORM`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Patch a resource (partial update) and save to database
   */
  async patchResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ): Promise<any> {
    try {
      const { shardId, isRDS } = await this.getShardInfo(businessId, locationId);
      
      if (isRDS) {
        this.logger.log(`Patching ${resourceType} in RDS mode using TypeORM`);
      } else {
        this.logger.log(`Using shard ${shardId} for patching ${resourceType}`);
      }

      // Find existing resource using TypeORM repository
      const existingResource = await this.resourceRepository.findOne({
        where: { id: resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} not found`);
      }

      // Merge existing data with patch data
      const mergedData = {
        ...existingResource.data,
        ...data,
      };

      // Extract business date for indexing (use existing date if patching)
      const businessDate = this.extractBusinessDate(data, resourceType) || existingResource.date;

      // Update resource entity
      Object.assign(existingResource, {
        data: mergedData,
        date: businessDate,
        operation: 'patch',
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(existingResource);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...mergedData,
        updatedAt: savedResource.updatedAt.toISOString(),
        businessId,
        locationId,
        shardId: shardId,
      };

      // Send notification to Elixir
      await this.notificationService.notifyResourcePatched({
        resourceType,
        businessId,
        locationId,
        resourceId,
        shardId: shardId,
        data: resourceData,
      });

      this.logger.log(`Patched ${resourceType} with ID: ${resourceId} and saved to database using TypeORM`);
      return resourceData;
    } catch (error) {
      this.logger.error(`Error patching ${resourceType}:`, error);
      throw error;
    }
  }
} 