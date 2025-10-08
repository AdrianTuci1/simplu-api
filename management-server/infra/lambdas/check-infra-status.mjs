import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

const cloudFormation = new CloudFormationClient({});

export const handler = async (event) => {
  console.log('CheckInfraStatus received event:', JSON.stringify(event, null, 2));
  
  const stackPrefix = process.env.CLOUDFORMATION_STACK_PREFIX || 'react-app-';
  // Use stackName from infraStartResult if available, otherwise build it using domainLabel
  const domainLabel = event?.detail?.domainLabel || event?.domainLabel;
  const businessId = event?.detail?.businessId || event?.businessId;
  const stackName = event?.infraStartResult?.Payload?.stackName || 
                    event?.infraStartResult?.stackName || 
                    `${stackPrefix}${domainLabel || businessId}`;
  
  console.log('Using stackName:', stackName);

  const res = await cloudFormation.send(new DescribeStacksCommand({ StackName: stackName }));
  const stack = res.Stacks && res.Stacks[0];
  const stackStatus = (stack && stack.StackStatus) || 'UNKNOWN';

  if (/STATUS$/i.test(stackStatus) === false) {
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


