import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class ResourceMigrationService {
    private readonly logger = new Logger(ResourceMigrationService.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * Migrate existing resources table to new structure
     * - Change primary key from id to composite (business_id, location_id)
     * - Replace data field with start_date and end_date
     * - Remove operation field
     * - Update indexes
     */
    async migrateResourcesTable(pool: Pool): Promise<void> {
        this.logger.log('Starting resources table migration...');

        try {
            // Step 1: Create backup table
            await this.createBackupTable(pool);

            // Step 2: Create new table structure
            await this.createNewTableStructure(pool);

            // Step 3: Migrate data
            await this.migrateData(pool);

            // Step 4: Drop old table and rename new table
            await this.finalizeMigration(pool);

            this.logger.log('✅ Resources table migration completed successfully');
        } catch (error) {
            this.logger.error('❌ Migration failed:', error);
            throw error;
        }
    }

    private async createBackupTable(pool: Pool): Promise<void> {
        this.logger.log('Creating backup table...');
        
        const createBackupQuery = `
            CREATE TABLE IF NOT EXISTS resources_backup AS 
            SELECT * FROM resources;
        `;
        
        await pool.query(createBackupQuery);
        this.logger.log('✅ Backup table created');
    }

    private async createNewTableStructure(pool: Pool): Promise<void> {
        this.logger.log('Creating new table structure...');
        
        const createNewTableQuery = `
            CREATE TABLE IF NOT EXISTS resources_new (
                business_id VARCHAR(255) NOT NULL,
                location_id VARCHAR(255) NOT NULL,
                resource_type VARCHAR(100) NOT NULL,
                resource_id VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                shard_id VARCHAR(255),
                PRIMARY KEY (business_id, location_id)
            );

            CREATE INDEX IF NOT EXISTS idx_resources_new_business_location 
                ON resources_new(business_id, location_id);
            CREATE INDEX IF NOT EXISTS idx_resources_new_type 
                ON resources_new(resource_type);
            CREATE INDEX IF NOT EXISTS idx_resources_new_start_date 
                ON resources_new(start_date);
            CREATE INDEX IF NOT EXISTS idx_resources_new_end_date 
                ON resources_new(end_date);
            CREATE INDEX IF NOT EXISTS idx_resources_new_business_type_start_date 
                ON resources_new(business_id, location_id, resource_type, start_date);
            CREATE INDEX IF NOT EXISTS idx_resources_new_business_type_end_date 
                ON resources_new(business_id, location_id, resource_type, end_date);
            CREATE INDEX IF NOT EXISTS idx_resources_new_created_at 
                ON resources_new(created_at);
        `;
        
        await pool.query(createNewTableQuery);
        this.logger.log('✅ New table structure created');
    }

    private async migrateData(pool: Pool): Promise<void> {
        this.logger.log('Migrating data...');
        
        // First, let's see what data we have
        const countQuery = 'SELECT COUNT(*) FROM resources';
        const countResult = await pool.query(countQuery);
        const totalRecords = parseInt(countResult.rows[0].count);
        
        this.logger.log(`Found ${totalRecords} records to migrate`);

        if (totalRecords === 0) {
            this.logger.log('No records to migrate');
            return;
        }

        // Get all records from old table
        const selectQuery = 'SELECT * FROM resources ORDER BY created_at';
        const result = await pool.query(selectQuery);
        
        let migratedCount = 0;
        let skippedCount = 0;

        for (const record of result.rows) {
            try {
                // Extract business_id and location_id from the old id field
                const idParts = record.id.split('-');
                if (idParts.length < 3) {
                    this.logger.warn(`Skipping record with invalid ID format: ${record.id}`);
                    skippedCount++;
                    continue;
                }

                const businessId = idParts[0];
                const locationId = idParts[1];
                const resourceId = idParts.slice(2).join('-');

                // Extract dates from data field or use current date
                let startDate = new Date().toISOString().split('T')[0];
                let endDate = startDate;

                if (record.data) {
                    const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                    
                    // Try to extract dates from various fields
                    const dateFields = ['startDate', 'endDate', 'date', 'appointmentDate', 'reservationDate'];
                    
                    for (const field of dateFields) {
                        if (data[field]) {
                            const date = new Date(data[field]);
                            if (!isNaN(date.getTime())) {
                                startDate = date.toISOString().split('T')[0];
                                break;
                            }
                        }
                    }

                    // For end date, try to find it or use start date
                    if (data.endDate) {
                        const endDateObj = new Date(data.endDate);
                        if (!isNaN(endDateObj.getTime())) {
                            endDate = endDateObj.toISOString().split('T')[0];
                        } else {
                            endDate = startDate;
                        }
                    } else {
                        endDate = startDate;
                    }
                }

                // Insert into new table
                const insertQuery = `
                    INSERT INTO resources_new (
                        business_id, location_id, resource_type, resource_id,
                        start_date, end_date, created_at, updated_at, shard_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (business_id, location_id) DO UPDATE SET
                        resource_type = EXCLUDED.resource_type,
                        resource_id = EXCLUDED.resource_id,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        updated_at = EXCLUDED.updated_at
                `;

                await pool.query(insertQuery, [
                    businessId,
                    locationId,
                    record.resource_type,
                    resourceId,
                    startDate,
                    endDate,
                    record.created_at,
                    record.updated_at,
                    record.shard_id
                ]);

                migratedCount++;
                
                if (migratedCount % 100 === 0) {
                    this.logger.log(`Migrated ${migratedCount}/${totalRecords} records`);
                }

            } catch (error) {
                this.logger.error(`Error migrating record ${record.id}:`, error);
                skippedCount++;
            }
        }

        this.logger.log(`✅ Data migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
    }

    private async finalizeMigration(pool: Pool): Promise<void> {
        this.logger.log('Finalizing migration...');
        
        // Drop old table
        await pool.query('DROP TABLE IF EXISTS resources');
        
        // Rename new table to original name
        await pool.query('ALTER TABLE resources_new RENAME TO resources');
        
        // Rename indexes
        await pool.query('ALTER INDEX idx_resources_new_business_location RENAME TO idx_resources_business_location');
        await pool.query('ALTER INDEX idx_resources_new_type RENAME TO idx_resources_type');
        await pool.query('ALTER INDEX idx_resources_new_start_date RENAME TO idx_resources_start_date');
        await pool.query('ALTER INDEX idx_resources_new_end_date RENAME TO idx_resources_end_date');
        await pool.query('ALTER INDEX idx_resources_new_business_type_start_date RENAME TO idx_resources_business_type_start_date');
        await pool.query('ALTER INDEX idx_resources_new_business_type_end_date RENAME TO idx_resources_business_type_end_date');
        await pool.query('ALTER INDEX idx_resources_new_created_at RENAME TO idx_resources_created_at');
        
        this.logger.log('✅ Migration finalized');
    }

    /**
     * Rollback migration if needed
     */
    async rollbackMigration(pool: Pool): Promise<void> {
        this.logger.log('Rolling back migration...');
        
        try {
            // Drop new table
            await pool.query('DROP TABLE IF EXISTS resources');
            
            // Restore from backup
            await pool.query('ALTER TABLE resources_backup RENAME TO resources');
            
            this.logger.log('✅ Migration rolled back successfully');
        } catch (error) {
            this.logger.error('❌ Rollback failed:', error);
            throw error;
        }
    }
}
