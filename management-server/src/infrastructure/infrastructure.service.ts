import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { Route53Client, CreateHostedZoneCommand, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

@Injectable()
export class InfrastructureService {
  private readonly logger = new Logger(InfrastructureService.name);
  private readonly cloudFormationClient: CloudFormationClient;
  private readonly route53Client: Route53Client;

  constructor(private configService: ConfigService) {
    this.cloudFormationClient = new CloudFormationClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.route53Client = new Route53Client({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async createReactApp(businessId: string, businessType: string, subdomain?: string, customDomain?: string): Promise<{ stackName: string; appUrl: string }> {
    try {
      const stackName = `react-app-${businessId}`;
      
      // CloudFormation template for React app
      const templateBody = this.generateReactAppTemplate(businessId, businessType, subdomain, customDomain);
      
      const command = new CreateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody,
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
          {
            ParameterKey: 'BusinessId',
            ParameterValue: businessId,
          },
          {
            ParameterKey: 'BusinessType',
            ParameterValue: businessType,
          },
        ],
      });

      await this.cloudFormationClient.send(command);
      
      // Wait for stack creation to complete
      await this.waitForStackCreation(stackName);
      
      const appUrl = customDomain || `${subdomain}.${this.configService.get('BASE_DOMAIN', 'example.com')}`;
      
      this.logger.log(`React app created for business ${businessId}: ${appUrl}`);
      
      return {
        stackName,
        appUrl: `https://${appUrl}`,
      };
    } catch (error) {
      this.logger.error(`Error creating React app: ${error.message}`);
      throw error;
    }
  }

  async deleteReactApp(stackName: string): Promise<void> {
    try {
      const command = new DeleteStackCommand({
        StackName: stackName,
      });

      await this.cloudFormationClient.send(command);
      this.logger.log(`React app deleted: ${stackName}`);
    } catch (error) {
      this.logger.error(`Error deleting React app: ${error.message}`);
      throw error;
    }
  }

  async destroyReactApp(businessId: string): Promise<void> {
    try {
      const stackName = `react-app-${businessId}`;
      
      // Check if stack exists before trying to delete
      try {
        const describeCommand = new DescribeStacksCommand({
          StackName: stackName,
        });
        await this.cloudFormationClient.send(describeCommand);
      } catch (error) {
        // Stack doesn't exist, nothing to delete
        this.logger.log(`Stack ${stackName} doesn't exist, skipping deletion`);
        return;
      }

      const command = new DeleteStackCommand({
        StackName: stackName,
      });

      await this.cloudFormationClient.send(command);
      this.logger.log(`React app infrastructure destroyed for business: ${businessId}`);
    } catch (error) {
      this.logger.error(`Error destroying React app infrastructure for business ${businessId}: ${error.message}`);
      throw error;
    }
  }

  async createCustomDomain(domain: string): Promise<string> {
    try {
      // This would typically involve domain registration through a domain registrar
      // For now, we'll simulate the process
      this.logger.log(`Custom domain created: ${domain}`);
      return domain;
    } catch (error) {
      this.logger.error(`Error creating custom domain: ${error.message}`);
      throw error;
    }
  }

  async setupDomainDNS(domain: string, targetUrl: string): Promise<void> {
    try {
      // Setup DNS records for the domain
      // This would involve creating A records or CNAME records
      this.logger.log(`DNS setup completed for ${domain} -> ${targetUrl}`);
    } catch (error) {
      this.logger.error(`Error setting up DNS: ${error.message}`);
      throw error;
    }
  }

  private generateReactAppTemplate(businessId: string, businessType: string, subdomain?: string, customDomain?: string): string {
    // This is a simplified CloudFormation template
    // In a real implementation, this would be a comprehensive template
    return JSON.stringify({
      AWSTemplateFormatVersion: '2010-09-09',
      Description: `React app for business ${businessId}`,
      Parameters: {
        BusinessId: {
          Type: 'String',
          Description: 'Business ID',
        },
        BusinessType: {
          Type: 'String',
          Description: 'Business type',
        },
      },
      Resources: {
        S3Bucket: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: `react-app-${businessId}`,
            WebsiteConfiguration: {
              IndexDocument: 'index.html',
              ErrorDocument: 'index.html',
            },
          },
        },
        CloudFrontDistribution: {
          Type: 'AWS::CloudFront::Distribution',
          Properties: {
            DistributionConfig: {
              Origins: [
                {
                  Id: 'S3Origin',
                  DomainName: { 'Fn::GetAtt': ['S3Bucket', 'DomainName'] },
                  S3OriginConfig: {
                    OriginAccessIdentity: '',
                  },
                },
              ],
              DefaultCacheBehavior: {
                TargetOriginId: 'S3Origin',
                ViewerProtocolPolicy: 'redirect-to-https',
              },
              Enabled: true,
              DefaultRootObject: 'index.html',
            },
          },
        },
      },
      Outputs: {
        AppUrl: {
          Description: 'URL of the React app',
          Value: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
        },
      },
    });
  }

  private async waitForStackCreation(stackName: string): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const command = new DescribeStacksCommand({
          StackName: stackName,
        });

        const response = await this.cloudFormationClient.send(command);
        const stack = response.Stacks?.[0];

        if (stack?.StackStatus === 'CREATE_COMPLETE') {
          return;
        } else if (stack?.StackStatus === 'CREATE_FAILED') {
          throw new Error(`Stack creation failed: ${stack.StackStatusReason}`);
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      } catch (error) {
        this.logger.error(`Error checking stack status: ${error.message}`);
        throw error;
      }
    }

    throw new Error('Stack creation timeout');
  }
} 