import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CitrusShardingService } from '../../../config/citrus-sharding.config';
import { BaseResource, ResourceType } from '../types/base-resource';

export interface ResourceRecord {
    id: string;
    business_id: string;
    location_id: string;
    resource_type: string;
    resource_id: string;
    data: any;
    date: string; // business date for indexing (appointment, reservation, etc.)
    operation: string;
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

    constructor(private readonly configService: ConfigService) {
        this.databaseConfig = this.configService.get<DatabaseConfig>('database')!;
        this.citrusService = new CitrusShardingService();
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

            if (this.databaseConfig.type === 'citrus') {
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
     * Get a single resource by ID
     */
    async getResourceById(
        businessId: string,
        locationId: string,
        resourceId: string,
    ): Promise<BaseResource | null> {
        try {
            let resource: ResourceRecord | null;

            if (this.databaseConfig.type === 'citrus') {
                resource = await this.getResourceFromCitrus(businessId, locationId, resourceId);
            } else {
                resource = await this.getResourceFromRDS(businessId, locationId, resourceId);
            }

            if (resource) {
                this.logger.log(`Found resource ${resourceId} for ${businessId}/${locationId}`);
                return this.convertToBaseResource(resource);
            } else {
                this.logger.log(`Resource ${resourceId} not found for ${businessId}/${locationId}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error getting resource ${resourceId}:`, error);
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

            if (this.databaseConfig.type === 'citrus') {
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

            if (this.databaseConfig.type === 'citrus') {
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

            if (this.databaseConfig.type === 'citrus') {
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
                byOperation: {} as Record<string, number>,
                byResourceType: {} as Record<string, number>,
                byDate: {} as Record<string, number>,
            };

            resources.forEach(record => {
                // Count by operation
                stats.byOperation[record.operation] = (stats.byOperation[record.operation] || 0) + 1;

                // Count by resource type
                stats.byResourceType[record.resource_type] = (stats.byResourceType[record.resource_type] || 0) + 1;

                // Count by business date (daily)
                const date = record.date;
                stats.byDate[date] = (stats.byDate[date] || 0) + 1;
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
        resourceId: string,
    ): Promise<ResourceRecord | null> {
        try {
            const shard = await this.citrusService.getShardForBusiness(businessId, locationId);

            // TODO: Implement actual database query using shard connection

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

            // TODO: Implement actual database query using shard connection

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

            // TODO: Implement actual database query using shard connection

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
            // TODO: Implement RDS query using TypeORM or raw SQL

            return [];
        } catch (error) {
            throw new BadRequestException(`Failed to query resources from RDS: ${error.message}`);
        }
    }

    private async getResourceFromRDS(
        businessId: string,
        locationId: string,
        resourceId: string,
    ): Promise<ResourceRecord | null> {
        try {
            // TODO: Implement RDS query using TypeORM or raw SQL

            return null;
        } catch (error) {
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
            // TODO: Implement RDS query using TypeORM or raw SQL

            return [];
        } catch (error) {
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
            // TODO: Implement RDS query using TypeORM or raw SQL

            return [];
        } catch (error) {
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
                const recordDate = new Date(record.date);

                const startDate = filters.startDate || filters.dateFrom;
                const endDate = filters.endDate || filters.dateTo;

                if (startDate && recordDate < new Date(startDate)) {
                    return false;
                }

                if (endDate && recordDate > new Date(endDate)) {
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
            const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;



            // Filter by name (case-insensitive partial match)
            if (customFilters.name) {
                const name = data.name || data.firstName || data.title || '';
                if (!name.toLowerCase().includes(customFilters.name.toLowerCase())) {
                    return false;
                }
            }

            // Filter by active status
            if (customFilters.isActive !== undefined && data.isActive !== customFilters.isActive) {
                return false;
            }

            return true;
        } catch (error) {
            this.logger.warn('Error applying custom filters:', error);
            return true; // Include record if filter fails
        }
    }

    private convertToBaseResource(record: ResourceRecord): BaseResource {
        return {
            id: record.id,
            businessId: record.business_id,
            locationId: record.location_id,
            resourceType: record.resource_type,
            resourceId: record.resource_id,
            data: typeof record.data === 'string' ? JSON.parse(record.data) : record.data,
            timestamp: record.date,
            lastUpdated: record.updated_at.toISOString(),
        };
    }
}