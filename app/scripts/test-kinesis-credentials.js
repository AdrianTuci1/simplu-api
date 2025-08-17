#!/usr/bin/env node

/**
 * Test script to verify AWS credentials before testing Kinesis
 * Run with: node scripts/test-kinesis-credentials.js
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testAWSCredentials() {
  console.log('🔐 Testing AWS Credentials...\n');

  // Check environment variables
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log('Environment Variables:');
  console.log(`  AWS_REGION: ${region}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${accessKeyId ? 'Set' : 'Not set'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? 'Set' : 'Not set'}`);

  if (!accessKeyId || !secretAccessKey) {
    console.error('\n❌ Missing required AWS credentials!');
    console.error('Please set the following environment variables:');
    console.error('  - AWS_ACCESS_KEY_ID');
    console.error('  - AWS_SECRET_ACCESS_KEY');
    console.error('  - AWS_REGION (optional, defaults to us-east-1)');
    process.exit(1);
  }

  // Test credentials by calling STS
  const stsClient = new STSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log('\n🔍 Testing credential validity with AWS STS...');
    
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    console.log('✅ AWS credentials are valid!');
    console.log('Account ID:', response.Account);
    console.log('User ID:', response.UserId);
    console.log('ARN:', response.Arn);
    
    console.log('\n🎉 Credentials test passed! You can now test Kinesis.');
    
  } catch (error) {
    console.error('\n❌ AWS credentials are invalid!');
    console.error('Error:', error.message);
    
    if (error.name === 'InvalidClientTokenId') {
      console.error('\n💡 The access key ID is invalid or doesn\'t exist.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('\n💡 The secret access key is incorrect.');
    } else if (error.name === 'ExpiredTokenException') {
      console.error('\n💡 The credentials have expired.');
    } else if (error.name === 'AccessDenied') {
      console.error('\n💡 The credentials don\'t have permission to call STS.');
    }
    
    process.exit(1);
  }
}

testAWSCredentials().catch(console.error);
