import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BusinessEntity } from '../business/entities/business.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly dynamoClient: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(private configService: ConfigService) {
    this.dynamoClient = new DynamoDBClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.docClient = DynamoDBDocumentClient.from(this.dynamoClient);
    this.tableName = this.configService.get('DYNAMODB_TABLE_NAME', 'businesses');
  }

  async createBusiness(business: BusinessEntity): Promise<BusinessEntity> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: business,
      });

      await this.docClient.send(command);
      this.logger.log(`Business created with ID: ${business.businessId}`);
      return business;
    } catch (error) {
      this.logger.error(`Error creating business: ${error.message}`);
      throw error;
    }
  }

  async getBusiness(businessId: string): Promise<BusinessEntity | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { businessId },
      });

      const result = await this.docClient.send(command);
      return result.Item as BusinessEntity || null;
    } catch (error) {
      this.logger.error(`Error getting business: ${error.message}`);
      throw error;
    }
  }

  async updateBusiness(businessId: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity> {
    try {
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { businessId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.docClient.send(command);
      return result.Attributes as BusinessEntity;
    } catch (error) {
      this.logger.error(`Error updating business: ${error.message}`);
      throw error;
    }
  }

  async deleteBusiness(businessId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { businessId },
      });

      await this.docClient.send(command);
      this.logger.log(`Business deleted with ID: ${businessId}`);
    } catch (error) {
      this.logger.error(`Error deleting business: ${error.message}`);
      throw error;
    }
  }

  async getAllBusinesses(): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await this.docClient.send(command);
      return result.Items as BusinessEntity[] || [];
    } catch (error) {
      this.logger.error(`Error getting all businesses: ${error.message}`);
      throw error;
    }
  }

  async getBusinessesByStatus(status: string): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
      });

      const result = await this.docClient.send(command);
      return result.Items as BusinessEntity[] || [];
    } catch (error) {
      this.logger.error(`Error getting businesses by status: ${error.message}`);
      throw error;
    }
  }

  async getBusinessesByPaymentStatus(paymentStatus: string): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#paymentStatus = :paymentStatus',
        ExpressionAttributeNames: {
          '#paymentStatus': 'paymentStatus',
        },
        ExpressionAttributeValues: {
          ':paymentStatus': paymentStatus,
        },
      });

      const result = await this.docClient.send(command);
      return result.Items as BusinessEntity[] || [];
    } catch (error) {
      this.logger.error(`Error getting businesses by payment status: ${error.message}`);
      throw error;
    }
  }

  async getBusinessesByOwner(userId: string): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#ownerUserId = :ownerUserId',
        ExpressionAttributeNames: {
          '#ownerUserId': 'ownerUserId',
        },
        ExpressionAttributeValues: {
          ':ownerUserId': userId,
        },
      });

      const result = await this.docClient.send(command);
      return (result.Items as BusinessEntity[]) || [];
    } catch (error) {
      this.logger.error(`Error getting businesses by owner: ${error.message}`);
      throw error;
    }
  }

  async getBusinessesByAuthorizedEmail(email: string): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'contains(#authorizedEmails, :email) OR #ownerEmail = :email',
        ExpressionAttributeNames: {
          '#authorizedEmails': 'authorizedEmails',
          '#ownerEmail': 'ownerEmail',
        },
        ExpressionAttributeValues: {
          ':email': email,
        },
      });

      const result = await this.docClient.send(command);
      return (result.Items as BusinessEntity[]) || [];
    } catch (error) {
      this.logger.error(`Error getting businesses by authorized email: ${error.message}`);
      throw error;
    }
  }

  async getBusinessesByCreator(userId: string): Promise<BusinessEntity[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#createdByUserId = :createdByUserId',
        ExpressionAttributeNames: {
          '#createdByUserId': 'createdByUserId',
        },
        ExpressionAttributeValues: {
          ':createdByUserId': userId,
        },
      });

      const result = await this.docClient.send(command);
      return (result.Items as BusinessEntity[]) || [];
    } catch (error) {
      this.logger.error(`Error getting businesses by creator: ${error.message}`);
      throw error;
    }
  }
} 