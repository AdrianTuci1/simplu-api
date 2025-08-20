const { Pool } = require('pg');

// Configuration - update these values for your environment
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'resources_db',
};

async function testNewResourceStructure() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Testing new resource structure...\n');

    // Test 1: Check if table exists with new structure
    console.log('1. Checking table structure...');
    const tableQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      ORDER BY ordinal_position;
    `;
    
    const tableResult = await pool.query(tableQuery);
    console.log('Table columns:');
    tableResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Test 2: Check primary key
    console.log('\n2. Checking primary key...');
    const pkQuery = `
      SELECT tc.constraint_name, tc.table_name, kcu.column_name
      FROM information_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = 'resources';
    `;
    
    const pkResult = await pool.query(pkQuery);
    console.log('Primary key columns:');
    pkResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });

    // Test 3: Check indexes
    console.log('\n3. Checking indexes...');
    const indexQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'resources';
    `;
    
    const indexResult = await pool.query(indexQuery);
    console.log('Indexes:');
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    // Test 4: Test resource ID generation pattern
    console.log('\n4. Testing resource ID generation pattern...');
    
    const testResourceTypes = ['appointments', 'invoices', 'clients', 'members'];
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    testResourceTypes.forEach(type => {
      const prefix = type.slice(0, 2).toLowerCase();
      const expectedPattern = `${prefix}${currentYear}${currentMonth}-`;
      console.log(`  - ${type}: should start with "${expectedPattern}"`);
    });

    // Test 5: Insert test data
    console.log('\n5. Testing data insertion...');
    
    const testData = [
      {
        businessId: 'test-business-1',
        locationId: 'test-location-1',
        resourceType: 'appointments',
        startDate: '2024-01-15',
        endDate: '2024-01-15'
      },
      {
        businessId: 'test-business-2',
        locationId: 'test-location-2',
        resourceType: 'invoices',
        startDate: '2024-01-20',
        endDate: '2024-01-25'
      }
    ];

    for (const data of testData) {
      try {
        // Generate resource ID manually for testing
        const prefix = data.resourceType.slice(0, 2).toLowerCase();
        const resourceId = `${prefix}${currentYear}${currentMonth}-00001`;
        
        const insertQuery = `
          INSERT INTO resources (
            business_id, location_id, resource_type, resource_id,
            start_date, end_date
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (business_id, location_id) DO UPDATE SET
            resource_type = EXCLUDED.resource_type,
            resource_id = EXCLUDED.resource_id,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            updated_at = NOW()
          RETURNING *;
        `;
        
        const result = await pool.query(insertQuery, [
          data.businessId,
          data.locationId,
          data.resourceType,
          resourceId,
          data.startDate,
          data.endDate
        ]);
        
        console.log(`  ✅ Inserted: ${data.businessId}-${data.locationId} (${data.resourceType})`);
        console.log(`     Resource ID: ${result.rows[0].resource_id}`);
        console.log(`     Start Date: ${result.rows[0].start_date}`);
        console.log(`     End Date: ${result.rows[0].end_date}`);
        
      } catch (error) {
        console.log(`  ❌ Failed to insert ${data.businessId}-${data.locationId}: ${error.message}`);
      }
    }

    // Test 6: Query test data
    console.log('\n6. Testing data queries...');
    
    const queryTests = [
      {
        name: 'Query by business and location',
        query: 'SELECT * FROM resources WHERE business_id = $1 AND location_id = $2',
        params: ['test-business-1', 'test-location-1']
      },
      {
        name: 'Query by resource type',
        query: 'SELECT * FROM resources WHERE resource_type = $1',
        params: ['appointments']
      },
      {
        name: 'Query by date range',
        query: 'SELECT * FROM resources WHERE start_date >= $1 AND end_date <= $2',
        params: ['2024-01-01', '2024-01-31']
      }
    ];

    for (const test of queryTests) {
      try {
        const result = await pool.query(test.query, test.params);
        console.log(`  ✅ ${test.name}: ${result.rows.length} records found`);
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }

    // Test 7: Test composite key uniqueness
    console.log('\n7. Testing composite key uniqueness...');
    
    try {
      const duplicateQuery = `
        INSERT INTO resources (
          business_id, location_id, resource_type, resource_id,
          start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6);
      `;
      
      await pool.query(duplicateQuery, [
        'test-business-1',
        'test-location-1',
        'clients',
        'cl2401-00002',
        '2024-01-10',
        '2024-01-10'
      ]);
      
      console.log('  ❌ Duplicate key should have been rejected');
    } catch (error) {
      if (error.message.includes('duplicate key')) {
        console.log('  ✅ Duplicate key correctly rejected');
      } else {
        console.log(`  ❌ Unexpected error: ${error.message}`);
      }
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testNewResourceStructure().catch(console.error);
