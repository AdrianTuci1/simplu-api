import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, ResourceRecord } from './database.service';
import { ResourceQuery } from '../dto/resource-request.dto';

export interface QueryResult {
    data: ResourceRecord[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

@Injectable()
export class ResourceQueryService {
    private readonly logger = new Logger(ResourceQueryService.name);

    constructor(private readonly databaseService: DatabaseService) { }

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

            // Extract date filters for efficient database query
            const startDate = filters?.startDate || filters?.dateFrom;
            const endDate = filters?.endDate || filters?.dateTo;

            // Use date range query if dates are provided, otherwise use regular query
            const resources = startDate || endDate
                ? await this.databaseService.getResourcesByDateRange(
                    businessId,
                    locationId,
                    resourceType,
                    startDate,
                    endDate,
                    limitNum + 1,
                    offset,
                )
                : await this.databaseService.getResourcesByBusiness(
                    businessId,
                    locationId,
                    resourceType,
                    limitNum + 1, // Get one extra to check if there are more pages
                    offset,
                );

            // Check if there are more pages
            const hasMore = resources.length > limitNum;
            const data = hasMore ? resources.slice(0, limitNum) : resources;

            // Apply additional filters if provided (excluding date filters since they're handled by DB)
            const filteredData = this.applyFilters(data, filters, true);

            // Calculate total pages (approximation since we don't do a count query)
            const total = hasMore ? (pageNum * limitNum) + 1 : (pageNum - 1) * limitNum + filteredData.length;
            const pages = Math.ceil(total / limitNum);

            this.logger.log(`Queried ${filteredData.length} resources for ${businessId}/${locationId} ${startDate || endDate ? `(${startDate || 'start'} to ${endDate || 'end'})` : ''}`);

            return {
                data: filteredData,
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

    async getResourceById(
        businessId: string,
        locationId: string,
        resourceId: string,
    ): Promise<ResourceRecord | null> {
        try {
            const resource = await this.databaseService.getResource(businessId, locationId, resourceId);

            if (resource) {
                this.logger.log(`Found resource ${resourceId} for ${businessId}/${locationId}`);
            } else {
                this.logger.log(`Resource ${resourceId} not found for ${businessId}/${locationId}`);
            }

            return resource;
        } catch (error) {
            this.logger.error(`Error getting resource ${resourceId}:`, error);
            throw error;
        }
    }

    async getResourcesByType(
        businessId: string,
        locationId: string,
        resourceType: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const resources = await this.databaseService.getResourcesByBusiness(
                businessId,
                locationId,
                resourceType,
                limit,
                offset,
            );

            this.logger.log(`Found ${resources.length} resources of type ${resourceType}`);
            return resources;
        } catch (error) {
            this.logger.error(`Error getting resources by type ${resourceType}:`, error);
            throw error;
        }
    }

    async getResourcesByDateRange(
        businessId: string,
        locationId: string,
        resourceType: string,
        startDate: string,
        endDate: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        try {
            const resources = await this.databaseService.getResourcesByDateRange(
                businessId,
                locationId,
                resourceType,
                startDate,
                endDate,
                limit,
                offset,
            );

            this.logger.log(`Found ${resources.length} resources of type ${resourceType} between ${startDate} and ${endDate}`);
            return resources;
        } catch (error) {
            this.logger.error(`Error getting resources by date range:`, error);
            throw error;
        }
    }

    private applyFilters(data: ResourceRecord[], filters?: any, skipDateFilters: boolean = false): ResourceRecord[] {
        if (!filters) {
            return data;
        }

        return data.filter(record => {
            // Apply date filters only if not already handled by database query
            if (!skipDateFilters && (filters.dateFrom || filters.dateTo || filters.startDate || filters.endDate)) {
                const recordDate = new Date(record.date); // Use business date field

                const startDate = filters.startDate || filters.dateFrom;
                const endDate = filters.endDate || filters.dateTo;

                if (startDate && recordDate < new Date(startDate)) {
                    return false;
                }

                if (endDate && recordDate > new Date(endDate)) {
                    return false;
                }
            }

            // Apply operation filter
            if (filters.operation && record.operation !== filters.operation) {
                return false;
            }

            // Apply custom data filters based on resource type
            if (filters.customFilters) {
                return this.applyCustomFilters(record, filters.customFilters);
            }

            return true;
        });
    }

    private applyCustomFilters(record: ResourceRecord, customFilters: any): boolean {
        // This method can be extended to handle specific business logic filters
        // based on the resource type and data structure

        try {
            const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;

            // Example: Filter by status
            if (customFilters.status && data.status !== customFilters.status) {
                return false;
            }

            // Example: Filter by name (case-insensitive partial match)
            if (customFilters.name) {
                const name = data.name || data.firstName || data.title || '';
                if (!name.toLowerCase().includes(customFilters.name.toLowerCase())) {
                    return false;
                }
            }

            // Example: Filter by active status
            if (customFilters.isActive !== undefined && data.isActive !== customFilters.isActive) {
                return false;
            }

            return true;
        } catch (error) {
            this.logger.warn('Error applying custom filters:', error);
            return true; // Include record if filter fails
        }
    }

    async getResourceStats(
        businessId: string,
        locationId: string,
        resourceType?: string,
    ): Promise<any> {
        try {
            const resources = await this.databaseService.getResourcesByBusiness(
                businessId,
                locationId,
                resourceType,
                1000, // Get more records for stats
                0,
            );

            const stats = {
                total: resources.length,
                byOperation: {},
                byResourceType: {},
                byDate: {},
            };

            resources.forEach(record => {
                // Count by operation
                stats.byOperation[record.operation] = (stats.byOperation[record.operation] || 0) + 1;

                // Count by resource type
                stats.byResourceType[record.resource_type] = (stats.byResourceType[record.resource_type] || 0) + 1;

                // Count by business date (daily)
                const date = record.date; // Use business date field
                stats.byDate[date] = (stats.byDate[date] || 0) + 1;
            });

            this.logger.log(`Generated stats for ${businessId}/${locationId}: ${stats.total} total resources`);
            return stats;
        } catch (error) {
            this.logger.error('Error generating resource stats:', error);
            throw error;
        }
    }
}