import { CloudFormation } from 'aws-sdk';

interface LaunchInput {
  businessId: string;
  businessType: string;
  domainLabel?: string;
  ownerEmail?: string;
  ownerUserId?: string | null;
  locations?: Array<{ id: string; active?: boolean }>;
  timestamp?: string;
}

const cloudFormation = new CloudFormation({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const handler = async (event: LaunchInput): Promise<{ stackName: string }> => {
  const stackPrefix = process.env.CLOUDFORMATION_STACK_PREFIX || 'react-app-';
  const templateUrl = process.env.CLOUDFORMATION_TEMPLATE_URL; // preferred
  const templateBody = process.env.CLOUDFORMATION_TEMPLATE_BODY; // fallback (inline JSON)

  if (!templateUrl && !templateBody) {
    throw new Error('Missing CLOUDFORMATION_TEMPLATE_URL or CLOUDFORMATION_TEMPLATE_BODY');
  }

  const stackName = `${stackPrefix}${event.domainLabel || event.businessId}`;

  const params: CloudFormation.CreateStackInput = {
    StackName: stackName,
    Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
    Parameters: [
      { ParameterKey: 'BusinessId', ParameterValue: event.businessId },
      { ParameterKey: 'BusinessType', ParameterValue: event.businessType },
      { ParameterKey: 'DomainLabel', ParameterValue: event.domainLabel || '' },
    ],
  } as CloudFormation.CreateStackInput;

  if (templateUrl) params.TemplateURL = templateUrl;
  if (!templateUrl && templateBody) params.TemplateBody = templateBody;

  try {
    await cloudFormation.createStack(params).promise();
  } catch (err: any) {
    if (err && err.code === 'AlreadyExistsException') {
      try {
        await cloudFormation
          .updateStack({
            StackName: stackName,
            Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
            Parameters: params.Parameters,
            TemplateURL: params.TemplateURL,
            TemplateBody: params.TemplateBody,
          })
          .promise();
      } catch (updateErr: any) {
        if (updateErr && /No updates are to be performed/i.test(updateErr.message || '')) {
          // no-op
        } else {
          throw updateErr;
        }
      }
    } else {
      throw err;
    }
  }

  return { stackName };
};


