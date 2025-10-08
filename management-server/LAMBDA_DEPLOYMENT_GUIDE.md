# Lambda Deployment Guide

This guide explains how to deploy the AWS Lambda functions after fixing the `aws-sdk` import error.

## Problem Solved

The original error was:
```
Cannot find package 'aws-sdk' imported from /var/task/index.mjs
```

This happened because:
1. Lambda functions were using the old AWS SDK v2 (`aws-sdk` package)
2. The deployment package didn't include the `aws-sdk` dependency
3. Mixed usage of AWS SDK v2 and v3 in the same project

## Solution Applied

### 1. Updated Lambda Functions to AWS SDK v3

All Lambda functions have been updated to use the modern AWS SDK v3:

- `start-infra.mjs` - Uses `@aws-sdk/client-cloudformation`
- `check-infra-status.mjs` - Uses `@aws-sdk/client-cloudformation`
- `update-business-status.mjs` - Uses `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
- `get-ssl-cert.mjs` - Uses `@aws-sdk/client-acm`
- `enqueue-admin-accounts.mjs` - Uses `@aws-sdk/client-sqs`

### 2. Created Lambda-Specific Package Configuration

Created `infra/lambda-package.json` with only the required AWS SDK v3 dependencies for Lambda functions.

### 3. Created Deployment Script

Created `scripts/deploy-lambdas.js` to build deployment packages with proper dependencies.

## Deployment Steps

### Option 1: Using the Deployment Script (Recommended)

```bash
cd management-server
npm run deploy:lambdas
```

This will:
1. Install Lambda-specific dependencies
2. Create individual ZIP files for each Lambda function
3. Include only the necessary AWS SDK v3 packages
4. Place ZIP files in the `infra/` directory

### Option 2: Manual Deployment

1. **Install Lambda Dependencies:**
   ```bash
   cd infra
   cp lambda-package.json package.json
   npm install
   ```

2. **Create Deployment Package for Each Lambda:**
   ```bash
   # For each Lambda function (e.g., start-infra)
   mkdir start-infra-deployment
   cp lambdas/start-infra.mjs start-infra-deployment/index.mjs
   cp -r node_modules start-infra-deployment/
   cd start-infra-deployment
   zip -r ../start-infra.zip .
   cd ..
   ```

3. **Upload to AWS:**
   ```bash
   aws lambda update-function-code --function-name your-function-name --zip-file fileb://start-infra.zip
   ```

## Lambda Runtime Requirements

Make sure your Lambda functions are configured with:
- **Runtime:** Node.js 18.x or later
- **Architecture:** x86_64
- **Memory:** At least 256 MB
- **Timeout:** Appropriate for your use case (default 3 seconds may be too short)

## Environment Variables

Ensure these environment variables are set in your Lambda functions:

```bash
# For start-infra Lambda
CLOUDFORMATION_STACK_PREFIX=react-app-
CLOUDFORMATION_TEMPLATE_URL=https://your-bucket.s3.amazonaws.com/template.json
# OR
CLOUDFORMATION_TEMPLATE_BODY={"AWSTemplateFormatVersion":"2010-09-09",...}
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012

# For update-business-status Lambda
DYNAMODB_TABLE_NAME=your-business-table

# For enqueue-admin-accounts Lambda
SQS_SHARD_CREATION_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue-name

# For get-ssl-cert Lambda
BASE_DOMAIN=simplu.io
```

## Testing the Fix

After deployment, test your Lambda functions:

1. **Check CloudWatch Logs** for any remaining import errors
2. **Test with sample events** to ensure functionality works
3. **Verify AWS SDK v3 commands** are working correctly

## Key Changes Made

### Before (AWS SDK v2):
```javascript
import AWS from 'aws-sdk';
const cloudFormation = new AWS.CloudFormation();
await cloudFormation.createStack(params).promise();
```

### After (AWS SDK v3):
```javascript
import { CloudFormationClient, CreateStackCommand } from '@aws-sdk/client-cloudformation';
const cloudFormation = new CloudFormationClient({});
await cloudFormation.send(new CreateStackCommand(params));
```

## Benefits of AWS SDK v3

- **Smaller bundle size** - Only import what you need
- **Better tree-shaking** - Unused code is eliminated
- **Modern ES modules** - Better compatibility with modern JavaScript
- **Improved performance** - More efficient HTTP handling
- **Better TypeScript support** - Native TypeScript definitions

## Troubleshooting

If you still encounter issues:

1. **Check Lambda logs** in CloudWatch
2. **Verify dependencies** are included in the ZIP file
3. **Ensure runtime** is Node.js 18.x or later
4. **Check IAM permissions** for the Lambda execution role
5. **Verify environment variables** are set correctly

The Lambda functions should now work without the `aws-sdk` import error.
