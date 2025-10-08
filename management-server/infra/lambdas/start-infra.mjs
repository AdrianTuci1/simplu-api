import { CloudFormationClient, CreateStackCommand, UpdateStackCommand } from '@aws-sdk/client-cloudformation';

// In Lambda, region/credentials come from environment and execution role; no manual injection
const cloudFormation = new CloudFormationClient({});

export const handler = async (event) => {
  const stackPrefix = process.env.CLOUDFORMATION_STACK_PREFIX || 'react-app-';
  const templateUrl = process.env.CLOUDFORMATION_TEMPLATE_URL; // preferred
  const templateBody = process.env.CLOUDFORMATION_TEMPLATE_BODY; // fallback (inline JSON)
  const sslCertificateArn = process.env.SSL_CERTIFICATE_ARN; // from environment

  if (!templateUrl && !templateBody) {
    throw new Error('Missing CLOUDFORMATION_TEMPLATE_URL or CLOUDFORMATION_TEMPLATE_BODY');
  }

  const stackName = `${stackPrefix}${event.domainLabel || event.businessId}`;

  const params = {
    StackName: stackName,
    Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
    Parameters: [
      { ParameterKey: 'BusinessId', ParameterValue: event.businessId },
      { ParameterKey: 'BusinessType', ParameterValue: event.businessType },
      { ParameterKey: 'DomainLabel', ParameterValue: event.domainLabel || '' },
      ...(sslCertificateArn ? [{ ParameterKey: 'SSLCertificateArn', ParameterValue: sslCertificateArn }] : []),
    ],
  };

  if (templateUrl) params.TemplateURL = templateUrl;
  if (!templateUrl && templateBody) params.TemplateBody = templateBody;

  try {
    await cloudFormation.send(new CreateStackCommand(params));
  } catch (err) {
    if (err && err.name === 'AlreadyExistsException') {
      try {
        const updateParams = {
          StackName: stackName,
          Capabilities: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
          Parameters: params.Parameters,
        };
        
        if (params.TemplateURL) updateParams.TemplateURL = params.TemplateURL;
        if (params.TemplateBody) updateParams.TemplateBody = params.TemplateBody;
        
        await cloudFormation.send(new UpdateStackCommand(updateParams));
      } catch (updateErr) {
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


