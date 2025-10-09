#!/bin/bash

# Deploy Cognito Post-Confirmation Lambda
# This script packages and deploys the Lambda function for Cognito Post-Confirmation trigger

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Deploying Cognito Post-Confirmation Lambda"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
LAMBDA_NAME="cognito-post-confirmation"
RUNTIME="nodejs20.x"
HANDLER="cognito-post-confirmation.handler"
ROLE_NAME="lambda-cognito-post-confirmation-role"

# Get from environment or prompt
if [ -z "$SQS_QUEUE_URL" ]; then
  read -p "Enter SQS Queue URL: " SQS_QUEUE_URL
fi

AWS_REGION=${AWS_REGION:-eu-central-1}

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
echo "📦 Creating Lambda package in $TEMP_DIR"

# Copy Lambda function (no dependencies needed!)
cp cognito-post-confirmation.mjs $TEMP_DIR/

# Create zip file (just the .mjs file, no node_modules!)
cd $TEMP_DIR
echo "📦 Creating zip package (no dependencies - AWS SDK included in runtime)..."
zip -q cognito-post-confirmation.zip cognito-post-confirmation.mjs
cd -

# Move zip to current directory
mv $TEMP_DIR/cognito-post-confirmation.zip ./

echo "✅ Lambda package created: cognito-post-confirmation.zip"
echo ""

# Check if Lambda exists
if aws lambda get-function --function-name $LAMBDA_NAME --region $AWS_REGION &>/dev/null; then
  echo "📝 Lambda exists, updating function code..."
  
  aws lambda update-function-code \
    --function-name $LAMBDA_NAME \
    --zip-file fileb://cognito-post-confirmation.zip \
    --region $AWS_REGION
  
  echo "✅ Lambda code updated"
  echo ""
  
  echo "📝 Updating environment variables..."
  
  aws lambda update-function-configuration \
    --function-name $LAMBDA_NAME \
    --environment "Variables={SQS_QUEUE_URL=$SQS_QUEUE_URL}" \
    --region $AWS_REGION
  
  echo "✅ Environment variables updated"
else
  echo "📝 Lambda doesn't exist, creating..."
  
  # Get or create IAM role
  ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")
  
  if [ -z "$ROLE_ARN" ]; then
    echo "Creating IAM role..."
    
    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    ROLE_ARN=$(aws iam create-role \
      --role-name $ROLE_NAME \
      --assume-role-policy-document file:///tmp/trust-policy.json \
      --query 'Role.Arn' \
      --output text)
    
    # Attach policies
    aws iam attach-role-policy \
      --role-name $ROLE_NAME \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Create and attach SQS policy
    cat > /tmp/sqs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": "*"
    }
  ]
}
EOF
    
    aws iam put-role-policy \
      --role-name $ROLE_NAME \
      --policy-name SQSSendMessagePolicy \
      --policy-document file:///tmp/sqs-policy.json
    
    echo "✅ IAM role created: $ROLE_ARN"
    echo "⏳ Waiting 10 seconds for role to propagate..."
    sleep 10
  fi
  
  # Create Lambda function
  aws lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --zip-file fileb://cognito-post-confirmation.zip \
    --environment "Variables={SQS_QUEUE_URL=$SQS_QUEUE_URL}" \
    --timeout 30 \
    --memory-size 256 \
    --region $AWS_REGION
  
  echo "✅ Lambda created successfully"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Next Steps"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Configure Cognito User Pool trigger:"
echo ""
echo "   aws cognito-idp update-user-pool \\"
echo "     --user-pool-id YOUR_USER_POOL_ID \\"
echo "     --lambda-config PostConfirmation=arn:aws:lambda:$AWS_REGION:ACCOUNT_ID:function:$LAMBDA_NAME"
echo ""
echo "2. Test the invitation flow:"
echo "   - Create a medic in frontend"
echo "   - Click 'Trimite invitație'"
echo "   - Check email"
echo "   - Register with the link"
echo "   - Check RDS that resource_id was updated"
echo ""
echo "3. Monitor Lambda logs:"
echo "   aws logs tail /aws/lambda/$LAMBDA_NAME --follow"
echo ""
echo "═══════════════════════════════════════════════════════════"

# Cleanup
rm -rf $TEMP_DIR
echo ""
echo "✅ Deployment complete!"

