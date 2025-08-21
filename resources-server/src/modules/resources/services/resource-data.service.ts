import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { citrusShardingService } from '../../../config/citrus-sharding.config';
import { DatabaseService } from './database.service';
import { ResourceIdService } from './resource-id.service';
import { NotificationService } from '../../notification/notification.service';
import { ResourceEntity } from '../models/resource.entity';

@Injectable()
export class ResourceDataService {
  private readonly logger = new Logger(ResourceDataService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    private readonly databaseService: DatabaseService,
    private readonly resourceIdService: ResourceIdService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Extract start and end dates from resource data
   */
  private extractDates(data: any, resourceType: string): { startDate: string | null; endDate: string | null } {
    // Try common date fields based on resource type and data structure
    const startDateFields = [
      'startDate',
      'appointmentDate', 
      'reservationDate',
      'checkInDate',
      'eventDate',
      'scheduledDate',
      'date'
    ];

    const endDateFields = [
      'endDate',
      'checkOutDate',
      'endDate',
      'finishDate',
      'dueDate'
    ];

    let startDate: string | null = null;
    let endDate: string | null = null;

    // Find start date
    for (const field of startDateFields) {
      if (data[field]) {
        const date = new Date(data[field]);
        startDate = date.toISOString().split('T')[0];
        break;
      }
    }

    // Find end date
    for (const field of endDateFields) {
      if (data[field]) {
        const date = new Date(data[field]);
        endDate = date.toISOString().split('T')[0];
        break;
      }
    }

    // If no end date found, use start date as end date
    if (!endDate && startDate) {
      endDate = startDate;
    }

    // Fallback to current date if no dates found
    if (!startDate) {
      const today = new Date().toISOString().split('T')[0];
      startDate = today;
      endDate = today;
    }

    return { startDate, endDate };
  }

  /**
   * Get shard information based on database type
   */
  private async getShardInfo(businessId: string, locationId: string): Promise<{ shardId: string | null; isRDS: boolean }> {
    const dbType = this.configService.get<string>('database.type');
    
    if (dbType === 'rds') {
      return { shardId: null, isRDS: true };
    } else {
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

      // Extract dates based on resource type
      let startDate: string | null = null;
      let endDate: string | null = null;
      
      if (resourceType === 'timeline') {
        // Timeline needs both startDate and endDate
        const extractedDates = this.extractDates(data, resourceType);
        startDate = extractedDates.startDate || null;
        endDate = extractedDates.endDate || null;
      } else if (['invoices', 'activities', 'reports', 'sales', 'classes', 'history'].includes(resourceType)) {
        // These resource types need only startDate
        const extractedDates = this.extractDates(data, resourceType);
        startDate = extractedDates.startDate || null;
        endDate = null; // No endDate for these types
      }
      // For other resource types (patients, clients, members, staff, etc.), no dates are needed

      // Generate resource ID first to check for duplicates
      const connection = await this.databaseService.getConnection(businessId, locationId);
      const resourceId = await this.resourceIdService.generateResourceId(
        businessId,
        locationId,
        resourceType,
        connection.pool
      );

      // Check if resource with this specific resourceId already exists
      const existingResource = await this.resourceRepository.findOne({
        where: { businessId, locationId, resourceId }
      });

      if (existingResource) {
        this.logger.log(`Resource with ID ${resourceId} already exists for ${businessId}/${locationId}, skipping creation`);
        return {
          id: existingResource.resourceId,
          ...existingResource.data,
          startDate: existingResource.startDate,
          endDate: existingResource.endDate,
          createdAt: existingResource.createdAt.toISOString(),
          businessId,
          locationId,
          shardId: existingResource.shardId,
        };
      }

      // Resource ID already generated above

      // Create resource entity
      const resourceEntity = this.resourceRepository.create({
        businessId,
        locationId,
        resourceType,
        resourceId,
        data, // Salvează câmpul data cu JSON-ul complet
        startDate,
        endDate,
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(resourceEntity);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...data,
        startDate,
        endDate,
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

      // Extract dates based on resource type
      let startDate: string | null = null;
      let endDate: string | null = null;
      
      if (resourceType === 'timeline') {
        // Timeline needs both startDate and endDate
        const extractedDates = this.extractDates(data, resourceType);
        startDate = extractedDates.startDate || null;
        endDate = extractedDates.endDate || null;
      } else if (['invoices', 'activities', 'reports', 'sales', 'classes', 'history'].includes(resourceType)) {
        // These resource types need only startDate
        const extractedDates = this.extractDates(data, resourceType);
        startDate = extractedDates.startDate || null;
        endDate = null; // No endDate for these types
      }
      // For other resource types (patients, clients, members, staff, etc.), no dates are needed

      // Find existing resource by resourceId
      const existingResource = await this.resourceRepository.findOne({
        where: { businessId, locationId, resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} for business ${businessId} location ${locationId} not found`);
      }

      // Update resource entity
      Object.assign(existingResource, {
        resourceType,
        resourceId,
        data, // Salvează câmpul data cu JSON-ul complet
        startDate,
        endDate,
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(existingResource);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...data,
        startDate,
        endDate,
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
        where: { businessId, locationId, resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} for business ${businessId} location ${locationId} not found`);
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
        where: { businessId, locationId, resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} for business ${businessId} location ${locationId} not found`);
      }

      // Extract dates based on resource type (use existing dates if not provided)
      let finalStartDate = existingResource.startDate;
      let finalEndDate = existingResource.endDate;
      
      if (resourceType === 'timeline') {
        // Timeline needs both startDate and endDate
        const extractedDates = this.extractDates(data, resourceType);
        finalStartDate = extractedDates.startDate || existingResource.startDate;
        finalEndDate = extractedDates.endDate || existingResource.endDate;
      } else if (['invoices', 'activities', 'reports', 'sales', 'classes', 'history'].includes(resourceType)) {
        // These resource types need only startDate
        const extractedDates = this.extractDates(data, resourceType);
        finalStartDate = extractedDates.startDate || existingResource.startDate;
        finalEndDate = null; // No endDate for these types
      }
      // For other resource types, keep existing dates

      // Update resource entity
      Object.assign(existingResource, {
        resourceType,
        resourceId,
        data, // Salvează câmpul data cu JSON-ul complet
        startDate: finalStartDate,
        endDate: finalEndDate,
        shardId: shardId,
      });

      // Save using TypeORM repository
      const savedResource = await this.resourceRepository.save(existingResource);

      // Prepare response data
      const resourceData = {
        id: resourceId,
        ...data,
        startDate: finalStartDate,
        endDate: finalEndDate,
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