import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

export interface ShardCreationMessage {
  businessId: string;
  locationId: string;
  businessType: string;
  shardId: string;
  connectionString: string;
  timestamp: string;
}

export interface CitrusShardResponse {
  shardId: string;
  connectionString: string;
  isActive: boolean;
  lastHealthCheck: string;
  businessCount: number;
  maxBusinesses: number;
}

export interface AdminAccountCreationMessage {
  businessId: string;
  locationId: string;
  adminEmail: string;
  adminUserId: string;
  businessType: string;
  domainLabel: string;
  timestamp: string;
}

@Injectable()
export class SqsConsumerService {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly citrusBaseUrl: string;
  private readonly citrusApiKey: string;
  private isPolling = false;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get('sqs.awsSqsRegion', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.queueUrl = this.configService.get('sqs.shardCreationQueueUrl');
    this.citrusBaseUrl = this.configService.get('CITRUS_SERVER_URL', 'http://citrus:8080');
    this.citrusApiKey = this.configService.get('CITRUS_API_KEY', '');
  }

  /**
   * Start polling for SQS messages
   */
  async startPolling(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('SQS polling is already running');
      return;
    }

    if (!this.queueUrl) {
      this.logger.warn('SQS queue URL not configured, skipping polling');
      return;
    }

    this.isPolling = true;
    this.logger.log('Starting SQS message polling');

    while (this.isPolling) {
      try {
        await this.pollMessages();
        // Wait 10 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        this.logger.error('Error polling SQS messages:', error);
        // Wait 30 seconds before retrying on error
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  /**
   * Stop polling for SQS messages
   */
  stopPolling(): void {
    this.isPolling = false;
    this.logger.log('Stopping SQS message polling');
  }

  /**
   * Poll for messages from SQS queue
   */
  private async pollMessages(): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['All'],
    });

    const response = await this.sqsClient.send(command);

    if (!response.Messages || response.Messages.length === 0) {
      return;
    }

    this.logger.log(`Received ${response.Messages.length} messages from SQS`);

    for (const message of response.Messages) {
      try {
        await this.processMessage(message);
        await this.deleteMessage(message.ReceiptHandle);
      } catch (error) {
        this.logger.error(`Error processing message ${message.MessageId}:`, error);
        // Don't delete the message on error, let it go back to the queue
      }
    }
  }

  /**
   * Process a single SQS message
   */
  private async processMessage(message: any): Promise<void> {
    const messageType = message.MessageAttributes?.MessageType?.StringValue;

    if (messageType === 'SHARD_CREATION') {
      await this.handleShardCreationMessage(message);
    } else if (messageType === 'ADMIN_ACCOUNT_CREATION') {
      await this.handleAdminAccountCreationMessage(message);
    } else {
      this.logger.warn(`Unknown message type: ${messageType}`);
    }
  }

  /**
   * Handle shard creation messages
   */
  private async handleShardCreationMessage(message: any): Promise<void> {
    try {
      const shardData: ShardCreationMessage = JSON.parse(message.Body);
      
      this.logger.log(`Processing shard creation for business ${shardData.businessId}, location ${shardData.locationId}`);

      // 1. Register with Citrus sharding system
      const citrusShardData = await this.registerWithCitrus(shardData);
      
      // 2. Initialize the database shard with the provided connection string
      await this.initializeShard({
        ...shardData,
        shardId: citrusShardData.shardId,
        connectionString: citrusShardData.connectionString,
      });

      this.logger.log(`Successfully initialized shard ${citrusShardData.shardId} for business ${shardData.businessId}`);
    } catch (error) {
      this.logger.error('Error handling shard creation message:', error);
      throw error;
    }
  }

  /**
   * Register with Citrus sharding system
   */
  private async registerWithCitrus(shardData: ShardCreationMessage): Promise<CitrusShardResponse> {
    const shardKey = `${shardData.businessId}-${shardData.locationId}`;

    try {
      const response = await fetch(`${this.citrusBaseUrl}/api/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.citrusApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: shardData.businessId,
          locationId: shardData.locationId,
          businessType: shardData.businessType,
          shardKey,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Citrus server responded with status: ${response.status}`,
        );
      }

      const citrusData: CitrusShardResponse = await response.json();

      this.logger.log(
        `Successfully registered with Citrus: business-location ${shardKey} assigned to shard ${citrusData.shardId}`,
      );

      return citrusData;
    } catch (error) {
      this.logger.error(`Failed to register with Citrus for ${shardKey}:`, error);
      throw new Error(
        `Unable to register with Citrus for business ${shardData.businessId} location ${shardData.locationId}: ${error.message}`,
      );
    }
  }

  /**
   * Initialize a new shard with the provided connection details
   */
  private async initializeShard(shardData: ShardCreationMessage): Promise<void> {
    // This is where you would implement the actual shard initialization logic
    // For now, we'll just log the details
    
    this.logger.log(`Initializing shard with details:`, {
      shardId: shardData.shardId,
      businessId: shardData.businessId,
      locationId: shardData.locationId,
      businessType: shardData.businessType,
      connectionString: shardData.connectionString,
    });

    // TODO: Implement actual shard initialization:
    // 1. Connect to the database using the connection string
    // 2. Create necessary tables for the business type
    // 3. Set up any required indexes or constraints
    // 4. Initialize business-specific data structures
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Handle admin account creation messages
   */
  private async handleAdminAccountCreationMessage(message: any): Promise<void> {
    try {
      const adminData: AdminAccountCreationMessage = JSON.parse(message.Body);
      
      this.logger.log(`Processing admin account creation for business ${adminData.businessId}, location ${adminData.locationId}, admin ${adminData.adminEmail}`);

      // 1. Create admin role resource
      await this.createAdminRole(adminData);
      
      // 2. Create medic resource with admin account's resource_id
      await this.createMedicResource(adminData);

      this.logger.log(`Successfully created admin account for business ${adminData.businessId}, location ${adminData.locationId}`);
    } catch (error) {
      this.logger.error('Error handling admin account creation message:', error);
      throw error;
    }
  }

  /**
   * Create admin role resource
   */
  private async createAdminRole(adminData: AdminAccountCreationMessage): Promise<void> {
    try {
      this.logger.log(`Creating admin role for business ${adminData.businessId}, location ${adminData.locationId}`);
      
      // Create admin role with full permissions
      const roleData = {
        name: "Administrator",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: "Administrator principal al clinicii",
        permissions: [
          "appointment:read",
          "appointment:create", 
          "appointment:update",
          "appointment:delete",
          "patient:read",
          "patient:create",
          "patient:update", 
          "patient:delete",
          "medic:read",
          "medic:create",
          "medic:update",
          "medic:delete",
          "treatment:read",
          "treatment:create",
          "treatment:update",
          "treatment:delete",
          "product:read",
          "product:create",
          "product:update",
          "product:delete",
          "role:read",
          "role:create",
          "role:update",
          "role:delete",
          "report:read",
          "sale:read",
          "sale:create",
          "dental-chart:read",
          "dental-chart:create",
          "dental-chart:update",
          "plan:read",
          "plan:create",
          "plan:update",
          "setting:read",
          "setting:update",
          "invoice-client:read",
          "invoice-client:create",
          "statistics:read",
          "recent-activities:read"
        ]
      };

      // Use direct database service to create role resource
      const { DatabaseService } = await import('../resources/services/database.service');
      const databaseService = new DatabaseService(this.configService, null);
      
      await databaseService.saveResource(
        adminData.businessId,
        adminData.locationId,
        'role',
        roleData,
        new Date().toISOString().split('T')[0], // start_date
        null, // end_date
        adminData.adminUserId // Use admin's Cognito user ID as resource_id
      );

      this.logger.log(`✅ Admin role created successfully for business ${adminData.businessId}, location ${adminData.locationId}`);
    } catch (error) {
      this.logger.error(`Error creating admin role for business ${adminData.businessId}:`, error);
      throw error;
    }
  }

  /**
   * Create medic resource with admin account's resource_id
   */
  private async createMedicResource(adminData: AdminAccountCreationMessage): Promise<void> {
    try {
      this.logger.log(`Creating medic resource for admin ${adminData.adminUserId} in business ${adminData.businessId}, location ${adminData.locationId}`);
      
      // Create medic resource with admin's Cognito user ID as resource_id
      const medicData = {
        role: "Administrator",
        email: adminData.adminEmail,
        phone: "", // Will be filled by user later
        dutyDays: ["Luni", "Marți", "Miercuri", "Joi", "Vineri"], // Default working days
        createdAt: new Date().toISOString(),
        medicName: `${adminData.adminEmail.split('@')[0]}`, // Generate name from email
        updatedAt: new Date().toISOString()
      };

      // Use direct database service to create medic resource
      const { DatabaseService } = await import('../resources/services/database.service');
      const databaseService = new DatabaseService(this.configService, null);
      
      await databaseService.saveResource(
        adminData.businessId,
        adminData.locationId,
        'medic',
        medicData,
        new Date().toISOString().split('T')[0], // start_date
        null, // end_date
        adminData.adminUserId // Use admin's Cognito user ID as resource_id
      );

      this.logger.log(`✅ Medic resource created successfully for admin ${adminData.adminUserId} in business ${adminData.businessId}, location ${adminData.locationId}`);
    } catch (error) {
      this.logger.error(`Error creating medic resource for business ${adminData.businessId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a processed message from the queue
   */
  private async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }
} 