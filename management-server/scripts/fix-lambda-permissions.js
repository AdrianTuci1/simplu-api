#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const POLICY_FILE = path.join(__dirname, '../../management-server-policy.json');
const LAMBDA_ROLE_NAME = 'start-infra-role-e8pvmc5s'; // Replace with actual role name
const POLICY_NAME = 'StartInfraFullAccess';

async function fixLambdaPermissions() {
  try {
    console.log('🔧 Fixing Lambda permissions for CloudFront access...');

    // Check if policy file exists
    if (!fs.existsSync(POLICY_FILE)) {
      throw new Error(`Policy file not found: ${POLICY_FILE}`);
    }

    const policyDocument = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));

    console.log(`📋 Creating policy: ${POLICY_NAME}`);
    
    // Create the IAM policy
    const createPolicyCmd = `aws iam create-policy \
      --policy-name ${POLICY_NAME} \
      --policy-document '${JSON.stringify(policyDocument)}' \
      --description "Full access policy for start-infra Lambda function"`;

    try {
      execSync(createPolicyCmd, { stdio: 'inherit' });
      console.log('✅ Policy created successfully');
    } catch (error) {
      if (error.message.includes('EntityAlreadyExists')) {
        console.log('ℹ️  Policy already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Get the account ID
    const accountId = execSync('aws sts get-caller-identity --query Account --output text', { encoding: 'utf8' }).trim();
    const policyArn = `arn:aws:iam::${accountId}:policy/${POLICY_NAME}`;

    console.log(`🔗 Attaching policy to role: ${LAMBDA_ROLE_NAME}`);
    
    // Attach policy to the Lambda execution role
    const attachPolicyCmd = `aws iam attach-role-policy \
      --role-name ${LAMBDA_ROLE_NAME} \
      --policy-arn ${policyArn}`;

    try {
      execSync(attachPolicyCmd, { stdio: 'inherit' });
      console.log('✅ Policy attached successfully');
    } catch (error) {
      if (error.message.includes('EntityAlreadyExists')) {
        console.log('ℹ️  Policy already attached to role');
      } else {
        throw error;
      }
    }

    console.log('🎉 Lambda permissions fixed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Policy: ${policyArn}`);
    console.log(`- Role: ${LAMBDA_ROLE_NAME}`);
    console.log('- Permissions: CloudFormation, CloudFront, S3, Route53, IAM, ACM, Cognito, SES, DynamoDB');

  } catch (error) {
    console.error('❌ Error fixing Lambda permissions:', error.message);
    process.exit(1);
  }
}

// Alternative method: Update existing policy if role already has a policy
async function updateExistingPolicy() {
  try {
    console.log('🔍 Checking for existing policies on role...');
    
    const listPoliciesCmd = `aws iam list-attached-role-policies --role-name ${LAMBDA_ROLE_NAME}`;
    const policies = JSON.parse(execSync(listPoliciesCmd, { encoding: 'utf8' }));
    
    console.log('📋 Existing policies:', policies.AttachedPolicies.map(p => p.PolicyName));
    
    // If you need to update an existing policy, you can use:
    // aws iam put-role-policy --role-name ROLE_NAME --policy-name POLICY_NAME --policy-document '...'
    
  } catch (error) {
    console.error('❌ Error checking existing policies:', error.message);
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'update') {
    updateExistingPolicy();
  } else {
    fixLambdaPermissions();
  }
}

module.exports = { fixLambdaPermissions, updateExistingPolicy };
