#!/usr/bin/env node

/**
 * Migration script to update resources table structure
 * Changes from separate business_id + location_id columns to business_location_id composite key
 * Also adds JSON field indexes for name-based searches
 */

const { Pool } = require('pg');
require('dotenv').config();

class MigrationScript {
  constructor() {
    this.logger = console;
    this.pools = new Map();
  }

  async run() {
    this.logger.log('🚀 Starting migration to business_location_id structure...');
    
    try {
      // Get database configuration
      const dbType = process.env.DATABASE_TYPE || 'citrus';
      
      if (dbType === 'rds') {
        await this.migrateRDS();
      } else {
        await this.migrateCitrus();
      }
      
      this.logger.log('✅ Migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await this.closeAllConnections();
    }
  }

  async migrateRDS() {
    this.logger.log('📊 Migrating RDS database...');
    
    const pool = new Pool({
      host: process.env.RDS_HOST || 'localhost',
      port: process.env.RDS_PORT || 5432,
      user: process.env.RDS_USERNAME || 'postgres',
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE || 'simplu',
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
      // Step 1: Create backup table
      await this.createBackupTable(pool);
      
      // Step 2: Add new column
      await this.addBusinessLocationIdColumn(pool);
      
      // Step 3: Migrate data
      await this.migrateData(pool);
      
      // Step 4: Create new indexes
      await this.createNewIndexes(pool);
      
      // Step 5: Drop old columns and indexes
      await this.dropOldStructure(pool);
      
    } finally {
      await pool.end();
    }
  }

  async migrateCitrus() {
    this.logger.log('🍊 Migrating Citrus shards...');
    
    // For Citrus, we need to get all shards and migrate each one
    // This is a simplified version - in production you'd get the shard list from Citrus API
    const citrusUrl = process.env.CITRUS_SERVER_URL;
    const apiKey = process.env.CITRUS_API_KEY;
    
    if (!citrusUrl || !apiKey) {
      throw new Error('CITRUS_SERVER_URL and CITRUS_API_KEY are required for Citrus migration');
    }
    
    // Get shard list from Citrus (this would be implemented based on your Citrus API)
    const shards = await this.getCitrusShards(citrusUrl, apiKey);
    
    for (const shard of shards) {
      this.logger.log(`🔄 Migrating shard: ${shard.shardId}`);
      await this.migrateCitrusShard(shard);
    }
  }

  async createBackupTable(pool) {
    this.logger.log('📋 Creating backup table...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS resources_backup AS 
      SELECT * FROM resources;
    `;
    
    await pool.query(query);
    this.logger.log('✅ Backup table created');
  }

  async addBusinessLocationIdColumn(pool) {
    this.logger.log('➕ Adding business_location_id column...');
    
    const query = `
      ALTER TABLE resources 
      ADD COLUMN IF NOT EXISTS business_location_id VARCHAR(255);
    `;
    
    await pool.query(query);
    this.logger.log('✅ business_location_id column added');
  }

  async migrateData(pool) {
    this.logger.log('🔄 Migrating data...');
    
    const query = `
      UPDATE resources 
      SET business_location_id = business_id || '-' || location_id 
      WHERE business_location_id IS NULL;
    `;
    
    const result = await pool.query(query);
    this.logger.log(`✅ Migrated ${result.rowCount} records`);
  }

  async createNewIndexes(pool) {
    this.logger.log('🔍 Creating new indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_resources_business_location ON resources(business_location_id)',
      'CREATE INDEX IF NOT EXISTS idx_resources_business_type_start_date ON resources(business_location_id, resource_type, start_date)',
      'CREATE INDEX IF NOT EXISTS idx_resources_business_type_end_date ON resources(business_location_id, resource_type, end_date)',
      'CREATE INDEX IF NOT EXISTS idx_data_medic_name ON resources USING GIN ((data->>\'medicName\'))',
      'CREATE INDEX IF NOT EXISTS idx_data_patient_name ON resources USING GIN ((data->>\'patientName\'))',
      'CREATE INDEX IF NOT EXISTS idx_data_trainer_name ON resources USING GIN ((data->>\'trainerName\'))',
      'CREATE INDEX IF NOT EXISTS idx_data_customer_name ON resources USING GIN ((data->>\'customerName\'))'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    
    this.logger.log('✅ New indexes created');
  }

  async dropOldStructure(pool) {
    this.logger.log('🗑️ Dropping old structure...');
    
    const queries = [
      'DROP INDEX IF EXISTS idx_resources_business_location',
      'DROP INDEX IF EXISTS idx_resources_business_type_start_date',
      'DROP INDEX IF EXISTS idx_resources_business_type_end_date',
      'ALTER TABLE resources DROP COLUMN IF EXISTS business_id',
      'ALTER TABLE resources DROP COLUMN IF EXISTS location_id'
    ];
    
    for (const query of queries) {
      await pool.query(query);
    }
    
    this.logger.log('✅ Old structure dropped');
  }



  async getCitrusShards(citrusUrl, apiKey) {
    // This would be implemented based on your Citrus API
    // For now, returning a mock structure
    this.logger.log('📡 Getting shard list from Citrus...');
    
    try {
      const response = await fetch(`${citrusUrl}/api/shards`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Citrus API responded with status: ${response.status}`);
      }
      
      const shards = await response.json();
      this.logger.log(`📊 Found ${shards.length} shards to migrate`);
      return shards;
    } catch (error) {
      this.logger.error('Failed to get shard list from Citrus:', error);
      throw error;
    }
  }

  async migrateCitrusShard(shard) {
    const pool = new Pool({
      connectionString: shard.connectionString,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      await this.createBackupTable(pool);
      await this.addBusinessLocationIdColumn(pool);
      await this.migrateData(pool);
      await this.createNewIndexes(pool);
      await this.dropOldStructure(pool);
      
      this.logger.log(`✅ Shard ${shard.shardId} migrated successfully`);
    } finally {
      await pool.end();
    }
  }

  async closeAllConnections() {
    this.logger.log('🔌 Closing all database connections...');
    
    for (const [name, pool] of this.pools) {
      await pool.end();
      this.logger.log(`✅ Closed connection: ${name}`);
    }
    
    this.pools.clear();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migration = new MigrationScript();
  migration.run().catch(console.error);
}

module.exports = MigrationScript;
