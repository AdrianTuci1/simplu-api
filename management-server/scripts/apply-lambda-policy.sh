#!/bin/bash

# Apply full permissions policy to start-infra Lambda role
# Usage: ./scripts/apply-lambda-policy.sh [ROLE_NAME]

ROLE_NAME=${1:-"start-infra-role-e8pvmc5s"}
POLICY_NAME="StartInfraFullAccess"
POLICY_FILE="../../management-server-policy.json"

echo "🔧 Applying full permissions to Lambda role: $ROLE_NAME"
echo "📋 Policy file: $POLICY_FILE"

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Policy file not found: $POLICY_FILE"
    exit 1
fi

echo "📋 Creating policy: $POLICY_NAME"

# Create the IAM policy
aws iam create-policy \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE" \
  --description "Full access policy for start-infra Lambda function (CloudFormation, CloudFront, S3, Route53, IAM, ACM, Cognito, SES, DynamoDB)" \
  2>/dev/null && echo "✅ Policy created successfully" || echo "ℹ️  Policy already exists"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

echo "🔗 Attaching policy to role: $ROLE_NAME"

# Attach policy to role
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "$POLICY_ARN" \
  2>/dev/null && echo "✅ Policy attached successfully" || echo "ℹ️  Policy already attached"

echo "🎉 Lambda permissions applied successfully!"
echo "📝 Policy ARN: $POLICY_ARN"
echo "🎯 Role: $ROLE_NAME"
echo ""
echo "📋 Permissions included:"
echo "  ✅ CloudFormation (CreateStack, UpdateStack, etc.)"
echo "  ✅ CloudFront (CreateDistribution, CreateCloudFrontOriginAccessIdentity, etc.)"
echo "  ✅ S3 (CreateBucket, PutBucketPolicy, etc.)"
echo "  ✅ Route53 (ChangeResourceRecordSets, GetHostedZone, etc.)"
echo "  ✅ IAM (PassRole for CloudFormation)"
echo "  ✅ ACM (DescribeCertificate for SSL)"
echo "  ✅ Cognito, SES, DynamoDB (for other Lambda functions)"
