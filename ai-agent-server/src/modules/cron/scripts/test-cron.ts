import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testCronJobs() {
  console.log('🧪 Testing cron jobs...\n');

  const jobs = [
    { name: 'cleanup-sessions', endpoint: '/cron/trigger/cleanup-sessions' },
    { name: 'check-inactive-sessions', endpoint: '/cron/trigger/check-inactive-sessions' },
    { name: 'reservation-reminders', endpoint: '/cron/trigger/reservation-reminders' },
    { name: 'daily-report', endpoint: '/cron/trigger/daily-report' },
    { name: 'validate-credentials', endpoint: '/cron/trigger/validate-credentials' },
    { name: 'check-abandoned-sessions', endpoint: '/cron/trigger/check-abandoned-sessions' },
    { name: 'cleanup-old-messages', endpoint: '/cron/trigger/cleanup-old-messages' },
    { name: 'cleanup-old-sessions', endpoint: '/cron/trigger/cleanup-old-sessions' },
    { name: 'cleanup-expired-credentials', endpoint: '/cron/trigger/cleanup-expired-credentials' },
    { name: 'sync-credentials', endpoint: '/cron/trigger/sync-credentials' },
    { name: 'check-unprocessed-messages', endpoint: '/cron/trigger/check-unprocessed-messages' },
    { name: 'check-error-sessions', endpoint: '/cron/trigger/check-error-sessions' },
    { name: 'backup-data', endpoint: '/cron/trigger/backup-data' },
    { name: 'check-system-performance', endpoint: '/cron/trigger/check-system-performance' }
  ];

  console.log('📋 Testing individual job triggers:');
  console.log('=====================================');

  for (const job of jobs) {
    try {
      console.log(`\n🔄 Testing ${job.name}...`);
      const startTime = Date.now();
      const response = await axios.post(`${BASE_URL}${job.endpoint}`);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ ${job.name}: ${response.data.message} (${duration}ms)`);
    } catch (error) {
      console.error(`❌ ${job.name}: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test status endpoint
  console.log('\n📊 Testing cron status...');
  console.log('==========================');
  try {
    const statusResponse = await axios.get(`${BASE_URL}/cron/status`);
    console.log('✅ Cron status retrieved successfully');
    console.log(`📈 Status: ${statusResponse.data.status}`);
    console.log(`🕐 Last run: ${statusResponse.data.lastRun}`);
    console.log(`⏰ Next run: ${statusResponse.data.nextRun}`);
    console.log(`📋 Total jobs: ${statusResponse.data.jobs.length}`);
  } catch (error) {
    console.error('❌ Cron status:', error.response?.data?.message || error.message);
  }

  // Test health endpoint
  console.log('\n🏥 Testing cron health...');
  console.log('==========================');
  try {
    const healthResponse = await axios.get(`${BASE_URL}/cron/health`);
    console.log('✅ Cron health check successful');
    console.log(`💚 Status: ${healthResponse.data.status}`);
    console.log(`⏱️  Uptime: ${(healthResponse.data.uptime / 3600).toFixed(2)} hours`);
    console.log(`🧠 Memory usage: ${(healthResponse.data.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔧 Active jobs: ${healthResponse.data.activeJobs}`);
  } catch (error) {
    console.error('❌ Cron health:', error.response?.data?.message || error.message);
  }

  // Test metrics endpoint
  console.log('\n📈 Testing cron metrics...');
  console.log('===========================');
  try {
    const metricsResponse = await axios.get(`${BASE_URL}/cron/metrics`);
    console.log('✅ Cron metrics retrieved successfully');
    console.log(`📊 Total jobs executed: ${metricsResponse.data.totalJobsExecuted}`);
    console.log(`✅ Successful jobs: ${metricsResponse.data.successfulJobs}`);
    console.log(`❌ Failed jobs: ${metricsResponse.data.failedJobs}`);
    console.log(`⏱️  Average execution time: ${metricsResponse.data.averageExecutionTime}ms`);
    console.log(`🧠 Memory usage: ${(metricsResponse.data.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ Cron metrics:', error.response?.data?.message || error.message);
  }

  console.log('\n🎉 All cron job tests completed!');
}

async function testSpecificJob(jobName: string) {
  console.log(`🧪 Testing specific job: ${jobName}`);
  
  const jobMap = {
    'cleanup-sessions': '/cron/trigger/cleanup-sessions',
    'check-inactive-sessions': '/cron/trigger/check-inactive-sessions',
    'reservation-reminders': '/cron/trigger/reservation-reminders',
    'daily-report': '/cron/trigger/daily-report',
    'validate-credentials': '/cron/trigger/validate-credentials',
    'check-abandoned-sessions': '/cron/trigger/check-abandoned-sessions',
    'cleanup-old-messages': '/cron/trigger/cleanup-old-messages',
    'cleanup-old-sessions': '/cron/trigger/cleanup-old-sessions',
    'cleanup-expired-credentials': '/cron/trigger/cleanup-expired-credentials',
    'sync-credentials': '/cron/trigger/sync-credentials',
    'check-unprocessed-messages': '/cron/trigger/check-unprocessed-messages',
    'check-error-sessions': '/cron/trigger/check-error-sessions',
    'backup-data': '/cron/trigger/backup-data',
    'check-system-performance': '/cron/trigger/check-system-performance'
  };

  const endpoint = jobMap[jobName];
  if (!endpoint) {
    console.error(`❌ Unknown job: ${jobName}`);
    console.log('Available jobs:', Object.keys(jobMap).join(', '));
    return;
  }

  try {
    console.log(`🔄 Testing ${jobName}...`);
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}${endpoint}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ ${jobName}: ${response.data.message} (${duration}ms)`);
  } catch (error) {
    console.error(`❌ ${jobName}: ${error.response?.data?.message || error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const specificJob = args[0];

if (require.main === module) {
  if (specificJob) {
    testSpecificJob(specificJob)
      .then(() => {
        console.log('\n🎉 Specific job test completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Specific job test failed:', error);
        process.exit(1);
      });
  } else {
    testCronJobs()
      .then(() => {
        console.log('\n🎉 All cron job tests completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Cron job tests failed:', error);
        process.exit(1);
      });
  }
}

export { testCronJobs, testSpecificJob }; 