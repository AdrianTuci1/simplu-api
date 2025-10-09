# AWS Console Setup - Cognito Post-Confirmation Lambda

## Step 1: Create IAM Role

### 1.1 Go to IAM Console
```
AWS Console → IAM → Roles → Create role
```

### 1.2 Select Trusted Entity
- **Trusted entity type**: AWS service
- **Use case**: Lambda
- Click **Next**

### 1.3 Add Permissions
Skip this step (we'll add inline policy next)
Click **Next**

### 1.4 Name the Role
- **Role name**: `lambda-cognito-post-confirmation-role`
- **Description**: Role for Cognito post-confirmation Lambda to send SQS messages
- Click **Create role**

## Step 2: Add Inline Policy

### 2.1 Open the Role
IAM → Roles → Search for `lambda-cognito-post-confirmation-role` → Click on it

### 2.2 Add Inline Policy
- Click **Add permissions** → **Create inline policy**
- Click **JSON** tab
- **Delete** the existing template
- **Paste** this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSQSSendMessage",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:*:*:resources-server-queue",
        "arn:aws:sqs:*:*:resources-*"
      ]
    },
    {
      "Sid": "AllowCloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:log-group:/aws/lambda/cognito-post-confirmation",
        "arn:aws:logs:*:*:log-group:/aws/lambda/cognito-post-confirmation:*"
      ]
    }
  ]
}
```

### 2.3 Name the Policy
- **Policy name**: `CognitoPostConfirmationPolicy`
- Click **Create policy**

## Step 3: Create Lambda Function

### 3.1 Go to Lambda Console
```
AWS Console → Lambda → Create function
```

### 3.2 Basic Information
- **Function name**: `cognito-post-confirmation`
- **Runtime**: Node.js 20.x
- **Architecture**: x86_64 (or arm64 for better performance)

### 3.3 Permissions
- **Execution role**: Use an existing role
- **Existing role**: Select `lambda-cognito-post-confirmation-role`

### 3.4 Advanced Settings (Optional)
- Click **Create function**

## Step 4: Upload Lambda Code

### 4.1 Package Lambda Locally
```bash
cd management-server/infra/lambdas
zip cognito-post-confirmation.zip cognito-post-confirmation.mjs
```

### 4.2 Upload to Lambda
- In Lambda console → Code tab
- Click **Upload from** → **.zip file**
- Select `cognito-post-confirmation.zip`
- Click **Save**

## Step 5: Configure Lambda

### 5.1 Set Environment Variables
- Configuration tab → Environment variables → Edit
- Add variable:
  - **Key**: `SQS_QUEUE_URL`
  - **Value**: `https://sqs.eu-central-1.amazonaws.com/YOUR_ACCOUNT_ID/resources-server-queue`
- Click **Save**

### 5.2 Adjust Timeout (Optional)
- Configuration tab → General configuration → Edit
- **Timeout**: 30 seconds
- **Memory**: 256 MB
- Click **Save**

## Step 6: Add Cognito Trigger

### 6.1 Go to Cognito Console
```
AWS Console → Cognito → User pools → Select your pool
```

### 6.2 Add Trigger
- **Triggers** tab
- **Lambda triggers** section
- **Post confirmation trigger**: Click **Add Lambda trigger**
- Select **cognito-post-confirmation**
- Click **Add Lambda trigger**

### 6.3 Verify Trigger
You should see:
```
Post confirmation: cognito-post-confirmation
```

## Step 7: Test the Setup

### 7.1 Test Lambda Directly (Optional)
- Lambda console → Test tab
- Create new test event
- Event template: `Cognito Post-Confirmation`
- Modify the test event:

```json
{
  "userName": "test-user-123",
  "request": {
    "userAttributes": {
      "email": "test@example.com"
    },
    "clientMetadata": {
      "invitationId": "test-uuid-123",
      "businessId": "bus-123",
      "locationId": "loc-001"
    }
  }
}
```

- Click **Test**
- Check logs for SQS message sent

### 7.2 Test Full Flow
1. Create a medic in your app
2. Send invitation
3. Register with the invitation link
4. Check CloudWatch Logs:
   ```
   CloudWatch → Log groups → /aws/lambda/cognito-post-confirmation
   ```

## Troubleshooting

### Lambda not triggered

**Check**:
- [ ] Cognito trigger is configured correctly
- [ ] User confirmed their account (verified email)
- [ ] Lambda has correct permissions

### SQS message not sent

**Check**:
- [ ] `SQS_QUEUE_URL` is correct in Lambda env vars
- [ ] IAM policy allows `sqs:SendMessage`
- [ ] SQS queue exists and is accessible
- [ ] Check CloudWatch Logs for errors

### Logs not visible

**Check**:
- [ ] IAM policy allows `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- [ ] Log group exists: `/aws/lambda/cognito-post-confirmation`

## Quick Copy-Paste Commands

### Create Role (CLI)
```bash
# Create role
aws iam create-role \
  --role-name lambda-cognito-post-confirmation-role \
  --assume-role-policy-document file://cognito-post-confirmation-trust-policy.json

# Attach inline policy
aws iam put-role-policy \
  --role-name lambda-cognito-post-confirmation-role \
  --policy-name CognitoPostConfirmationPolicy \
  --policy-document file://cognito-post-confirmation-iam-policy.json
```

### Create Lambda (CLI)
```bash
# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name lambda-cognito-post-confirmation-role --query 'Role.Arn' --output text)

# Create Lambda
aws lambda create-function \
  --function-name cognito-post-confirmation \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler cognito-post-confirmation.handler \
  --zip-file fileb://cognito-post-confirmation.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={SQS_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/ACCOUNT_ID/resources-server-queue}"
```

### Add Cognito Trigger (CLI)
```bash
aws cognito-idp update-user-pool \
  --user-pool-id eu-central-1_XXXXX \
  --lambda-config PostConfirmation=arn:aws:lambda:eu-central-1:ACCOUNT_ID:function:cognito-post-confirmation
```

## Security Best Practices

1. ✅ **Least Privilege**: Lambda has only necessary permissions
2. ✅ **Resource Scoping**: SQS policy limited to specific queues
3. ✅ **Log Retention**: Set CloudWatch log retention (e.g., 7 days)
4. ✅ **Error Handling**: Lambda doesn't block user registration on errors
5. ✅ **No Secrets**: No sensitive data in environment variables

## Cost Optimization

- **Memory**: 256 MB (sufficient for simple SQS send)
- **Timeout**: 30 seconds (usually completes in <1 second)
- **Expected invocations**: Low (only when users register)
- **Cost**: ~$0.0000002 per invocation (essentially free)

Lambda runs only when users complete registration, so costs are minimal!

