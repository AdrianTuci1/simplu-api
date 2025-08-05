import { Injectable, Logger } from '@nestjs/common';
import { KinesisService, ResourceOperation } from '../../../../kinesis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResourceDataService {
  private readonly logger = new Logger(ResourceDataService.name);

  constructor(private readonly kinesisService: KinesisService) {}

  /**
   * Send create resource operation to Kinesis
   */
  async createResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    data: any,
  ): Promise<any> {
    try {
      const requestId = uuidv4();
      const resourceId = `${resourceType}-${Date.now()}`;

      const operation: ResourceOperation = {
        operation: 'create',
        businessId,
        locationId,
        resourceType,
        resourceId,
        data: {
          ...data,
          id: resourceId,
        },
        timestamp: new Date().toISOString(),
        requestId,
      };

      await this.kinesisService.sendResourceOperation(operation);

      this.logger.log(
        `Create operation sent to Kinesis for ${resourceType} with ID: ${resourceId}`,
      );

      // Return the expected structure for immediate response
      return {
        id: resourceId,
        ...data,
        createdAt: operation.timestamp,
        businessId,
        locationId,
        status: 'processing', // Indicates the operation is being processed
        requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error sending create operation for ${resourceType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send list resources operation to Kinesis and return cached/immediate results
   * Note: For list operations, you might want to implement caching or direct database reads
   * since users expect immediate results for queries
   */
  async getResources(
    businessId: string,
    locationId: string,
    resourceType: string,
    filters: any,
    page: number,
    limit: number,
  ): Promise<{ items: any[]; total: number }> {
    try {
      const requestId = uuidv4();

      const operation: ResourceOperation = {
        operation: 'list',
        businessId,
        locationId,
        resourceType,
        filters,
        pagination: { page, limit },
        timestamp: new Date().toISOString(),
        requestId,
      };

      // Send to Kinesis for analytics/logging purposes
      await this.kinesisService.sendResourceOperation(operation);

      this.logger.log(`List operation sent to Kinesis for ${resourceType}`);

      // For list operations, you might want to:
      // 1. Query a read replica or cache
      // 2. Return cached results
      // 3. Or implement a synchronous query to the resources-server

      // For now, return empty structure indicating the query was processed
      return {
        items: [],
        total: 0,
      };
    } catch (error) {
      this.logger.error(
        `Error sending list operation for ${resourceType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send update resource operation to Kinesis
   */
  async updateResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
    data: any,
  ): Promise<any> {
    try {
      const requestId = uuidv4();

      const operation: ResourceOperation = {
        operation: 'update',
        businessId,
        locationId,
        resourceType,
        resourceId,
        data,
        timestamp: new Date().toISOString(),
        requestId,
      };

      await this.kinesisService.sendResourceOperation(operation);

      this.logger.log(
        `Update operation sent to Kinesis for ${resourceType} with ID: ${resourceId}`,
      );

      // Return the expected structure for immediate response
      return {
        id: resourceId,
        ...data,
        updatedAt: operation.timestamp,
        businessId,
        locationId,
        status: 'processing',
        requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error sending update operation for ${resourceType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send delete resource operation to Kinesis
   */
  async deleteResource(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      const requestId = uuidv4();

      const operation: ResourceOperation = {
        operation: 'delete',
        businessId,
        locationId,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
        requestId,
      };

      await this.kinesisService.sendResourceOperation(operation);

      this.logger.log(
        `Delete operation sent to Kinesis for ${resourceType} with ID: ${resourceId}`,
      );

      return true; // Indicates the delete operation was queued successfully
    } catch (error) {
      this.logger.error(
        `Error sending delete operation for ${resourceType}:`,
        error,
      );
      throw error;
    }
  }
}
