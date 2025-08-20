import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { citrusShardingService } from '../../../config/citrus-sharding.config';
import { ResourceIdService } from './resource-id.service';

export interface DatabaseConnection {
    type: 'citrus' | 'rds';
    shardId?: string;
    connectionString?: string;
    pool?: Pool;
}

export interface ResourceRecord {
    business_id: string;
    location_id: string;
    resource_type: string;
    resource_id: string;
    data: any;
    start_date: string;
    end_date: string;
    created_at: Date;
    updated_at: Date;
    shard_id?: string;
}

@Injectable()
export class DatabaseService {
    private readonly logger = new Logger(DatabaseService.name);
    private rdsPool: Pool;
    private citrusConnections: Map<string, Pool> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly resourceIdService: ResourceIdService,
    ) {
        this.initializeConnections();
    }

    private async initializeConnections() {
        const dbType = this.configService.get<string>('database.type');
        
        this.logger.log(`Initializing database connections for type: ${dbType}`);

        if (dbType === 'rds') {
            await this.initializeRDS();
        } else if (dbType === 'citrus') {
            this.logger.log('Citrus sharding enabled - connections will be initialized on-demand');
        } else {
            this.logger.warn(`Unknown database type: ${dbType}, defaulting to citrus`);
        }
    }

    private async initializeRDS() {
        const rdsConfig = this.configService.get('database.rds');

        this.logger.log(`Initializing RDS connection to ${rdsConfig.host}:${rdsConfig.port}/${rdsConfig.database}`);

        this.rdsPool = new Pool({
            host: rdsConfig.host,
            port: rdsConfig.port,
            user: rdsConfig.username,
            password: rdsConfig.password,
            database: rdsConfig.database,
            ssl: rdsConfig.ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test connection
        try {
            await this.rdsPool.query('SELECT 1');
            this.logger.log(`✅ RDS connection successful to ${rdsConfig.host}:${rdsConfig.port}/${rdsConfig.database}`);
        } catch (error) {
            this.logger.error(`❌ RDS connection failed to ${rdsConfig.host}:${rdsConfig.port}/${rdsConfig.database}:`, error);
            throw error;
        }

        // Create tables if they don't exist
        await this.createRDSTables();
        this.logger.log('RDS tables created/verified successfully');
    }

    private async createRDSTables() {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS resources (
        business_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        shard_id VARCHAR(255),
        PRIMARY KEY (business_id, location_id)
      );

      CREATE INDEX IF NOT EXISTS idx_resources_business_location 
        ON resources(business_id, location_id);
      CREATE INDEX IF NOT EXISTS idx_resources_type 
        ON resources(resource_type);
      CREATE INDEX IF NOT EXISTS idx_resources_start_date 
        ON resources(start_date);
      CREATE INDEX IF NOT EXISTS idx_resources_end_date 
        ON resources(end_date);
      CREATE INDEX IF NOT EXISTS idx_resources_business_type_start_date 
        ON resources(business_id, location_id, resource_type, start_date);
      CREATE INDEX IF NOT EXISTS idx_resources_business_type_end_date 
        ON resources(business_id, location_id, resource_type, end_date);
      CREATE INDEX IF NOT EXISTS idx_resources_created_at 
        ON resources(created_at);
    `;

        await this.rdsPool.query(createTableQuery);
    }

    async getConnection(businessId: string, locationId: string): Promise<DatabaseConnection> {
        const dbType = this.configService.get<string>('database.type');

        if (dbType === 'rds') {
            return {
                type: 'rds',
                pool: this.rdsPool,
            };
        } else {
            // Citrus sharding
            const shardConnection = await citrusShardingService.getShardForBusiness(businessId, locationId);

            if (!this.citrusConnections.has(shardConnection.shardId)) {
                this.logger.log(`Initializing Citrus connection to shard ${shardConnection.shardId}`);

                const pool = new Pool({
                    connectionString: shardConnection.connectionString,
                    max: 10,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });

                // Test connection
                try {
                    await pool.query('SELECT 1');
                    this.logger.log(`✅ Citrus connection successful to shard ${shardConnection.shardId}`);
                } catch (error) {
                    this.logger.error(`❌ Citrus connection failed to shard ${shardConnection.shardId}:`, error);
                    throw error;
                }

                this.citrusConnections.set(shardConnection.shardId, pool);
                await this.createCitrusTables(pool);
                this.logger.log(`Citrus tables created/verified successfully for shard ${shardConnection.shardId}`);
            } else {
                this.logger.log(`Using existing Citrus connection to shard ${shardConnection.shardId}`);
            }

            return {
                type: 'citrus',
                shardId: shardConnection.shardId,
                connectionString: shardConnection.connectionString,
                pool: this.citrusConnections.get(shardConnection.shardId),
            };
        }
    }

    private async createCitrusTables(pool: Pool) {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS resources (
        business_id VARCHAR(255) NOT NULL,
        location_id VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        shard_id VARCHAR(255),
        PRIMARY KEY (business_id, location_id)
      );

      CREATE INDEX IF NOT EXISTS idx_resources_business_location 
        ON resources(business_id, location_id);
      CREATE INDEX IF NOT EXISTS idx_resources_type 
        ON resources(resource_type);
      CREATE INDEX IF NOT EXISTS idx_resources_start_date 
        ON resources(start_date);
      CREATE INDEX IF NOT EXISTS idx_resources_end_date 
        ON resources(end_date);
      CREATE INDEX IF NOT EXISTS idx_resources_business_type_start_date 
        ON resources(business_id, location_id, resource_type, start_date);
      CREATE INDEX IF NOT EXISTS idx_resources_business_type_end_date 
        ON resources(business_id, location_id, resource_type, end_date);
      CREATE INDEX IF NOT EXISTS idx_resources_created_at 
        ON resources(created_at);
    `;

        await pool.query(createTableQuery);
    }

    async saveResource(
        businessId: string,
        locationId: string,
        resourceType: string,
        data: any,
        startDate: string,
        endDate: string,
        resourceId?: string,
    ): Promise<ResourceRecord> {
        const connection = await this.getConnection(businessId, locationId);

        // Generate resource ID if not provided
        if (!resourceId) {
            resourceId = await this.resourceIdService.generateResourceId(
                businessId,
                locationId,
                resourceType,
                connection.pool
            );
        }

        const record: ResourceRecord = {
            business_id: businessId,
            location_id: locationId,
            resource_type: resourceType,
            resource_id: resourceId,
            data: data,
            start_date: startDate,
            end_date: endDate,
            created_at: new Date(),
            updated_at: new Date(),
            shard_id: connection.shardId,
        };

        const query = `
      INSERT INTO resources (
        business_id, location_id, resource_type, resource_id, 
        data, start_date, end_date, created_at, updated_at, shard_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (business_id, location_id) DO UPDATE SET
        resource_type = EXCLUDED.resource_type,
        resource_id = EXCLUDED.resource_id,
        data = EXCLUDED.data,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;

        const values = [
            record.business_id,
            record.location_id,
            record.resource_type,
            record.resource_id,
            record.data,
            record.start_date,
            record.end_date,
            record.created_at,
            record.updated_at,
            record.shard_id,
        ];

        const result = await connection.pool.query(query, values);

        this.logger.log(`✅ Saved resource ${resourceId} to ${connection.type} database${connection.shardId ? ` (shard: ${connection.shardId})` : ''}`);
        return result.rows[0];
    }

    async deleteResource(
        businessId: string,
        locationId: string,
    ): Promise<boolean> {
        const connection = await this.getConnection(businessId, locationId);

        const query = 'DELETE FROM resources WHERE business_id = $1 AND location_id = $2';

        const result = await connection.pool.query(query, [businessId, locationId]);

        this.logger.log(`✅ Deleted resource for ${businessId}/${locationId} from ${connection.type} database${connection.shardId ? ` (shard: ${connection.shardId})` : ''}`);
        return result.rowCount > 0;
    }

    async getResource(
        businessId: string,
        locationId: string,
    ): Promise<ResourceRecord | null> {
        const connection = await this.getConnection(businessId, locationId);

        const query = 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';

        const result = await connection.pool.query(query, [businessId, locationId]);

        return result.rows[0] || null;
    }

    async getResourcesByBusiness(
        businessId: string,
        locationId: string,
        resourceType?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        const connection = await this.getConnection(businessId, locationId);

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

        const result = await connection.pool.query(query, values);

        return result.rows;
    }

    async getResourcesByDateRange(
        businessId: string,
        locationId: string,
        resourceType?: string,
        startDate?: string,
        endDate?: string,
        limit: number = 100,
        offset: number = 0,
    ): Promise<ResourceRecord[]> {
        const connection = await this.getConnection(businessId, locationId);

        let query = 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2';
        const values = [businessId, locationId];
        let paramCount = 2;

        if (resourceType) {
            paramCount++;
            query += ` AND resource_type = $${paramCount}`;
            values.push(resourceType);
        }

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

        query += ` ORDER BY start_date DESC, created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        values.push(limit.toString(), offset.toString());

        const result = await connection.pool.query(query, values);

        return result.rows;
    }

    async closeConnections() {
        this.logger.log('Closing database connections...');

        if (this.rdsPool) {
            await this.rdsPool.end();
            this.logger.log('✅ RDS connection closed');
        }

        for (const [shardId, pool] of this.citrusConnections) {
            await pool.end();
            this.logger.log(`✅ Citrus connection closed for shard ${shardId}`);
        }

        this.citrusConnections.clear();
        this.logger.log('All database connections closed successfully');
    }
}