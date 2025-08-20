#!/usr/bin/env node

/**
 * Test script to verify that the resources table is created with the data field
 * This script tests the table creation in both RDS and Citrus modes
 */

const { Pool } = require('pg');

// Configuration
const RDS_CONFIG = {
  host: process.env.RDS_HOST || 'localhost',
  port: process.env.RDS_PORT || 5432,
  username: process.env.RDS_USERNAME || 'postgres',
  password: process.env.RDS_PASSWORD || 'postgres',
  database: process.env.RDS_DATABASE || 'test_db',
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const CITRUS_CONFIG = {
  host: process.env.CITRUS_HOST || 'localhost',
  port: process.env.CITRUS_PORT || 5432,
  username: process.env.CITRUS_USERNAME || 'postgres',
  password: process.env.CITRUS_PASSWORD || 'postgres',
  database: process.env.CITRUS_DATABASE || 'citrus_test',
  ssl: process.env.CITRUS_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function testTableStructure(pool, databaseName) {
  console.log(`\n🧪 Testing table structure for ${databaseName}...`);
  
  try {
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'resources'
      );
    `;
    
    const tableExistsResult = await pool.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (!tableExists) {
      console.log(`❌ Table 'resources' does not exist in ${databaseName}`);
      return false;
    }
    
    console.log(`✅ Table 'resources' exists in ${databaseName}`);
    
    // Check table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'resources'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    const columns = columnsResult.rows;
    
    console.log(`\n📋 Table columns in ${databaseName}:`);
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for required columns
    const requiredColumns = [
      'id',
      'business_id',
      'location_id', 
      'resource_type',
      'resource_id',
      'data',
      'start_date',
      'end_date',
      'created_at',
      'updated_at',
      'shard_id'
    ];
    
    const existingColumns = columns.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns in ${databaseName}:`, missingColumns);
      return false;
    }
    
    console.log(`✅ All required columns exist in ${databaseName}`);
    
    // Check id column type
    const idColumn = columns.find(col => col.column_name === 'id');
    if (!idColumn) {
      console.log(`❌ ID column not found in ${databaseName}`);
      return false;
    }
    
    if (idColumn.data_type !== 'bigint') {
      console.log(`❌ ID column has wrong type in ${databaseName}: ${idColumn.data_type} (expected: bigint)`);
      return false;
    }
    
    console.log(`✅ ID column has correct type (bigint) in ${databaseName}`);
    
    // Check data column type
    const dataColumn = columns.find(col => col.column_name === 'data');
    if (!dataColumn) {
      console.log(`❌ Data column not found in ${databaseName}`);
      return false;
    }
    
    if (dataColumn.data_type !== 'jsonb') {
      console.log(`❌ Data column has wrong type in ${databaseName}: ${dataColumn.data_type} (expected: jsonb)`);
      return false;
    }
    
    console.log(`✅ Data column has correct type (jsonb) in ${databaseName}`);
    
    // Check indexes
    const indexesQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'resources'
      AND schemaname = 'public';
    `;
    
    const indexesResult = await pool.query(indexesQuery);
    const indexes = indexesResult.rows;
    
    console.log(`\n🔍 Indexes in ${databaseName}:`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    // Check for required indexes
    const requiredIndexes = [
      'idx_resources_business_location',
      'idx_resources_type',
      'idx_resources_start_date',
      'idx_resources_end_date',
      'idx_resources_business_type_start_date',
      'idx_resources_business_type_end_date',
      'idx_resources_created_at'
    ];
    
    const existingIndexes = indexes.map(idx => idx.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log(`⚠️  Missing indexes in ${databaseName}:`, missingIndexes);
    } else {
      console.log(`✅ All required indexes exist in ${databaseName}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error testing table structure for ${databaseName}:`, error.message);
    return false;
  }
}

async function testDataInsertion(pool, databaseName) {
  console.log(`\n🧪 Testing data insertion for ${databaseName}...`);
  
  try {
    // Test data
    const testData = {
      name: 'Test Client',
      email: 'test@example.com',
      phone: '+40123456789',
      address: {
        street: 'Test Street',
        city: 'București',
        country: 'România'
      }
    };
    
    // Insert test record
    const insertQuery = `
      INSERT INTO resources (
        business_id, location_id, resource_type, resource_id,
        data, start_date, end_date, created_at, updated_at, shard_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values = [
      'test-business',
      'test-location',
      'clients',
      'cl24-00001',
      testData,
      '2024-01-01',
      '2024-01-01',
      new Date(),
      new Date(),
      'test-shard'
    ];
    
    const insertResult = await pool.query(insertQuery, values);
    const insertedRecord = insertResult.rows[0];
    
    console.log(`✅ Successfully inserted test record in ${databaseName}`);
    console.log(`  - Business ID: ${insertedRecord.business_id}`);
    console.log(`  - Location ID: ${insertedRecord.location_id}`);
    console.log(`  - Resource Type: ${insertedRecord.resource_type}`);
    console.log(`  - Resource ID: ${insertedRecord.resource_id}`);
    console.log(`  - Data:`, JSON.stringify(insertedRecord.data, null, 2));
    
    // Verify data field
    if (!insertedRecord.data) {
      console.log(`❌ Data field is null in ${databaseName}`);
      return false;
    }
    
    if (insertedRecord.data.name !== 'Test Client') {
      console.log(`❌ Data field content is incorrect in ${databaseName}`);
      return false;
    }
    
    console.log(`✅ Data field contains correct content in ${databaseName}`);
    
    // Query the record
    const selectQuery = `
      SELECT * FROM resources 
      WHERE business_id = $1 AND location_id = $2
    `;
    
    const selectResult = await pool.query(selectQuery, ['test-business', 'test-location']);
    const queriedRecord = selectResult.rows[0];
    
    if (!queriedRecord) {
      console.log(`❌ Could not query inserted record in ${databaseName}`);
      return false;
    }
    
    console.log(`✅ Successfully queried record in ${databaseName}`);
    console.log(`  - Queried data:`, JSON.stringify(queriedRecord.data, null, 2));
    
    // Clean up
    const deleteQuery = `
      DELETE FROM resources 
      WHERE business_id = $1 AND location_id = $2
    `;
    
    await pool.query(deleteQuery, ['test-business', 'test-location']);
    console.log(`✅ Cleaned up test record in ${databaseName}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error testing data insertion for ${databaseName}:`, error.message);
    return false;
  }
}

async function testRDS() {
  console.log('\n🚀 Testing RDS Database...');
  
  const rdsPool = new Pool(RDS_CONFIG);
  
  try {
    // Test connection
    await rdsPool.query('SELECT 1');
    console.log('✅ RDS connection successful');
    
    const structureOk = await testTableStructure(rdsPool, 'RDS');
    const insertionOk = await testDataInsertion(rdsPool, 'RDS');
    
    return structureOk && insertionOk;
    
  } catch (error) {
    console.log('❌ RDS connection failed:', error.message);
    return false;
  } finally {
    await rdsPool.end();
  }
}

async function testCitrus() {
  console.log('\n🚀 Testing Citrus Database...');
  
  const citrusPool = new Pool(CITRUS_CONFIG);
  
  try {
    // Test connection
    await citrusPool.query('SELECT 1');
    console.log('✅ Citrus connection successful');
    
    const structureOk = await testTableStructure(citrusPool, 'Citrus');
    const insertionOk = await testDataInsertion(citrusPool, 'Citrus');
    
    return structureOk && insertionOk;
    
  } catch (error) {
    console.log('❌ Citrus connection failed:', error.message);
    return false;
  } finally {
    await citrusPool.end();
  }
}

async function runTableCreationTests() {
  console.log('🚀 Starting Table Creation Tests');
  console.log('================================');
  
  const results = {
    rds: false,
    citrus: false
  };

  // Test RDS
  results.rds = await testRDS();
  
  // Test Citrus
  results.citrus = await testCitrus();

  // Summary
  console.log('\n📊 Table Creation Test Results Summary:');
  console.log('========================================');
  Object.entries(results).forEach(([database, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${database.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} databases passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All table creation tests passed! The data field is properly included in table creation.');
    process.exit(0);
  } else {
    console.log('⚠️  Some table creation tests failed. Please check the database setup.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTableCreationTests().catch(error => {
    console.error('💥 Table creation test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  testTableStructure,
  testDataInsertion,
  testRDS,
  testCitrus,
  runTableCreationTests
};
