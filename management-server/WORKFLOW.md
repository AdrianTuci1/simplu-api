## Business Launch Processing via EventBridge

This document describes how a business launch request is processed asynchronously using AWS EventBridge and a downstream worker (Step Functions preferred; Lambda fallback).

### Overview

1) management-server emits `BUSINESS_LAUNCH_REQUESTED` to EventBridge.
2) An EventBridge rule triggers a Step Functions state machine (recommended) or a Lambda function (fallback).
3) The worker performs infrastructure deployment and provisioning, then updates business status and triggers admin account creation via SQS.

### Event

- Source: `management-server.business`
- DetailType: `BUSINESS_LAUNCH_REQUESTED`
- Detail payload:

```
{
  "businessId": "...",
  "businessType": "dental|gym|hotel",
  "domainLabel": "...",
  "ownerEmail": "...",
  "ownerUserId": "...",
  "locations": [{ "id": "loc-1", "active": true }],
  "timestamp": "ISO8601"
}
```

### Environment variables (management-server)

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EVENT_BRIDGE_BUS_NAME=simplu-bus
```

### IAM permissions (management-server)

Allow `events:PutEvents` on the target bus.

```
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["events:PutEvents"],
    "Resource": "*"
  }]
}
```

### Recommended: Step Functions State Machine

Use a state machine to orchestrate long-running tasks instead of keeping a Lambda warm. Typical steps:
- Validate input
- Kick off infra deployment (CloudFormation/S3/CloudFront) asynchronously
- Wait/poll for stack completion (DescribeStacks with backoff) or subscribe to stack events
- Update business status in DynamoDB when infra is ready
- Enqueue admin account creation in SQS for each active location
- Success/Failure branches with metrics and alerts

EventBridge Rule → Target: Step Functions state machine ARN.

### Fallback: Lambda Worker

If Step Functions is not available, attach a Lambda as the target of the EventBridge rule, but DO NOT block until CloudFormation finishes. Instead, Lambda should:
- Start CloudFormation stack creation (async) and return immediately
- Use another mechanism to finalize (e.g., EventBridge stack events → another Lambda, or a scheduled poller) that updates business status and sends SQS messages once the stack reaches a terminal state

### SQS (Admin Account Creation)

Use the existing `SQS_SHARD_CREATION_QUEUE_URL`. Produce messages of type `ADMIN_ACCOUNT_CREATION` for each active location once the infrastructure is ready.

### Frontend UX

After emitting the event, the API returns quickly and the UI shows:

"cererea a fost trimisa spre procesare, poate dura pana la 10 minute pana primiti acces"

### Operations

- Event bus creation:

```
aws events create-event-bus --name simplu-bus --region us-east-1
```

- Rule creation:

```
aws events put-rule \
  --name business-launch-requested \
  --event-bus-name simplu-bus \
  --event-pattern '{
    "source": ["management-server.business"],
    "detail-type": ["BUSINESS_LAUNCH_REQUESTED"]
  }' \
  --region us-east-1
```

- Target Step Functions (preferred):

```
aws events put-targets \
  --event-bus-name simplu-bus \
  --rule business-launch-requested \
  --targets "Id"="launch-sfn","Arn"="arn:aws:states:us-east-1:ACCOUNT_ID:stateMachine:business-launch"
```

Create/Update the state machine (example assumes you resolve ${...} placeholders):

```
aws stepfunctions create-state-machine \
  --name business-launch \
  --definition file://infra/business-launch-state-machine.json \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/StepFunctionsExecutionRole

# or update
aws stepfunctions update-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT_ID:stateMachine:business-launch \
  --definition file://infra/business-launch-state-machine.json
```

### CloudFormation template

Un template minim este inclus la `infra/templates/business-client-template.json` (crează un S3 bucket privat pentru client). Publică-l într-un S3 accesibil CFN și setează variabila `CLOUDFORMATION_TEMPLATE_URL` pentru Lambda `start-infra`:

```
aws s3 cp infra/templates/business-client-template.json s3://YOUR-INFRA-TEMPLATES-BUCKET/business-client-template.json

# apoi în configurarea Lambda:
CLOUDFORMATION_TEMPLATE_URL = https://s3.amazonaws.com/YOUR-INFRA-TEMPLATES-BUCKET/business-client-template.json
CLOUDFORMATION_STACK_PREFIX = react-app-
```

Pentru evoluții viitoare poți extinde template-ul cu CloudFront, ACM și Route53, păstrând același flux orchestrat de Step Functions.

- Target Lambda (fallback):

```
aws events put-targets \
  --event-bus-name simplu-bus \
  --rule business-launch-requested \
  --targets "Id"="launch-worker","Arn"="arn:aws:lambda:us-east-1:ACCOUNT_ID:function:launch-worker"

aws lambda add-permission \
  --function-name launch-worker \
  --statement-id allow-eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:ACCOUNT_ID:rule/business-launch-requested
```

### Notes

- Prefer Step Functions for reliability, retries, long-running orchestration, and observability.
- Keep Lambda short-lived; offload waiting to Step Functions or EventBridge-driven callbacks.
- Ensure CloudWatch Logs and alerts for all components (rule, state machine/Lambda, CFN, SQS consumers).


