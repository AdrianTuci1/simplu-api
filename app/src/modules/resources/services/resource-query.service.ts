import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitrusShardingService } from '../../../config/citrus-sharding.config';
import { BaseResource, ResourceType } from '../types/base-resource';
import { ResourceEntity } from '../entities/resource.entity';

export interface ResourceRecord {
  id: number;
  business_location_id: string;
  resource_type: string;
  resource_id: string;
  data: any;
  start_date: string;
  end_date: string;
  created_at: Date;
  updated_at: Date;
  shard_id?: string;
}

export interface ResourceQuery {
  resourceType?: string;
  page?: number;
  limit?: number;
  filters?: {
    startDate?: string;
    endDate?: string;
    dateFrom?: string;
    dateTo?: string;
    name?: string;
    isActive?: boolean;
    customFilters?: Record<string, any>;
    nestedFilters?: Record<string, any>; // For nested field paths like data.doctor.id
  };
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface QueryResult {
  data: BaseResource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface DatabaseConfig {
  type: 'citrus' | 'rds';
  rds?: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
  };
  citrus?: {
    serverUrl: string;
    apiKey: string;
    timeout: number;
    retryAttempts: number;
  };
}

@Injectable()
export class ResourceQueryService {
  private readonly logger = new Logger(ResourceQueryService.name);
  private readonly databaseConfig: DatabaseConfig;
  private readonly citrusService: CitrusShardingService;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
  ) {
    this.databaseConfig = this.configService.get<DatabaseConfig>('database')!;
    this.citrusService = new CitrusShardingService();
  }

  /**
   * Determines whether to use Citrus or RDS for GET operations
   * This allows switching between Citrus and RDS for read operations only
   */
  private shouldUseCitrusForRead(): boolean {
    // Check if there's a specific environment variable to force RDS for reads
    const forceRDSForReads = process.env.FORCE_RDS_FOR_READS === 'true';

    if (forceRDSForReads) {
      this.logger.log(
        'Forcing RDS for read operations due to FORCE_RDS_FOR_READS=true',
      );
      return false;
    }

    // Check if there's a specific environment variable to force Citrus for reads
    const forceCitrusForReads = process.env.FORCE_CITRUS_FOR_READS === 'true';

    if (forceCitrusForReads) {
      this.logger.log(
        'Forcing Citrus for read operations due to FORCE_CITRUS_FOR_READS=true',
      );
      return true;
    }

    // Default behavior: use the configured database type
    const useCitrus = this.databaseConfig.type === 'citrus';
    this.logger.log(
      `Using ${useCitrus ? 'Citrus' : 'RDS'} for read operations (default behavior)`,
    );
    return useCitrus;
  }

  /**
   * Query resources with advanced filtering and pagination
   */
  async queryResources(
    businessId: string,
    locationId: string,
    query: ResourceQuery,
  ): Promise<QueryResult> {
    try {
      const { resourceType, filters, page = 1, limit = 50 } = query;

      // Set default pagination
      const pageNum = page || 1;
      const limitNum = Math.min(limit || 50, 1000); // Max 1000 records
      const offset = (pageNum - 1) * limitNum;

      let resources: ResourceRecord[];

      if (this.shouldUseCitrusForRead()) {
        resources = await this.queryResourcesFromCitrus(
          businessId,
          locationId,
          resourceType,
          filters,
          limitNum + 1,
          offset,
        );
      } else {
        resources = await this.queryResourcesFromRDS(
          businessId,
          locationId,
          resourceType,
          filters,
          limitNum + 1,
          offset,
        );
      }

      // Check if there are more pages
      const hasMore = resources.length > limitNum;
      const data = hasMore ? resources.slice(0, limitNum) : resources;

      // Custom filters are now applied directly in the queryBuilder, so no post-processing needed
      const filteredData = data;

      // Convert to BaseResource format
      const baseResources = filteredData.map(this.convertToBaseResource);

      // Calculate total pages (approximation since we don't do a count query)
      const total = hasMore
        ? pageNum * limitNum + 1
        : (pageNum - 1) * limitNum + baseResources.length;
      const pages = Math.ceil(total / limitNum);

      this.logger.log(
        `Queried ${baseResources.length} resources for ${businessId}/${locationId}`,
      );

      return {
        data: baseResources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
        },
      };
    } catch (error) {
      this.logger.error('Error querying resources:', error);
      throw error;
    }
  }

  /**
   * Get a single resource by business, location, resource type and resource ID
   */
  async getResourceById(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<BaseResource | null> {
    try {
      let resource: ResourceRecord | null;

      if (this.shouldUseCitrusForRead()) {
        resource = await this.getResourceFromCitrus(
          businessId,
          locationId,
          resourceType,
          resourceId,
        );
      } else {
        resource = await this.getResourceFromRDS(
          businessId,
          locationId,
          resourceType,
          resourceId,
        );
      }

      if (resource) {
        this.logger.log(
          `Found resource ${resourceId} of type ${resourceType} for ${businessId}/${locationId}`,
        );
        return this.convertToBaseResource(resource);
      } else {
        this.logger.log(
          `Resource ${resourceId} of type ${resourceType} not found for ${businessId}/${locationId}`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(
        `Error getting resource ${resourceId} of type ${resourceType} for ${businessId}/${locationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get resources by type with pagination
   */
  async getResourcesByType(
    businessId: string,
    locationId: string,
    resourceType: ResourceType,
    limit: number = 50,
    offset: number = 0,
  ): Promise<BaseResource[]> {
    try {
      let resources: ResourceRecord[];

      if (this.shouldUseCitrusForRead()) {
        resources = await this.getResourcesByTypeFromCitrus(
          businessId,
          locationId,
          resourceType,
          limit,
          offset,
        );
      } else {
        resources = await this.getResourcesByTypeFromRDS(
          businessId,
          locationId,
          resourceType,
          limit,
          offset,
        );
      }

      this.logger.log(
        `Found ${resources.length} resources of type ${resourceType}`,
      );
      return resources.map(this.convertToBaseResource);
    } catch (error) {
      this.logger.error(
        `Error getting resources by type ${resourceType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get resources by date range
   */
  async getResourcesByDateRange(
    businessId: string,
    locationId: string,
    resourceType: string,
    startDate: string,
    endDate: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<BaseResource[]> {
    try {
      let resources: ResourceRecord[];

      if (this.shouldUseCitrusForRead()) {
        resources = await this.getResourcesByDateRangeFromCitrus(
          businessId,
          locationId,
          resourceType,
          startDate,
          endDate,
          limit,
          offset,
        );
      } else {
        resources = await this.getResourcesByDateRangeFromRDS(
          businessId,
          locationId,
          resourceType,
          startDate,
          endDate,
          limit,
          offset,
        );
      }

      this.logger.log(
        `Found ${resources.length} resources between ${startDate} and ${endDate}`,
      );
      return resources.map(this.convertToBaseResource);
    } catch (error) {
      this.logger.error(`Error getting resources by date range:`, error);
      throw error;
    }
  }

  /**
   * Get resource statistics
   */
  async getResourceStats(
    businessId: string,
    locationId: string,
    resourceType?: string,
  ): Promise<any> {
    try {
      let resources: ResourceRecord[];

      if (this.shouldUseCitrusForRead()) {
        resources = await this.getResourcesByTypeFromCitrus(
          businessId,
          locationId,
          resourceType,
          1000,
          0,
        );
      } else {
        resources = await this.getResourcesByTypeFromRDS(
          businessId,
          locationId,
          resourceType,
          1000,
          0,
        );
      }

      const stats = {
        total: resources.length,
        byResourceType: {} as Record<string, number>,
        byStartDate: {} as Record<string, number>,
        byEndDate: {} as Record<string, number>,
      };

      resources.forEach((record) => {
        // Count by resource type
        stats.byResourceType[record.resource_type] =
          (stats.byResourceType[record.resource_type] || 0) + 1;

        // Count by start date (daily)
        const startDate = record.start_date;
        stats.byStartDate[startDate] = (stats.byStartDate[startDate] || 0) + 1;

        // Count by end date (daily)
        const endDate = record.end_date;
        stats.byEndDate[endDate] = (stats.byEndDate[endDate] || 0) + 1;
      });

      this.logger.log(
        `Generated stats for ${businessId}/${locationId}: ${stats.total} total resources`,
      );
      return stats;
    } catch (error) {
      this.logger.error('Error generating resource stats:', error);
      throw error;
    }
  }

  // Citrus implementation methods
  private async queryResourcesFromCitrus(
    businessId: string,
    locationId: string,
    resourceType?: string,
    filters?: any,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      const shard = await this.citrusService.getShardForBusiness(
        businessId,
        locationId,
      );

      // Create a temporary pool connection for this query
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: shard.connectionString,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      try {
        let query = 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
        const values = [businessId, locationId];
        let paramCount = 2;

        // Add resource type filter
        if (resourceType) {
          paramCount++;
          query += ` AND resource_type = $${paramCount}`;
          values.push(resourceType);
        }

        // Add date filters
        if (filters?.startDate) {
          paramCount++;
          query += ` AND start_date >= $${paramCount}`;
          values.push(filters.startDate);
        }

        if (filters?.endDate) {
          paramCount++;
          query += ` AND end_date <= $${paramCount}`;
          values.push(filters.endDate);
        }

        // Apply custom filters using SQL
        if (filters?.customFilters) {
          query = this.buildCitrusCustomFilters(query, filters.customFilters, values, paramCount);
        }

        // Apply nested filters (data.doctor.id, data.treatmentName, etc.)
        if (filters?.nestedFilters) {
          query = this.buildCitrusCustomFilters(query, filters.nestedFilters, values, values.length);
        }

        // Add ordering and pagination
        query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit.toString(), offset.toString());

        this.logger.log(`Executing Citrus query: ${query} with values: ${JSON.stringify(values)}`);

        const result = await pool.query(query, values);
        return result.rows;
      } finally {
        await pool.end();
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to query resources from Citrus: ${error.message}`,
      );
    }
  }

  private async getResourceFromCitrus(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<ResourceRecord | null> {
    try {
      const shard = await this.citrusService.getShardForBusiness(
        businessId,
        locationId,
      );

      // TODO: Implement actual database query using shard connection
      // Query should filter by businessId, locationId, resourceType, and resourceId

      return null;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get resource from Citrus: ${error.message}`,
      );
    }
  }

  private async getResourcesByTypeFromCitrus(
    businessId: string,
    locationId: string,
    resourceType?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      const shard = await this.citrusService.getShardForBusiness(
        businessId,
        locationId,
      );

      let query =
        'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
      const values = [businessId, locationId];

      if (resourceType) {
        query += ' AND resource_type = $3';
        values.push(resourceType);
        query +=
          ' ORDER BY start_date DESC, created_at DESC LIMIT $4 OFFSET $5';
        values.push(limit.toString(), offset.toString());
      } else {
        query +=
          ' ORDER BY start_date DESC, created_at DESC LIMIT $3 OFFSET $4';
        values.push(limit.toString(), offset.toString());
      }

      this.logger.log(
        `Executing Citrus type query: ${query} with values: ${JSON.stringify(values)}`,
      );

      // TODO: Execute the query using the shard connection
      // For now, return empty array as the actual database connection needs to be implemented
      return [];
    } catch (error) {
      throw new BadRequestException(
        `Failed to get resources by type from Citrus: ${error.message}`,
      );
    }
  }

  private async getResourcesByDateRangeFromCitrus(
    businessId: string,
    locationId: string,
    resourceType: string,
    startDate: string,
    endDate: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      const shard = await this.citrusService.getShardForBusiness(
        businessId,
        locationId,
      );

      // Build the SQL query with proper field names (start_date, end_date)
      let query =
        'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
      const values = [businessId, locationId];
      let paramCount = 2;

      // Add resource type filter
      paramCount++;
      query += ` AND resource_type = $${paramCount}`;
      values.push(resourceType);

      // Add date range filters using the correct field names
      if (startDate) {
        paramCount++;
        query += ` AND start_date >= $${paramCount}`;
        values.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND end_date <= $${paramCount}`;
        values.push(endDate);
      }

      // Add ordering and pagination
      query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit.toString(), offset.toString());

      this.logger.log(
        `Executing Citrus date range query: ${query} with values: ${JSON.stringify(values)}`,
      );

      // TODO: Execute the query using the shard connection
      // For now, return empty array as the actual database connection needs to be implemented
      return [];
    } catch (error) {
      throw new BadRequestException(
        `Failed to get resources by date range from Citrus: ${error.message}`,
      );
    }
  }

  // RDS implementation methods
  private async queryResourcesFromRDS(
    businessId: string,
    locationId: string,
    resourceType?: string,
    filters?: any,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      this.logger.log(
        `Querying resources: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}`,
      );

      const businessLocationId = `${businessId}-${locationId}`;
      let queryBuilder = this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        });

      if (resourceType) {
        queryBuilder.andWhere('resource.resourceType = :resourceType', {
          resourceType,
        });
      }

      // Apply date filters if provided
      if (filters?.startDate) {
        queryBuilder.andWhere('resource.startDate >= :startDate', {
          startDate: filters.startDate,
        });
      }

      if (filters?.endDate) {
        queryBuilder.andWhere('resource.endDate <= :endDate', {
          endDate: filters.endDate,
        });
      }

      // Apply custom filters using the organized queryBuilder
      if (filters?.customFilters) {
        queryBuilder = this.buildCustomFilters(queryBuilder, filters.customFilters);
      }

      // Apply nested filters (data.doctor.id, data.treatmentName, etc.)
      if (filters?.nestedFilters) {
        queryBuilder = this.buildCustomFilters(queryBuilder, filters.nestedFilters);
      }

      const resources = await queryBuilder
        .orderBy('resource.startDate', 'DESC')
        .addOrderBy('resource.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      this.logger.log(`Found ${resources.length} resources`);

      // Log data size for debugging (especially for roles)
      for (const resource of resources) {
        if (resource.resourceType === 'role') {
          const dataSize = JSON.stringify(resource.data).length;
          const permissionsCount = Array.isArray(resource.data?.permissions) 
            ? resource.data.permissions.length 
            : 0;
          this.logger.debug(
            `Role resource extracted from DB (TypeORM): ${resource.data?.name}, data size: ${dataSize} bytes, permissions count: ${permissionsCount}`,
          );

          // Also run a raw SQL query to compare
          try {
            const rawResult = await this.resourceRepository.query(
              `SELECT 
                data, 
                jsonb_array_length(data->'permissions') as permissions_count,
                octet_length(data::text) as data_size_bytes
              FROM resources 
              WHERE business_location_id = $1 
                AND resource_type = $2 
                AND resource_id = $3`,
              [resource.businessLocationId, resource.resourceType, resource.resourceId]
            );
            
            if (rawResult && rawResult.length > 0) {
              const rawData = rawResult[0];
              const rawPermissionsCount = rawData.permissions_count;
              const rawDataSize = rawData.data_size_bytes;
              const actualPermissionsInRaw = Array.isArray(rawData.data?.permissions) 
                ? rawData.data.permissions.length 
                : 0;
              
              this.logger.debug(
                `Role resource via RAW SQL: ${resource.data?.name}, ` +
                `data size: ${rawDataSize} bytes, ` +
                `permissions count (jsonb_array_length): ${rawPermissionsCount}, ` +
                `permissions count (JS array): ${actualPermissionsInRaw}`,
              );

              if (rawPermissionsCount !== permissionsCount) {
                this.logger.warn(
                  `⚠️  PERMISSION COUNT MISMATCH for role ${resource.data?.name}: ` +
                  `TypeORM extracted ${permissionsCount} but DB has ${rawPermissionsCount}! ` +
                  `This indicates a data extraction issue.`,
                );
              }
            }
          } catch (rawError) {
            this.logger.error(`Error running raw SQL query for comparison: ${rawError.message}`);
          }
        }
      }

      // Convert ResourceEntity to ResourceRecord
      return resources.map((resource) => ({
        id: resource.id,
        business_location_id: resource.businessLocationId,
        resource_type: resource.resourceType,
        resource_id: resource.resourceId,
        data: resource.data,
        start_date: resource.startDate,
        end_date: resource.endDate,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
        shard_id: resource.shardId,
      }));
    } catch (error) {
      this.logger.error(
        `Error querying resources: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to query resources from RDS: ${error.message}`,
      );
    }
  }

  private async getResourceFromRDS(
    businessId: string,
    locationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<ResourceRecord | null> {
    try {
      this.logger.log(
        `Getting resource: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}, resourceId=${resourceId}`,
      );

      const resource = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId: `${businessId}-${locationId}` })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .andWhere('resource.resourceId = :resourceId', { resourceId })
        .getOne();

      if (!resource) {
        this.logger.log(
          `Resource not found: ${businessId}/${locationId}/${resourceType}/${resourceId}`,
        );
        return null;
      }

      this.logger.log(`Found resource: ${resource.id}`);

      // Convert ResourceEntity to ResourceRecord
      return {
        id: resource.id,
        business_location_id: resource.businessLocationId,
        resource_type: resource.resourceType,
        resource_id: resource.resourceId,
        data: resource.data,
        start_date: resource.startDate,
        end_date: resource.endDate,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
        shard_id: resource.shardId,
      };
    } catch (error) {
      this.logger.error(
        `Error getting resource: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get resource from RDS: ${error.message}`,
      );
    }
  }

  private async getResourcesByTypeFromRDS(
    businessId: string,
    locationId: string,
    resourceType?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      this.logger.log(
        `Querying resources by type: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}`,
      );

      const queryBuilder = this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId: `${businessId}-${locationId}` });

      if (resourceType) {
        queryBuilder.andWhere('resource.resourceType = :resourceType', {
          resourceType,
        });
      }

      const resources = await queryBuilder
        .orderBy('resource.startDate', 'DESC')
        .addOrderBy('resource.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      this.logger.log(`Found ${resources.length} resources by type`);

      // Convert ResourceEntity to ResourceRecord
      return resources.map((resource) => ({
        id: resource.id,
        business_location_id: resource.businessLocationId,
        resource_type: resource.resourceType,
        resource_id: resource.resourceId,
        data: resource.data,
        start_date: resource.startDate,
        end_date: resource.endDate,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
        shard_id: resource.shardId,
      }));
    } catch (error) {
      this.logger.error(
        `Error querying resources by type: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get resources by type from RDS: ${error.message}`,
      );
    }
  }

  private async getResourcesByDateRangeFromRDS(
    businessId: string,
    locationId: string,
    resourceType: string,
    startDate: string,
    endDate: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ResourceRecord[]> {
    try {
      this.logger.log(
        `Querying resources by date range: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}, startDate=${startDate}, endDate=${endDate}`,
      );

      const queryBuilder = this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId: `${businessId}-${locationId}` })
        .andWhere('resource.resourceType = :resourceType', { resourceType });

      if (startDate) {
        queryBuilder.andWhere('resource.startDate >= :startDate', {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder.andWhere('resource.endDate <= :endDate', { endDate });
      }

      const resources = await queryBuilder
        .orderBy('resource.startDate', 'DESC')
        .addOrderBy('resource.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      this.logger.log(`Found ${resources.length} resources in date range`);

      // Convert ResourceEntity to ResourceRecord
      return resources.map((resource) => ({
        id: resource.id,
        business_location_id: resource.businessLocationId,
        resource_type: resource.resourceType,
        resource_id: resource.resourceId,
        data: resource.data,
        start_date: resource.startDate,
        end_date: resource.endDate,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
        shard_id: resource.shardId,
      }));
    } catch (error) {
      this.logger.error(
        `Error querying resources by date range: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get resources by date range from RDS: ${error.message}`,
      );
    }
  }

  // Helper methods
  



  private convertToBaseResource(record: ResourceRecord): BaseResource {
    // Extract businessId and locationId from business_location_id
    const [businessId, locationId] = record.business_location_id.split('-');

    return {
      id: record.business_location_id,
      businessId: businessId,
      locationId: locationId,
      resourceType: record.resource_type,
      resourceId: record.resource_id,
      data: {
        // Include the actual data from the database
        ...record.data,
        // Add metadata fields
        startDate: record.start_date,
        endDate: record.end_date,
        resourceType: record.resource_type,
        resourceId: record.resource_id,
      },
      timestamp: record.start_date,
      lastUpdated: record.updated_at.toISOString(),
    };
  }








  /**
   * Build custom filters for TypeORM QueryBuilder (RDS)
   * This method handles all types of field searches including nested data fields
   */
  private buildCustomFilters(
    queryBuilder: any,
    customFilters: any,
  ): any {
    // Skip standard filters that are already handled
    const standardFilters = ['resourceType', 'startDate', 'endDate', 'page', 'limit', 'sortBy', 'sortOrder'];
    
    for (const [filterKey, filterValue] of Object.entries(customFilters)) {
      // Skip standard filters
      if (standardFilters.includes(filterKey)) {
        continue;
      }

      // Handle different types of filters
      if (this.isNestedDataField(filterKey)) {
        this.addNestedDataFieldFilter(queryBuilder, filterKey, filterValue);
      } else if (this.isResourceIdField(filterKey)) {
        this.addResourceIdFilter(queryBuilder, filterValue);
      } else if (this.isLegacyIdField(filterKey)) {
        this.addLegacyIdFilter(queryBuilder, filterKey, filterValue);
      } else if (this.isLegacyNameField(filterKey)) {
        this.addLegacyNameFilter(queryBuilder, filterKey, filterValue);
      } else {
        this.addGenericDataFieldFilter(queryBuilder, filterKey, filterValue);
      }
    }

    return queryBuilder;
  }

  /**
   * Check if the field is a nested data field (e.g., data.doctor.id)
   */
  private isNestedDataField(filterKey: string): boolean {
    return filterKey.startsWith('data.');
  }

  /**
   * Check if the field is a resource ID field
   */
  private isResourceIdField(filterKey: string): boolean {
    return filterKey === 'resource_id' || filterKey === 'resourceId';
  }

  /**
   * Check if the field is a legacy ID field (ends with 'Id')
   */
  private isLegacyIdField(filterKey: string): boolean {
    return filterKey.endsWith('Id') && !this.isResourceIdField(filterKey);
  }

  /**
   * Check if the field is a legacy name field (ends with 'Name')
   */
  private isLegacyNameField(filterKey: string): boolean {
    return filterKey.endsWith('Name');
  }

  /**
   * Add filter for nested data fields (e.g., data.doctor.id, data.treatmentName)
   */
  private addNestedDataFieldFilter(queryBuilder: any, filterKey: string, filterValue: any): void {
    const nestedPath = filterKey.substring(5); // Remove 'data.' prefix
    const pathParts = nestedPath.split('.');
    
    if (pathParts.length === 1) {
      // Direct data field (e.g., data.treatmentName)
      this.addNestedFieldFilter(queryBuilder, pathParts[0], filterValue, 'data');
    } else if (pathParts.length === 2) {
      // Nested data field (e.g., data.doctor.id)
      this.addNestedFieldFilter(queryBuilder, pathParts[1], filterValue, 'data', pathParts[0]);
    } else if (pathParts.length === 3) {
      // Deeply nested data field (e.g., data.doctor.address.street)
      this.addNestedFieldFilter(queryBuilder, pathParts[2], filterValue, 'data', pathParts[0], pathParts[1]);
    }
  }

  /**
   * Add filter for resource ID field
   */
  private addResourceIdFilter(queryBuilder: any, filterValue: any): void {
    queryBuilder.andWhere('resource.resourceId = :resourceId', {
      resourceId: filterValue
    });
  }

  /**
   * Add filter for legacy ID fields (e.g., medicId, patientId)
   */
  private addLegacyIdFilter(queryBuilder: any, filterKey: string, filterValue: any): void {
    const baseField = filterKey.replace('Id', '');
    
    // Try resource_id first, then nested data field
    queryBuilder.andWhere(
      '(resource.resourceId = :resourceId OR resource.data->:baseField->>:idField = :resourceId)',
      {
        resourceId: filterValue,
        baseField: baseField,
        idField: 'id'
      }
    );
  }

  /**
   * Add filter for legacy name fields (e.g., patientName, doctorName)
   */
  private addLegacyNameFilter(queryBuilder: any, filterKey: string, filterValue: any): void {
    const baseField = filterKey.replace('Name', '');
    
    // Try flat name field first, then nested name field
    queryBuilder.andWhere(
      '(resource.data->>:nameField ILIKE :nameValue OR resource.data->:baseField->>:nestedNameField ILIKE :nameValue)',
      {
        nameField: filterKey,
        nameValue: `%${filterValue}%`,
        baseField: baseField,
        nestedNameField: 'name'
      }
    );
  }

  /**
   * Add filter for generic data fields (exact match)
   */
  private addGenericDataFieldFilter(queryBuilder: any, filterKey: string, filterValue: any): void {
    const paramName = `${filterKey}_value`;
    queryBuilder.andWhere(`resource.data->>'${filterKey}' = :${paramName}`, {
      [paramName]: filterValue
    });
  }

  /**
   * Add a nested field filter to the query builder
   * Supports both exact match and partial match (LIKE) based on field type
   */
  private addNestedFieldFilter(
    queryBuilder: any,
    fieldName: string,
    fieldValue: any,
    rootPath: string,
    ...nestedPaths: string[]
  ): void {
    const paramName = `${fieldName}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build the JSON path for the nested field
    let jsonPath = `resource.${rootPath}`;
    for (const path of nestedPaths) {
      jsonPath += `->'${path}'`;
    }
    jsonPath += `->>'${fieldName}'`;

    // Determine if this should be a partial match (LIKE) or exact match
    const isPartialMatch = this.shouldUsePartialMatch(fieldName, fieldValue);
    
    if (isPartialMatch) {
      queryBuilder.andWhere(`${jsonPath} ILIKE :${paramName}`, {
        [paramName]: `%${fieldValue}%`
      });
    } else {
      queryBuilder.andWhere(`${jsonPath} = :${paramName}`, {
        [paramName]: fieldValue
      });
    }
  }

  /**
   * Determine if a field should use partial matching (LIKE) or exact matching
   */
  private shouldUsePartialMatch(fieldName: string, fieldValue: any): boolean {
    // Use partial match for name fields
    if (fieldName.toLowerCase().includes('name') || 
        fieldName.toLowerCase().includes('title') ||
        fieldName.toLowerCase().includes('description') ||
        fieldName.toLowerCase().includes('type')) {
      return true;
    }

    // Use partial match for string values that contain spaces or are longer than 10 characters
    if (typeof fieldValue === 'string' && (fieldValue.includes(' ') || fieldValue.length > 10)) {
      return true;
    }

    // Use exact match for IDs, numbers, and short strings
    return false;
  }

  /**
   * Build custom filters for Citrus SQL queries
   * This method constructs SQL queries for custom filtering with nested field support
   */
  private buildCitrusCustomFilters(
    query: string,
    customFilters: any,
    values: any[],
    paramCount: number,
  ): string {
    let currentParamCount = paramCount;
    const standardFilters = ['resourceType', 'startDate', 'endDate', 'page', 'limit', 'sortBy', 'sortOrder'];
    
    // Iterate through custom filters and add them to the SQL query
    for (const [filterKey, filterValue] of Object.entries(customFilters)) {
      // Skip standard filters
      if (standardFilters.includes(filterKey)) {
        continue;
      }

      // Handle different types of filters
      if (this.isNestedDataField(filterKey)) {
        const result = this.addCitrusNestedDataFieldFilter(filterKey, filterValue, currentParamCount);
        query += result.query;
        values.push(...result.values);
        currentParamCount += result.paramCount;
      } else if (this.isResourceIdField(filterKey)) {
        currentParamCount++;
        query += ` AND resource_id = $${currentParamCount}`;
        values.push(filterValue);
      } else if (this.isLegacyIdField(filterKey)) {
        const result = this.addCitrusLegacyIdFilter(filterKey, filterValue, currentParamCount);
        query += result.query;
        values.push(...result.values);
        currentParamCount += result.paramCount;
      } else if (this.isLegacyNameField(filterKey)) {
        const result = this.addCitrusLegacyNameFilter(filterKey, filterValue, currentParamCount);
        query += result.query;
        values.push(...result.values);
        currentParamCount += result.paramCount;
      } else {
        currentParamCount++;
        query += ` AND data->>'${filterKey}' = $${currentParamCount}`;
        values.push(filterValue);
      }
    }

    return query;
  }

  /**
   * Add Citrus filter for nested data fields
   */
  private addCitrusNestedDataFieldFilter(filterKey: string, filterValue: any, paramCount: number): {
    query: string;
    values: any[];
    paramCount: number;
  } {
    const nestedPath = filterKey.substring(5); // Remove 'data.' prefix
    const pathParts = nestedPath.split('.');
    const currentParamCount = paramCount + 1;
    
    if (pathParts.length === 1) {
      // Direct data field (e.g., data.treatmentName)
      const isPartialMatch = this.shouldUsePartialMatch(pathParts[0], filterValue);
      if (isPartialMatch) {
        return {
          query: ` AND data->>'${pathParts[0]}' ILIKE $${currentParamCount}`,
          values: [`%${filterValue}%`],
          paramCount: 1
        };
      } else {
        return {
          query: ` AND data->>'${pathParts[0]}' = $${currentParamCount}`,
          values: [filterValue],
          paramCount: 1
        };
      }
    } else if (pathParts.length === 2) {
      // Nested data field (e.g., data.doctor.id)
      const isPartialMatch = this.shouldUsePartialMatch(pathParts[1], filterValue);
      if (isPartialMatch) {
        return {
          query: ` AND data->'${pathParts[0]}'->>'${pathParts[1]}' ILIKE $${currentParamCount}`,
          values: [`%${filterValue}%`],
          paramCount: 1
        };
      } else {
        return {
          query: ` AND data->'${pathParts[0]}'->>'${pathParts[1]}' = $${currentParamCount}`,
          values: [filterValue],
          paramCount: 1
        };
      }
    } else if (pathParts.length === 3) {
      // Deeply nested data field (e.g., data.doctor.address.street)
      const isPartialMatch = this.shouldUsePartialMatch(pathParts[2], filterValue);
      if (isPartialMatch) {
        return {
          query: ` AND data->'${pathParts[0]}'->'${pathParts[1]}'->>'${pathParts[2]}' ILIKE $${currentParamCount}`,
          values: [`%${filterValue}%`],
          paramCount: 1
        };
      } else {
        return {
          query: ` AND data->'${pathParts[0]}'->'${pathParts[1]}'->>'${pathParts[2]}' = $${currentParamCount}`,
          values: [filterValue],
          paramCount: 1
        };
      }
    }

    return { query: '', values: [], paramCount: 0 };
  }

  /**
   * Add Citrus filter for legacy ID fields
   */
  private addCitrusLegacyIdFilter(filterKey: string, filterValue: any, paramCount: number): {
    query: string;
    values: any[];
    paramCount: number;
  } {
    const baseField = filterKey.replace('Id', '');
    const currentParamCount = paramCount + 2;
    
    return {
      query: ` AND (resource_id = $${currentParamCount - 1} OR data->'${baseField}'->>'id' = $${currentParamCount})`,
      values: [filterValue, filterValue],
      paramCount: 2
    };
  }

  /**
   * Add Citrus filter for legacy name fields
   */
  private addCitrusLegacyNameFilter(filterKey: string, filterValue: any, paramCount: number): {
    query: string;
    values: any[];
    paramCount: number;
  } {
    const baseField = filterKey.replace('Name', '');
    const currentParamCount = paramCount + 2;
    
    return {
      query: ` AND (data->>'${filterKey}' ILIKE $${currentParamCount - 1} OR data->'${baseField}'->>'name' ILIKE $${currentParamCount})`,
      values: [`%${filterValue}%`, `%${filterValue}%`],
      paramCount: 2
    };
  }


    /**
   * Search resources by business pattern using LIKE operator
   * This searches for resources where business_location_id starts with businessId
   * Useful for finding resources across all locations in a business
   */
    async searchResourcesByBusinessPattern(
      businessId: string,
      resourceType: string,
      resourceId?: string,
    ): Promise<ResourceRecord[]> {
      try {
        this.logger.debug(
          `Searching for ${resourceType} resources in business ${businessId} with pattern matching`,
        );
  
        if (this.shouldUseCitrusForRead()) {
          return await this.searchResourcesByBusinessPatternFromCitrus(
            businessId,
            resourceType,
            resourceId,
          );
        } else {
          return await this.searchResourcesByBusinessPatternFromRDS(
            businessId,
            resourceType,
            resourceId,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error searching resources by business pattern: ${error.message}`,
        );
        throw error;
      }
    }

      /**
   * Search resources by business pattern from RDS using LIKE operator
   */
  private async searchResourcesByBusinessPatternFromRDS(
    businessId: string,
    resourceType: string,
    resourceId?: string,
  ): Promise<ResourceRecord[]> {
    try {
      this.logger.debug(
        `Searching RDS for ${resourceType} resources in business ${businessId} using LIKE operator`,
      );

      // Build the query using LIKE operator to find resources where businessLocationId starts with businessId
      let query = this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId LIKE :businessPattern', {
          businessPattern: `${businessId}-%`,
        })
        .andWhere('resource.resourceType = :resourceType', { resourceType });

      // Add resourceId filter if provided
      if (resourceId) {
        query = query.andWhere('resource.resourceId = :resourceId', { resourceId });
      }

      const resources = await query.getMany();

      this.logger.debug(
        `Found ${resources.length} ${resourceType} resources in business ${businessId}`,
      );

      return resources.map(resource => ({
        id: resource.id,
        business_location_id: resource.businessLocationId,
        resource_type: resource.resourceType,
        resource_id: resource.resourceId,
        data: resource.data,
        start_date: resource.startDate,
        end_date: resource.endDate,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
      }));
    } catch (error) {
      this.logger.error(
        `Error searching RDS for business pattern: ${error.message}`,
      );
      throw error;
    }
  }

    /**
   * Search resources by business pattern from Citrus
   */
    private async searchResourcesByBusinessPatternFromCitrus(
      businessId: string,
      resourceType: string,
      resourceId?: string,
    ): Promise<ResourceRecord[]> {
      try {
        // Use Citrus service to search for resources
        // This would need to be implemented in Citrus service
        this.logger.debug(
          `Searching Citrus for ${resourceType} resources in business ${businessId}`,
        );
  
        // For now, return empty array - implement Citrus search logic here
        this.logger.warn('Citrus search not yet implemented for business pattern search');
        return [];
      } catch (error) {
        this.logger.error(
          `Error searching Citrus for business pattern: ${error.message}`,
        );
        throw error;
      }
    }
}
