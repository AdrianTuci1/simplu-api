#!/bin/bash

# Fix CloudFront permissions for start-infra Lambda role
# Usage: ./scripts/fix-cloudfront-permissions.sh [ROLE_NAME]

ROLE_NAME=${1:-"start-infra-role-e8pvmc5s"}
POLICY_NAME="StartInfraCloudFrontAccess"

echo "🔧 Fixing CloudFront permissions for Lambda role: $ROLE_NAME"

# Create CloudFront-only policy
cat > /tmp/cloudfront-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:CreateCloudFrontOriginAccessIdentity",
        "cloudfront:DeleteCloudFrontOriginAccessIdentity",
        "cloudfront:GetCloudFrontOriginAccessIdentity",
        "cloudfront:UpdateCloudFrontOriginAccessIdentity",
        "cloudfront:CreateInvalidation",
        "cloudfront:ListDistributions",
        "cloudfront:ListCloudFrontOriginAccessIdentities"
      ],
      "Resource": "*"
    }
  ]
}
EOF

echo "📋 Creating CloudFront policy: $POLICY_NAME"

# Create the policy
aws iam create-policy \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/cloudfront-policy.json \
  --description "CloudFront access for start-infra Lambda function" \
  2>/dev/null || echo "ℹ️  Policy already exists"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

echo "🔗 Attaching policy to role: $ROLE_NAME"

# Attach policy to role
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "$POLICY_ARN" \
  2>/dev/null && echo "✅ Policy attached successfully" || echo "ℹ️  Policy already attached"

# Clean up
rm -f /tmp/cloudfront-policy.json

echo "🎉 CloudFront permissions fixed!"
echo "📝 Policy ARN: $POLICY_ARN"
echo "🎯 Role: $ROLE_NAME"
