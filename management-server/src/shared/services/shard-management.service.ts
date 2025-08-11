import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService, ShardCreationMessage, ShardDestructionMessage } from './sqs.service';

@Injectable()
export class ShardManagementService {
  private readonly logger = new Logger(ShardManagementService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Triggers shard creation for a business+location combination via SQS
   * The resources server will handle the actual Citrus integration
   */
  async triggerShardCreation(
    businessId: string,
    locationId: string,
    businessType: string,
  ): Promise<void> {
    this.validateShardParams(businessId, locationId);

    try {
      // Send SQS message to notify resources server
      const message: ShardCreationMessage = {
        businessId,
        locationId,
        businessType,
        shardId: '', // Will be assigned by Citrus through resources server
        connectionString: '', // Will be provided by Citrus through resources server
        timestamp: new Date().toISOString(),
      };

      await this.sqsService.sendShardCreationMessage(message);

      this.logger.log(
        `Successfully triggered shard creation for business ${businessId}, location ${locationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to trigger shard creation for ${businessId}-${locationId}:`, error);
      throw new Error(
        `Unable to trigger shard creation for business ${businessId} location ${locationId}: ${error.message}`,
      );
    }
  }

  /**
   * Triggers shard creation for multiple business locations via SQS
   */
  async triggerMultipleShardCreations(
    businessId: string,
    locations: Array<{ id: string; businessType: string }>,
  ): Promise<void> {
    const messages: ShardCreationMessage[] = [];

    for (const location of locations) {
      messages.push({
        businessId,
        locationId: location.id,
        businessType: location.businessType,
        shardId: '', // Will be assigned by Citrus through resources server
        connectionString: '', // Will be provided by Citrus through resources server
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Send batch SQS messages
      if (messages.length > 0) {
        await this.sqsService.sendBatchShardCreationMessages(messages);
      }

      this.logger.log(
        `Successfully triggered shard creation for ${messages.length} locations of business ${businessId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to trigger shard creation for business ${businessId}:`, error);
      throw new Error(
        `Unable to trigger shard creation for business ${businessId}: ${error.message}`,
      );
    }
  }

  /**
   * Triggers shard destruction for a specific business+location combination via SQS
   * The resources server will handle the actual Citrus integration for cleanup
   */
  async triggerShardDestruction(businessId: string, locationId: string): Promise<void> {
    this.validateShardParams(businessId, locationId);

    try {
      // Send SQS message to notify resources server to destroy specific shard
      const message: ShardDestructionMessage = {
        businessId,
        locationId,
        action: 'destroy',
        timestamp: new Date().toISOString(),
      };

      await this.sqsService.sendShardDestructionMessage(message);

      this.logger.log(
        `Successfully triggered shard destruction for business ${businessId}, location ${locationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to trigger shard destruction for ${businessId}-${locationId}:`, error);
      throw new Error(
        `Unable to trigger shard destruction for business ${businessId} location ${locationId}: ${error.message}`,
      );
    }
  }

  /**
   * Triggers shard destruction for all locations of a business via SQS
   * The resources server will handle the actual Citrus integration for cleanup
   */
  async triggerShardDestructionForBusiness(businessId: string): Promise<void> {
    if (!businessId || businessId.trim() === '') {
      throw new Error('Business ID is required for shard destruction');
    }

    try {
      // Send SQS message to notify resources server to destroy all shards for business
      const message: ShardDestructionMessage = {
        businessId,
        action: 'destroy_all',
        timestamp: new Date().toISOString(),
      };

      await this.sqsService.sendShardDestructionMessage(message);

      this.logger.log(
        `Successfully triggered shard destruction for all locations of business ${businessId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to trigger shard destruction for business ${businessId}:`, error);
      throw new Error(
        `Unable to trigger shard destruction for business ${businessId}: ${error.message}`,
      );
    }
  }

  /**
   * Validates that businessId and locationId are provided
   */
  private validateShardParams(businessId: string, locationId: string): void {
    if (!businessId || businessId.trim() === '') {
      throw new Error('Business ID is required for shard operations');
    }
    if (!locationId || locationId.trim() === '') {
      throw new Error('Location ID is required for shard operations');
    }
  }
} 