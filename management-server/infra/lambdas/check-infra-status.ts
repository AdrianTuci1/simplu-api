import { CloudFormation } from 'aws-sdk';

interface CheckInput {
  businessId: string;
  domainLabel?: string;
  infraStartResult?: { stackName?: string };
}

const cloudFormation = new CloudFormation({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const handler = async (
  event: CheckInput
): Promise<{ status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'; stackStatus?: string; reason?: string }> => {
  const stackPrefix = process.env.CLOUDFORMATION_STACK_PREFIX || 'react-app-';
  const stackName = event.infraStartResult?.stackName || `${stackPrefix}${event.domainLabel || event.businessId}`;

  const res = await cloudFormation.describeStacks({ StackName: stackName }).promise();
  const stack = res.Stacks && res.Stacks[0];
  const stackStatus = stack?.StackStatus || 'UNKNOWN';

  if (/STATUS$/i.test(stackStatus) === false) {
    // unexpected, treat as in progress
    return { status: 'IN_PROGRESS', stackStatus };
  }

  if (/^(CREATE|UPDATE)_COMPLETE$/.test(stackStatus)) {
    return { status: 'SUCCEEDED', stackStatus };
  }

  if (/ROLLBACK|FAILED|DELETE_COMPLETE/.test(stackStatus)) {
    return { status: 'FAILED', stackStatus, reason: stack?.StackStatusReason };
  }

  return { status: 'IN_PROGRESS', stackStatus };
};


