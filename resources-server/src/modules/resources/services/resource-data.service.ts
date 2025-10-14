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
   * Find or create patient based on customer data
   */
  private async findOrCreatePatient(
    businessId: string,
    locationId: string,
    customer: { name?: string; email?: string; phone?: string }
  ): Promise<string> {
    const businessLocationId = `${businessId}-${locationId}`;

    // First, try to find existing patient by email
    if (customer.email) {
      const existingPatientByEmail = await this.resourceRepository.findOne({
        where: { 
          businessLocationId,
          resourceType: 'patient',
          data: { email: customer.email } as any
        }
      });

      if (existingPatientByEmail) {
        this.logger.debug(`Found existing patient by email: ${existingPatientByEmail.resourceId}`);
        return existingPatientByEmail.resourceId;
      }
    }

    // If not found by email, try to find by phone
    if (customer.phone) {
      const existingPatientByPhone = await this.resourceRepository.findOne({
        where: { 
          businessLocationId,
          resourceType: 'patient',
          data: { phone: customer.phone } as any
        }
      });

      if (existingPatientByPhone) {
        this.logger.debug(`Found existing patient by phone: ${existingPatientByPhone.resourceId}`);
        
        // Update patient with new email if provided and different
        if (customer.email && customer.email !== (existingPatientByPhone.data as any)?.email) {
          existingPatientByPhone.data = {
            ...existingPatientByPhone.data,
            email: customer.email,
            updatedAt: new Date().toISOString()
          };
          await this.resourceRepository.save(existingPatientByPhone);
          this.logger.debug(`Updated patient ${existingPatientByPhone.resourceId} with new email: ${customer.email}`);
        }
        
        return existingPatientByPhone.resourceId;
      }
    }

    // If no existing patient found, create a new one
    const connection = await this.databaseService.getConnection(businessId, locationId);
    const patientId = await this.resourceIdService.generateResourceId(
      businessId,
      locationId,
      'patient',
      connection.pool
    );
    
    const patientData = {
      name: customer.name || 'Unknown',
      email: customer.email,
      phone: customer.phone,
      createdAt: new Date().toISOString(),
      createdBy: {
        userId: 'guest',
        email: customer.email,
        name: customer.name
      }
    };

    // Get shard info
    const { shardId } = await this.getShardInfo(businessId, locationId);

    // Create patient entity
    const patientEntity = this.resourceRepository.create({
      businessLocationId,
      resourceType: 'patient',
      resourceId: patientId,
      data: patientData,
      startDate: null,
      endDate: null,
      shardId: shardId,
    });

    // Save patient
    await this.resourceRepository.save(patientEntity);
    
    this.logger.log(`Created new patient: ${patientId} for customer: ${customer.email || customer.phone}`);
    
    // Send notification to Elixir
    await this.notificationService.notifyResourceCreated({
      resourceType: 'patient',
      businessId,
      locationId,
      resourceId: patientId,
      shardId: shardId,
      data: {
        id: patientId,
        ...patientData,
        businessId,
        locationId,
        shardId: shardId,
      },
    });
    
    return patientId;
  }

  /**
   * Extract start and end dates from resource data
   */
  private extractDates(data: any, resourceType: string): { startDate: string | null; endDate: string | null } {
    // Căutăm câmpurile de dată specifice în data
    const dateFields = [
      'startDate',
      'endDate', 
      'appointmentDate',
      'actionDate',
      'documentDate',
      'date',
      'issueDate',
      
    ];

    let startDate: string | null = null;
    let endDate: string | null = null;

    // Căutăm endDate specific - doar acest câmp va fi folosit pentru end_date
    if (data.endDate) {
      const date = new Date(data.endDate);
      endDate = date.toISOString().split('T')[0];
    }

    // Căutăm câmpurile pentru startDate - toate celelalte câmpuri vor fi folosite pentru start_date
    for (const field of dateFields) {
      if (field !== 'endDate' && data[field]) {
        const date = new Date(data[field]);
        startDate = date.toISOString().split('T')[0];

        break;
      }
    }

    // Dacă nu găsim niciun câmp de dată, nu populăm nimic
    if (!startDate && !endDate) {
      return { startDate: null, endDate: null };
    }

    // Dacă avem doar endDate, îl folosim și pentru startDate
    if (!startDate && endDate) {
      startDate = endDate;
    }

    // Dacă avem doar startDate, nu populăm endDate
    if (startDate && !endDate) {
      endDate = startDate;
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

      // Handle patient creation for appointments created by patients
      if (resourceType === 'appointment' && data.createdByPatient && data.customer) {
        this.logger.log(`Appointment created by patient, finding or creating patient first`);
        
        // Find or create patient based on customer data
        const patientId = await this.findOrCreatePatient(businessId, locationId, data.customer);
        
        // Get patient details
        const patient = await this.resourceRepository.findOne({
          where: { 
            businessLocationId: `${businessId}-${locationId}`,
            resourceType: 'patient',
            resourceId: patientId
          }
        });
        
        // Update data with patient info
        data.patient = {
          id: patientId,
          name: patient?.data?.name || data.customer.name || 'Unknown Patient'
        };
        
        this.logger.log(`Patient found/created: ${patientId}, proceeding with appointment creation`);
      }

      // Extract dates from data - căutăm automat câmpurile de dată
      const extractedDates = this.extractDates(data, resourceType);
      const startDate = extractedDates.startDate;
      const endDate = extractedDates.endDate;

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
        where: { businessLocationId: `${businessId}-${locationId}`, resourceId }
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
        businessLocationId: `${businessId}-${locationId}`,
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

      // Handle patient creation for appointments updated by patients
      if (resourceType === 'appointment' && data.createdByPatient && data.customer) {
        this.logger.log(`Appointment updated by patient, finding or creating patient first`);
        
        // Find or create patient based on customer data
        const patientId = await this.findOrCreatePatient(businessId, locationId, data.customer);
        
        // Get patient details
        const patient = await this.resourceRepository.findOne({
          where: { 
            businessLocationId: `${businessId}-${locationId}`,
            resourceType: 'patient',
            resourceId: patientId
          }
        });
        
        // Update data with patient info
        data.patient = {
          id: patientId,
          name: patient?.data?.name || data.customer.name || 'Unknown Patient'
        };
        
        this.logger.log(`Patient found/created: ${patientId}, proceeding with appointment update`);
      }

      // Extract dates from data - căutăm automat câmpurile de dată
      const extractedDates = this.extractDates(data, resourceType);
      const startDate = extractedDates.startDate;
      const endDate = extractedDates.endDate;

      // Find existing resource by resourceId
      const existingResource = await this.resourceRepository.findOne({
        where: { businessLocationId: `${businessId}-${locationId}`, resourceId }
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
        where: { businessLocationId: `${businessId}-${locationId}`, resourceId }
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
        where: { businessLocationId: `${businessId}-${locationId}`, resourceId }
      });

      if (!existingResource) {
        throw new Error(`Resource with ID ${resourceId} for business ${businessId} location ${locationId} not found`);
      }

      // Extract dates from data - căutăm automat câmpurile de dată (use existing dates if not provided)
      const extractedDates = this.extractDates(data, resourceType);
      const finalStartDate = extractedDates.startDate || existingResource.startDate;
      const finalEndDate = extractedDates.endDate || existingResource.endDate;

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