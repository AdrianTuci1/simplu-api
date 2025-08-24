import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class ResourceIdService {
    private readonly logger = new Logger(ResourceIdService.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * Generate a unique resource ID according to the pattern:
     * {first 2 letters of resource type}{last 2 digits of year}{month}-{5 unique digits}
     * 
     * Examples:
     * - appointments in January 2024: ap24-00001
     * - invoices in December 2024: in24-00001
     * - clients in March 2024: cl24-00001
     */
    async generateResourceId(
        businessId: string,
        locationId: string,
        resourceType: string,
        pool: Pool
    ): Promise<string> {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); // Last 2 digits
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
        
        // Get first 2 letters of resource type (or first letter if only 1 character)
        const typePrefix = resourceType.slice(0, 2).toLowerCase();
        
        // Base ID pattern
        const baseId = `${typePrefix}${year}${month}`;
        
        // Find the next available sequence number
        const sequenceNumber = await this.getNextSequenceNumber(
            businessId,
            locationId,
            resourceType,
            baseId,
            pool
        );
        
        // Format with 5 digits
        const formattedSequence = sequenceNumber.toString().padStart(5, '0');
        
        const resourceId = `${baseId}-${formattedSequence}`;
        
        this.logger.log(`Generated resource ID: ${resourceId} for type: ${resourceType}`);
        
        return resourceId;
    }

    /**
     * Get the next available sequence number for a resource type in a given month
     */
    private async getNextSequenceNumber(
        businessId: string,
        locationId: string,
        resourceType: string,
        baseId: string,
        pool: Pool
    ): Promise<number> {
        try {
            // Query to find the highest sequence number for this base ID
            const query = `
                SELECT resource_id 
                FROM resources 
                WHERE business_location_id = $1 
                AND resource_type = $2 
                AND resource_id LIKE $3
                ORDER BY resource_id DESC 
                LIMIT 1
            `;
            
            const businessLocationId = `${businessId}-${locationId}`;
            const pattern = `${baseId}-%`;
            const result = await pool.query(query, [businessLocationId, resourceType, pattern]);
            
            if (result.rows.length === 0) {
                // No existing resources for this type/month, start with 1
                return 1;
            }
            
            // Extract sequence number from the last resource ID
            const lastResourceId = result.rows[0].resource_id;
            const sequencePart = lastResourceId.split('-')[1];
            const lastSequence = parseInt(sequencePart, 10);
            
            // Return next sequence number
            return lastSequence + 1;
            
        } catch (error) {
            this.logger.error('Error getting next sequence number:', error);
            // Fallback: return current timestamp as sequence
            return Date.now() % 100000; // Last 5 digits of timestamp
        }
    }

    /**
     * Validate if a resource ID follows the correct pattern
     */
    validateResourceId(resourceId: string, resourceType: string): boolean {
        try {
            // Pattern: {typePrefix}{year}{month}-{5 digits}
            const pattern = /^[a-z]{1,2}\d{4}-\d{5}$/;
            
            if (!pattern.test(resourceId)) {
                return false;
            }
            
            // Extract parts
            const [prefix, sequence] = resourceId.split('-');
            const typePrefix = prefix.slice(0, 2);
            const yearMonth = prefix.slice(2);
            
            // Validate year and month
            const year = parseInt(yearMonth.slice(0, 2), 10);
            const month = parseInt(yearMonth.slice(2), 10);
            
            if (year < 0 || year > 99 || month < 1 || month > 12) {
                return false;
            }
            
            // Validate sequence number
            const sequenceNum = parseInt(sequence, 10);
            if (sequenceNum < 1 || sequenceNum > 99999) {
                return false;
            }
            
            // Validate type prefix matches resource type
            const expectedPrefix = resourceType.slice(0, 2).toLowerCase();
            if (typePrefix !== expectedPrefix) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            this.logger.error('Error validating resource ID:', error);
            return false;
        }
    }

    /**
     * Extract information from a resource ID
     */
    parseResourceId(resourceId: string): {
        typePrefix: string;
        year: number;
        month: number;
        sequence: number;
        isValid: boolean;
    } {
        try {
            const pattern = /^([a-z]{1,2})(\d{2})(\d{2})-(\d{5})$/;
            const match = resourceId.match(pattern);
            
            if (!match) {
                return {
                    typePrefix: '',
                    year: 0,
                    month: 0,
                    sequence: 0,
                    isValid: false
                };
            }
            
            const [, typePrefix, yearStr, monthStr, sequenceStr] = match;
            
            return {
                typePrefix,
                year: parseInt(yearStr, 10),
                month: parseInt(monthStr, 10),
                sequence: parseInt(sequenceStr, 10),
                isValid: true
            };
            
        } catch (error) {
            this.logger.error('Error parsing resource ID:', error);
            return {
                typePrefix: '',
                year: 0,
                month: 0,
                sequence: 0,
                isValid: false
            };
        }
    }
}
