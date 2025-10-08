#!/bin/bash

# Setup IAM permissions for copy-business-files Lambda function
# Usage: ./scripts/setup-copy-business-files-permissions.sh [ROLE_NAME]

ROLE_NAME=${1:-"copy-business-files-role"}
POLICY_NAME="CopyBusinessFilesS3Access"
POLICY_FILE="infra/copy-business-files-policy.json"

echo "🔧 Setting up IAM permissions for copy-business-files Lambda: $ROLE_NAME"
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
  --description "S3 access permissions for copy-business-files Lambda function" \
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

echo "🎉 Copy business files Lambda permissions set up successfully!"
echo "📝 Policy ARN: $POLICY_ARN"
echo "🎯 Role: $ROLE_NAME"
echo ""
echo "📋 Permissions included:"
echo "  ✅ S3:ListAllMyBuckets - Can list all S3 buckets"
echo "  ✅ S3:ListBucket - Can list objects in any bucket"
echo "  ✅ S3:GetObject - Can read from source bucket objects (read-only)"
echo "  ✅ S3:PutObject - Can write to *.simplu.io buckets"
echo "  ✅ S3:DeleteObject - Can delete from *.simplu.io buckets"
echo "  ✅ S3:GetObjectAcl - Can read ACL from *.simplu.io buckets"
echo "  ✅ S3:PutObjectAcl - Can modify ACL on *.simplu.io buckets"
echo ""
echo "🔍 Source bucket patterns (READ-ONLY):"
echo "  - dental-form-simplu"
echo "  - gym-form-simplu" 
echo "  - hotel-form-simplu"
echo "  - business-forms-*"
echo "  - *-form-simplu (any form bucket)"
echo ""
echo "🎯 Target bucket patterns (FULL ACCESS):"
echo "  - *.simplu.io (e.g., clinic-alpha.simplu.io)"
echo "  - Only buckets ending with '.simplu.io'"
