const { spawn } = require('child_process');
const path = require('path');

// Test script to verify RDS resource creation works without Citrus sharding
console.log('🧪 Testing RDS Resource Creation...\n');

// Set environment variables for RDS mode
process.env.DATABASE_TYPE = 'rds';
process.env.RDS_HOST = 'localhost';
process.env.RDS_PORT = '5432';
process.env.RDS_USERNAME = 'postgres';
process.env.RDS_PASSWORD = 'test';
process.env.RDS_DATABASE = 'resources_db';
process.env.RDS_SSL = 'false';
process.env.PORT = '3001';

// Start the server in test mode
const server = spawn('npm', ['run', 'start:dev'], {
  cwd: path.join(__dirname),
  stdio: 'pipe',
  env: { ...process.env }
});

let serverStarted = false;
let testCompleted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER] ${output}`);
  
  // Check if server started successfully
  if (output.includes('Application is running on: http://localhost:3001') && !serverStarted) {
    serverStarted = true;
    console.log('✅ Server started successfully in RDS mode');
    
    // Wait a bit for server to fully initialize
    setTimeout(() => {
      testResourceCreation();
    }, 2000);
  }
  
  // Check for any Citrus-related errors
  if (output.includes('Citrus') && output.includes('error')) {
    console.log('❌ Citrus error detected - this should not happen in RDS mode');
    cleanup();
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`[ERROR] ${output}`);
  
  // Check for Citrus-related errors
  if (output.includes('Citrus') && !output.includes('Citrus sharding enabled')) {
    console.log('❌ Citrus error detected - this should not happen in RDS mode');
    cleanup();
  }
});

server.on('close', (code) => {
  if (!testCompleted) {
    console.log(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

async function testResourceCreation() {
  try {
    console.log('\n🧪 Testing resource creation...');
    
    // Test creating a resource via HTTP request
    const response = await fetch('http://localhost:3001/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: 'test-business-123',
        locationId: 'test-location-456',
        resourceType: 'appointment',
        data: {
          patientName: 'John Doe',
          appointmentDate: '2024-01-15T10:00:00Z',
          duration: 60,
          notes: 'Test appointment'
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Resource created successfully:', result);
      console.log('✅ RDS mode is working correctly - no Citrus sharding required');
    } else {
      const error = await response.text();
      console.log('❌ Resource creation failed:', error);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    testCompleted = true;
    cleanup();
  }
}

function cleanup() {
  console.log('\n🧹 Cleaning up...');
  server.kill('SIGTERM');
  
  setTimeout(() => {
    if (!server.killed) {
      server.kill('SIGKILL');
    }
    console.log('✅ Test completed');
    process.exit(0);
  }, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  cleanup();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  cleanup();
});

console.log('🚀 Starting server in RDS mode...\n');
