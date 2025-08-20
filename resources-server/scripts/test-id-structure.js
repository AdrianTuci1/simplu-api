#!/usr/bin/env node

/**
 * Test script to verify the new table structure with auto-generated id
 * This script tests that the id field is properly auto-generated and resource_id is the business identifier
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

async function testIdStructure() {
  console.log('🚀 Testing ID Structure');
  console.log('======================');
  
  const pool = new Pool(RDS_CONFIG);
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Clean up any existing test data
    await pool.query("DELETE FROM resources WHERE business_id = 'test-business'");
    
    // Test data
    const testData1 = {
      name: 'Test Client 1',
      email: 'test1@example.com',
      phone: '+40123456789'
    };
    
    const testData2 = {
      name: 'Test Client 2',
      email: 'test2@example.com',
      phone: '+40187654321'
    };
    
    // Insert first record
    console.log('\n🧪 Inserting first test record...');
    const insertQuery1 = `
      INSERT INTO resources (
        business_id, location_id, resource_type, resource_id,
        data, start_date, end_date, created_at, updated_at, shard_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values1 = [
      'test-business',
      'test-location',
      'clients',
      'cl24-00001',
      testData1,
      '2024-01-01',
      '2024-01-01',
      new Date(),
      new Date(),
      'test-shard'
    ];
    
    const result1 = await pool.query(insertQuery1, values1);
    const record1 = result1.rows[0];
    
    console.log(`✅ First record inserted with ID: ${record1.id}`);
    console.log(`  - Business ID: ${record1.business_id}`);
    console.log(`  - Location ID: ${record1.location_id}`);
    console.log(`  - Resource ID: ${record1.resource_id}`);
    console.log(`  - Data:`, JSON.stringify(record1.data, null, 2));
    
    // Insert second record with same business_id and location_id but different resource_id
    console.log('\n🧪 Inserting second test record (same business/location, different resource_id)...');
    const values2 = [
      'test-business',
      'test-location',
      'clients',
      'cl24-00002', // Different resource_id
      testData2,
      '2024-01-02',
      '2024-01-02',
      new Date(),
      new Date(),
      'test-shard'
    ];
    
    const result2 = await pool.query(insertQuery1, values2);
    const record2 = result2.rows[0];
    
    console.log(`✅ Second record inserted with ID: ${record2.id}`);
    console.log(`  - Business ID: ${record2.business_id}`);
    console.log(`  - Location ID: ${record2.location_id}`);
    console.log(`  - Resource ID: ${record2.resource_id}`);
    console.log(`  - Data:`, JSON.stringify(record2.data, null, 2));
    
    // Verify IDs are different and auto-generated
    if (record1.id === record2.id) {
      console.log('❌ Both records have the same ID - auto-generation not working');
      return false;
    }
    
    console.log(`✅ Auto-generated IDs are different: ${record1.id} vs ${record2.id}`);
    
    // Verify business_id and location_id can be the same
    if (record1.business_id !== record2.business_id || record1.location_id !== record2.location_id) {
      console.log('❌ Business ID or Location ID are different - should be the same');
      return false;
    }
    
    console.log('✅ Business ID and Location ID are the same for both records');
    
    // Verify resource_id are different
    if (record1.resource_id === record2.resource_id) {
      console.log('❌ Resource IDs are the same - should be different');
      return false;
    }
    
    console.log('✅ Resource IDs are different as expected');
    
    // Query all records for this business/location
    console.log('\n🧪 Querying all records for business/location...');
    const query = `
      SELECT * FROM resources 
      WHERE business_id = $1 AND location_id = $2
      ORDER BY id;
    `;
    
    const queryResult = await pool.query(query, ['test-business', 'test-location']);
    const records = queryResult.rows;
    
    console.log(`✅ Found ${records.length} records for business/location`);
    records.forEach((record, index) => {
      console.log(`  Record ${index + 1}:`);
      console.log(`    - ID: ${record.id}`);
      console.log(`    - Resource ID: ${record.resource_id}`);
      console.log(`    - Name: ${record.data.name}`);
    });
    
    // Test querying by resource_id
    console.log('\n🧪 Querying by specific resource_id...');
    const queryByResourceId = `
      SELECT * FROM resources 
      WHERE business_id = $1 AND location_id = $2 AND resource_id = $3
    `;
    
    const specificResult = await pool.query(queryByResourceId, [
      'test-business', 
      'test-location', 
      'cl24-00001'
    ]);
    
    if (specificResult.rows.length === 1) {
      console.log('✅ Successfully queried by resource_id');
      console.log(`  - Found record with ID: ${specificResult.rows[0].id}`);
      console.log(`  - Resource ID: ${specificResult.rows[0].resource_id}`);
    } else {
      console.log('❌ Failed to query by resource_id');
      return false;
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await pool.query("DELETE FROM resources WHERE business_id = 'test-business'");
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All ID structure tests passed!');
    console.log('✅ Auto-generated ID works correctly');
    console.log('✅ Multiple records can have same business_id/location_id');
    console.log('✅ resource_id is the business identifier');
    console.log('✅ Querying by resource_id works correctly');
    
    return true;
    
  } catch (error) {
    console.log('❌ Error testing ID structure:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testIdStructure().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 ID structure test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  testIdStructure
};
