import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
            this.logger.log('Forcing RDS for read operations due to FORCE_RDS_FOR_READS=true');
            return false;
        }

        // Check if there's a specific environment variable to force Citrus for reads
        const forceCitrusForReads = process.env.FORCE_CITRUS_FOR_READS === 'true';
        
        if (forceCitrusForReads) {
            this.logger.log('Forcing Citrus for read operations due to FORCE_CITRUS_FOR_READS=true');
            return true;
        }

        // Default behavior: use the configured database type
        const useCitrus = this.databaseConfig.type === 'citrus';
        this.logger.log(`Using ${useCitrus ? 'Citrus' : 'RDS'} for read operations (default behavior)`);
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

            // Apply additional filters if provided
            const filteredData = this.applyFilters(data, filters, true);

            // Convert to BaseResource format
            const baseResources = filteredData.map(this.convertToBaseResource);

            // Calculate total pages (approximation since we don't do a count query)
            const total = hasMore ? (pageNum * limitNum) + 1 : (pageNum - 1) * limitNum + baseResources.length;
            const pages = Math.ceil(total / limitNum);

            this.logger.log(`Queried ${baseResources.length} resources for ${businessId}/${locationId}`);

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
                resource = await this.getResourceFromCitrus(businessId, locationId, resourceType, resourceId);
            } else {
                resource = await this.getResourceFromRDS(businessId, locationId, resourceType, resourceId);
            }

            if (resource) {
                this.logger.log(`Found resource ${resourceId} of type ${resourceType} for ${businessId}/${locationId}`);
                return this.convertToBaseResource(resource);
            } else {
                this.logger.log(`Resource ${resourceId} of type ${resourceType} not found for ${businessId}/${locationId}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error getting resource ${resourceId} of type ${resourceType} for ${businessId}/${locationId}:`, error);
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

            this.logger.log(`Found ${resources.length} resources of type ${resourceType}`);
            return resources.map(this.convertToBaseResource);
        } catch (error) {
            this.logger.error(`Error getting resources by type ${resourceType}:`, error);
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

            this.logger.log(`Found ${resources.length} resources between ${startDate} and ${endDate}`);
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

            resources.forEach(record => {
                // Count by resource type
                stats.byResourceType[record.resource_type] = (stats.byResourceType[record.resource_type] || 0) + 1;

                // Count by start date (daily)
                const startDate = record.start_date;
                stats.byStartDate[startDate] = (stats.byStartDate[startDate] || 0) + 1;

                // Count by end date (daily)
                const endDate = record.end_date;
                stats.byEndDate[endDate] = (stats.byEndDate[endDate] || 0) + 1;
            });

            this.logger.log(`Generated stats for ${businessId}/${locationId}: ${stats.total} total resources`);
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
            const shard = await this.citrusService.getShardForBusiness(businessId, locationId);

            // TODO: Implement actual database query using shard connection
            // This would use the shard.connectionString to connect to the specific database
            // and execute SQL queries with proper filtering

            return [];
        } catch (error) {
            throw new BadRequestException(`Failed to query resources from Citrus: ${error.message}`);
        }
    }

    private async getResourceFromCitrus(
        businessId: string,
        locationId: string,
        resourceType: string,
        resourceId: string,
    ): Promise<ResourceRecord | null> {
        try {
            const shard = await this.citrusService.getShardForBusiness(businessId, locationId);

            // TODO: Implement actual database query using shard connection
            // Query should filter by businessId, locationId, resourceType, and resourceId

            return null;
        } catch (error) {
            throw new BadRequestException(`Failed to get resource from Citrus: ${error.message}`);
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
            const shard = await this.citrusService.getShardForBusiness(businessId, locationId);

            let query = 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
            const values = [businessId, locationId];

            if (resourceType) {
                query += ' AND resource_type = $3';
                values.push(resourceType);
                query += ' ORDER BY start_date DESC, created_at DESC LIMIT $4 OFFSET $5';
                values.push(limit.toString(), offset.toString());
            } else {
                query += ' ORDER BY start_date DESC, created_at DESC LIMIT $3 OFFSET $4';
                values.push(limit.toString(), offset.toString());
            }

            this.logger.log(`Executing Citrus type query: ${query} with values: ${JSON.stringify(values)}`);

            // TODO: Execute the query using the shard connection
            // For now, return empty array as the actual database connection needs to be implemented
            return [];
        } catch (error) {
            throw new BadRequestException(`Failed to get resources by type from Citrus: ${error.message}`);
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
            const shard = await this.citrusService.getShardForBusiness(businessId, locationId);

            // Build the SQL query with proper field names (start_date, end_date)
            let query = 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
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

            this.logger.log(`Executing Citrus date range query: ${query} with values: ${JSON.stringify(values)}`);

            // TODO: Execute the query using the shard connection
            // For now, return empty array as the actual database connection needs to be implemented
            return [];
        } catch (error) {
            throw new BadRequestException(`Failed to get resources by date range from Citrus: ${error.message}`);
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
            this.logger.log(`Querying resources: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}`);

            const businessLocationId = `${businessId}-${locationId}`;
            const queryBuilder = this.resourceRepository
                .createQueryBuilder('resource')
                .where('resource.businessLocationId = :businessLocationId', { businessLocationId });

            if (resourceType) {
                queryBuilder.andWhere('resource.resourceType = :resourceType', { resourceType });
            }

            // Apply date filters if provided
            if (filters?.startDate) {
                queryBuilder.andWhere('resource.startDate >= :startDate', { startDate: filters.startDate });
            }

            if (filters?.endDate) {
                queryBuilder.andWhere('resource.endDate <= :endDate', { endDate: filters.endDate });
            }

            const resources = await queryBuilder
                .orderBy('resource.startDate', 'DESC')
                .addOrderBy('resource.createdAt', 'DESC')
                .limit(limit)
                .offset(offset)
                .getMany();

            this.logger.log(`Found ${resources.length} resources`);

            // Convert ResourceEntity to ResourceRecord
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
                shard_id: resource.shardId,
            }));
        } catch (error) {
            this.logger.error(`Error querying resources: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to query resources from RDS: ${error.message}`);
        }
    }

    private async getResourceFromRDS(
        businessId: string,
        locationId: string,
        resourceType: string,
        resourceId: string,
    ): Promise<ResourceRecord | null> {
        try {
            this.logger.log(`Getting resource: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}, resourceId=${resourceId}`);

            const resource = await this.resourceRepository
                .createQueryBuilder('resource')
                .where('resource.businessId = :businessId', { businessId })
                .andWhere('resource.locationId = :locationId', { locationId })
                .andWhere('resource.resourceType = :resourceType', { resourceType })
                .andWhere('resource.resourceId = :resourceId', { resourceId })
                .getOne();

            if (!resource) {
                this.logger.log(`Resource not found: ${businessId}/${locationId}/${resourceType}/${resourceId}`);
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
            this.logger.error(`Error getting resource: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resource from RDS: ${error.message}`);
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
            this.logger.log(`Querying resources by type: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}`);

            const queryBuilder = this.resourceRepository
                .createQueryBuilder('resource')
                .where('resource.businessId = :businessId', { businessId })
                .andWhere('resource.locationId = :locationId', { locationId });

            if (resourceType) {
                queryBuilder.andWhere('resource.resourceType = :resourceType', { resourceType });
            }

            const resources = await queryBuilder
                .orderBy('resource.startDate', 'DESC')
                .addOrderBy('resource.createdAt', 'DESC')
                .limit(limit)
                .offset(offset)
                .getMany();

            this.logger.log(`Found ${resources.length} resources by type`);

            // Convert ResourceEntity to ResourceRecord
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
                shard_id: resource.shardId,
            }));
        } catch (error) {
            this.logger.error(`Error querying resources by type: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by type from RDS: ${error.message}`);
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
            this.logger.log(`Querying resources by date range: businessId=${businessId}, locationId=${locationId}, resourceType=${resourceType}, startDate=${startDate}, endDate=${endDate}`);

            const queryBuilder = this.resourceRepository
                .createQueryBuilder('resource')
                .where('resource.businessId = :businessId', { businessId })
                .andWhere('resource.locationId = :locationId', { locationId })
                .andWhere('resource.resourceType = :resourceType', { resourceType });

            if (startDate) {
                queryBuilder.andWhere('resource.startDate >= :startDate', { startDate });
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
                shard_id: resource.shardId,
            }));
        } catch (error) {
            this.logger.error(`Error querying resources by date range: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by date range from RDS: ${error.message}`);
        }
    }

    // Helper methods
    private applyFilters(data: ResourceRecord[], filters?: any, skipDateFilters: boolean = false): ResourceRecord[] {
        if (!filters) {
            return data;
        }

        return data.filter(record => {
            // Apply date filters only if not already handled by database query
            if (!skipDateFilters && (filters.dateFrom || filters.dateTo || filters.startDate || filters.endDate)) {
                const recordStartDate = new Date(record.start_date);
                const recordEndDate = new Date(record.end_date);

                const startDate = filters.startDate || filters.dateFrom;
                const endDate = filters.endDate || filters.dateTo;

                if (startDate && recordEndDate < new Date(startDate)) {
                    return false;
                }

                if (endDate && recordStartDate > new Date(endDate)) {
                    return false;
                }
            }

            // Apply custom data filters
            if (filters.customFilters) {
                return this.applyCustomFilters(record, filters.customFilters);
            }

            return true;
        });
    }

    private applyCustomFilters(record: ResourceRecord, customFilters: any): boolean {
        try {
            // Since we no longer have a data field, we can only filter by the available fields
            // Filter by resource type
            if (customFilters.resourceType && record.resource_type !== customFilters.resourceType) {
                return false;
            }

            // Filter by date ranges
            if (customFilters.startDate && record.start_date < customFilters.startDate) {
                return false;
            }

            if (customFilters.endDate && record.end_date > customFilters.endDate) {
                return false;
            }

            return true;
        } catch (error) {
            this.logger.warn('Error applying custom filters:', error);
            return true; // Include record if filter fails
        }
    }

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

    // Name-based search methods
    async getResourcesByName(
        businessId: string,
        locationId: string,
        nameField: 'medicName' | 'patientName' | 'trainerName' | 'customerName',
        nameValue: string,
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            this.logger.log(`Searching resources by ${nameField} = "${nameValue}" for ${businessId}/${locationId}`);

            if (this.shouldUseCitrusForRead()) {
                return this.getResourcesByNameFromCitrus(businessId, locationId, nameField, nameValue, resourceType, limit, offset);
            } else {
                return this.getResourcesByNameFromRDS(businessId, locationId, nameField, nameValue, resourceType, limit, offset);
            }
        } catch (error) {
            this.logger.error(`Error searching resources by name: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to search resources by name: ${error.message}`);
        }
    }

    async getResourcesByMultipleNames(
        businessId: string,
        locationId: string,
        nameFilters: {
            medicName?: string;
            patientName?: string;
            trainerName?: string;
            customerName?: string;
        },
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            this.logger.log(`Searching resources by multiple names for ${businessId}/${locationId}`, nameFilters);

            if (this.shouldUseCitrusForRead()) {
                return this.getResourcesByMultipleNamesFromCitrus(businessId, locationId, nameFilters, resourceType, limit, offset);
            } else {
                return this.getResourcesByMultipleNamesFromRDS(businessId, locationId, nameFilters, resourceType, limit, offset);
            }
        } catch (error) {
            this.logger.error(`Error searching resources by multiple names: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to search resources by multiple names: ${error.message}`);
        }
    }

    private async getResourcesByNameFromCitrus(
        businessId: string,
        locationId: string,
        nameField: 'medicName' | 'patientName' | 'trainerName' | 'customerName',
        nameValue: string,
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const shardConnection = await this.citrusService.getShardForBusiness(businessId, locationId);
            const businessLocationId = `${businessId}-${locationId}`;

            // Create a temporary pool connection for this query
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: shardConnection.connectionString,
                max: 1,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            try {
                let query = `SELECT * FROM resources WHERE business_location_id = $1 AND data->>'${nameField}' ILIKE $2`;
                const values = [businessLocationId, `%${nameValue}%`];
                let paramCount = 2;

                if (resourceType) {
                    paramCount++;
                    query += ` AND resource_type = $${paramCount}`;
                    values.push(resourceType);
                }

                query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
                values.push(limit.toString(), offset.toString());

                const result = await pool.query(query, values);
                return result.rows;
            } finally {
                await pool.end();
            }
        } catch (error) {
            this.logger.error(`Error querying resources by name from Citrus: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by name from Citrus: ${error.message}`);
        }
    }

    private async getResourcesByNameFromRDS(
        businessId: string,
        locationId: string,
        nameField: 'medicName' | 'patientName' | 'trainerName' | 'customerName',
        nameValue: string,
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const businessLocationId = `${businessId}-${locationId}`;

            let query = `SELECT * FROM resources WHERE business_location_id = $1 AND data->>'${nameField}' ILIKE $2`;
            const values = [businessLocationId, `%${nameValue}%`];
            let paramCount = 2;

            if (resourceType) {
                paramCount++;
                query += ` AND resource_type = $${paramCount}`;
                values.push(resourceType);
            }

            query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            values.push(limit.toString(), offset.toString());

            const result = await this.resourceRepository.query(query, values);
            return result;
        } catch (error) {
            this.logger.error(`Error querying resources by name from RDS: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by name from RDS: ${error.message}`);
        }
    }

    private async getResourcesByMultipleNamesFromCitrus(
        businessId: string,
        locationId: string,
        nameFilters: {
            medicName?: string;
            patientName?: string;
            trainerName?: string;
            customerName?: string;
        },
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const shardConnection = await this.citrusService.getShardForBusiness(businessId, locationId);
            const businessLocationId = `${businessId}-${locationId}`;

            // Create a temporary pool connection for this query
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: shardConnection.connectionString,
                max: 1,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            try {
                let query = 'SELECT * FROM resources WHERE business_location_id = $1';
                const values = [businessLocationId];
                let paramCount = 1;

                // Adaugă filtrele pentru nume
                Object.entries(nameFilters).forEach(([field, value]) => {
                    if (value) {
                        paramCount++;
                        query += ` AND data->>'${field}' ILIKE $${paramCount}`;
                        values.push(`%${value}%`);
                    }
                });

                if (resourceType) {
                    paramCount++;
                    query += ` AND resource_type = $${paramCount}`;
                    values.push(resourceType);
                }

                query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
                values.push(limit.toString(), offset.toString());

                const result = await pool.query(query, values);
                return result.rows;
            } finally {
                await pool.end();
            }
        } catch (error) {
            this.logger.error(`Error querying resources by multiple names from Citrus: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by multiple names from Citrus: ${error.message}`);
        }
    }

    private async getResourcesByMultipleNamesFromRDS(
        businessId: string,
        locationId: string,
        nameFilters: {
            medicName?: string;
            patientName?: string;
            trainerName?: string;
            customerName?: string;
        },
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const businessLocationId = `${businessId}-${locationId}`;

            let query = 'SELECT * FROM resources WHERE business_location_id = $1';
            const values = [businessLocationId];
            let paramCount = 1;

            // Adaugă filtrele pentru nume
            Object.entries(nameFilters).forEach(([field, value]) => {
                if (value) {
                    paramCount++;
                    query += ` AND data->>'${field}' ILIKE $${paramCount}`;
                    values.push(`%${value}%`);
                }
            });

            if (resourceType) {
                paramCount++;
                query += ` AND resource_type = $${paramCount}`;
                values.push(resourceType);
            }

            query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            values.push(limit.toString(), offset.toString());

            const result = await this.resourceRepository.query(query, values);
            return result;
        } catch (error) {
            this.logger.error(`Error querying resources by multiple names from RDS: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to get resources by multiple names from RDS: ${error.message}`);
        }
    }
}