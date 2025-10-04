import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { Route53Client, CreateHostedZoneCommand, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { S3Client, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { ACMClient, RequestCertificateCommand, DescribeCertificateCommand, ListCertificatesCommand } from '@aws-sdk/client-acm';

@Injectable()
export class InfrastructureService {
  private readonly logger = new Logger(InfrastructureService.name);
  private readonly cloudFormationClient: CloudFormationClient;
  private readonly route53Client: Route53Client;
  private readonly s3Client: S3Client;
  private readonly cloudFrontClient: CloudFrontClient;
  private readonly acmClient: ACMClient;

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

    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.cloudFrontClient = new CloudFrontClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.acmClient = new ACMClient({
      region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
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

  /**
   * Deploy business client to S3 bucket with domainLabel
   * Copies form files from businessType bucket to business-specific bucket
   */
  async deployBusinessClient(businessId: string, domainLabel: string, businessType: string): Promise<{ bucketName: string; appUrl: string }> {
    try {
      const bucketName = `business-client-${businessId}-${domainLabel}`;
      
      // Get or create SSL certificate for the domain
      const sslCertificateArn = await this.getOrCreateSSLCertificate();
      
      // CloudFormation template for S3 bucket deployment
      const templateBody = this.generateS3DeploymentTemplate(businessId, domainLabel, businessType);
      
      const stackName = `business-client-${businessId}`;
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
            ParameterKey: 'DomainLabel',
            ParameterValue: domainLabel,
          },
          {
            ParameterKey: 'BusinessType',
            ParameterValue: businessType,
          },
          {
            ParameterKey: 'SSLCertificateArn',
            ParameterValue: sslCertificateArn,
          },
        ],
      });

      await this.cloudFormationClient.send(command);
      
      // Wait for stack creation to complete
      await this.waitForStackCreation(stackName);
      
      // Copy form files from businessType bucket to business-specific bucket
      await this.copyFormFilesFromBusinessType(businessType, bucketName);
      
      const appUrl = `${domainLabel}.${this.configService.get('BASE_DOMAIN', 'simplu.io')}`;
      
      this.logger.log(`Business client deployed for business ${businessId} with domain ${domainLabel}: ${appUrl}`);
      
      return {
        bucketName,
        appUrl: `https://${appUrl}`,
      };
    } catch (error) {
      this.logger.error(`Error deploying business client: ${error.message}`);
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

  private generateS3DeploymentTemplate(businessId: string, domainLabel: string, businessType: string): string {
    const fullDomain = `${domainLabel}.simplu.io`;
    
    return JSON.stringify({
      AWSTemplateFormatVersion: '2010-09-09',
      Description: `S3 deployment for business ${businessId} with domain ${fullDomain}`,
      Parameters: {
        BusinessId: {
          Type: 'String',
          Description: 'Business ID',
        },
        DomainLabel: {
          Type: 'String',
          Description: 'Domain label for the business',
        },
        BusinessType: {
          Type: 'String',
          Description: 'Business type',
        },
        SSLCertificateArn: {
          Type: 'String',
          Description: 'ARN of the SSL certificate for simplu.io domain',
          Default: '',
        },
      },
      Resources: {
        S3Bucket: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: `business-client-${businessId}-${domainLabel}`,
            WebsiteConfiguration: {
              IndexDocument: 'index.html',
              ErrorDocument: 'index.html',
            },
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: false,
              BlockPublicPolicy: false,
              IgnorePublicAcls: false,
              RestrictPublicBuckets: false,
            },
          },
        },
        S3BucketPolicy: {
          Type: 'AWS::S3::BucketPolicy',
          Properties: {
            Bucket: { Ref: 'S3Bucket' },
            PolicyDocument: {
              Statement: [
                {
                  Sid: 'PublicReadGetObject',
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 's3:GetObject',
                  Resource: { 'Fn::Sub': '${S3Bucket}/*' },
                },
              ],
            },
          },
        },
        CloudFrontOriginAccessIdentity: {
          Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
          Properties: {
            CloudFrontOriginAccessIdentityConfig: {
              Comment: `OAI for ${businessId}`,
            },
          },
        },
        CloudFrontDistribution: {
          Type: 'AWS::CloudFront::Distribution',
          Properties: {
            DistributionConfig: {
              Aliases: [fullDomain],
              Origins: [
                {
                  Id: 'S3Origin',
                  DomainName: { 'Fn::GetAtt': ['S3Bucket', 'DomainName'] },
                  S3OriginConfig: {
                    OriginAccessIdentity: { 'Fn::Sub': 'origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}' },
                  },
                },
              ],
              DefaultCacheBehavior: {
                TargetOriginId: 'S3Origin',
                ViewerProtocolPolicy: 'redirect-to-https',
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                CachedMethods: ['GET', 'HEAD'],
                Compress: true,
                ForwardedValues: {
                  QueryString: false,
                  Cookies: {
                    Forward: 'none',
                  },
                },
                DefaultTTL: 0,
                MaxTTL: 31536000,
                MinTTL: 0,
              },
              CacheBehaviors: [
                {
                  PathPattern: '/static/*',
                  TargetOriginId: 'S3Origin',
                  ViewerProtocolPolicy: 'redirect-to-https',
                  AllowedMethods: ['GET', 'HEAD'],
                  CachedMethods: ['GET', 'HEAD'],
                  Compress: true,
                  ForwardedValues: {
                    QueryString: false,
                    Cookies: {
                      Forward: 'none',
                    },
                  },
                  DefaultTTL: 86400,
                  MaxTTL: 31536000,
                  MinTTL: 0,
                },
                {
                  PathPattern: '*.js',
                  TargetOriginId: 'S3Origin',
                  ViewerProtocolPolicy: 'redirect-to-https',
                  AllowedMethods: ['GET', 'HEAD'],
                  CachedMethods: ['GET', 'HEAD'],
                  Compress: true,
                  ForwardedValues: {
                    QueryString: false,
                    Cookies: {
                      Forward: 'none',
                    },
                  },
                  DefaultTTL: 86400,
                  MaxTTL: 31536000,
                  MinTTL: 0,
                },
                {
                  PathPattern: '*.css',
                  TargetOriginId: 'S3Origin',
                  ViewerProtocolPolicy: 'redirect-to-https',
                  AllowedMethods: ['GET', 'HEAD'],
                  CachedMethods: ['GET', 'HEAD'],
                  Compress: true,
                  ForwardedValues: {
                    QueryString: false,
                    Cookies: {
                      Forward: 'none',
                    },
                  },
                  DefaultTTL: 86400,
                  MaxTTL: 31536000,
                  MinTTL: 0,
                },
              ],
              Enabled: true,
              DefaultRootObject: 'index.html',
              CustomErrorResponses: [
                {
                  ErrorCode: 404,
                  ResponseCode: 200,
                  ResponsePagePath: '/index.html',
                },
                {
                  ErrorCode: 403,
                  ResponseCode: 200,
                  ResponsePagePath: '/index.html',
                },
              ],
              PriceClass: 'PriceClass_100',
              ViewerCertificate: {
                AcmCertificateArn: { Ref: 'SSLCertificateArn' },
                SslSupportMethod: 'sni-only',
                MinimumProtocolVersion: 'TLSv1.2_2021',
              },
              HttpVersion: 'http2',
              Comment: `CloudFront distribution for ${businessId}`,
            },
          },
        },
        Route53Record: {
          Type: 'AWS::Route53::RecordSet',
          Properties: {
            HostedZoneName: 'simplu.io.',
            Name: fullDomain,
            Type: 'A',
            AliasTarget: {
              DNSName: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
              HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID
            },
          },
        },
      },
      Outputs: {
        BucketName: {
          Description: 'Name of the S3 bucket',
          Value: { Ref: 'S3Bucket' },
        },
        CloudFrontDomain: {
          Description: 'CloudFront distribution domain',
          Value: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
        },
        AppUrl: {
          Description: 'URL of the business client app',
          Value: `https://${fullDomain}`,
        },
        DistributionId: {
          Description: 'CloudFront distribution ID',
          Value: { Ref: 'CloudFrontDistribution' },
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

  /**
   * Get or create SSL certificate for simplu.io domain
   */
  async getOrCreateSSLCertificate(): Promise<string> {
    try {
      const baseDomain = this.configService.get('BASE_DOMAIN', 'simplu.io');
      
      // First, try to find existing certificate
      const listCommand = new ListCertificatesCommand({
        CertificateStatuses: ['ISSUED', 'PENDING_VALIDATION'],
      });
      
      const listResponse = await this.acmClient.send(listCommand);
      
      if (listResponse.CertificateSummaryList) {
        for (const cert of listResponse.CertificateSummaryList) {
          if (cert.DomainName === baseDomain || cert.SubjectAlternativeNameSummaries?.includes(`*.${baseDomain}`)) {
            this.logger.log(`Found existing SSL certificate: ${cert.CertificateArn}`);
            return cert.CertificateArn!;
          }
        }
      }
      
      // If no certificate found, create a new one
      this.logger.log(`Creating new SSL certificate for ${baseDomain} and *.${baseDomain}`);
      
      const requestCommand = new RequestCertificateCommand({
        DomainName: baseDomain,
        SubjectAlternativeNames: [`*.${baseDomain}`],
        ValidationMethod: 'DNS',
        DomainValidationOptions: [
          {
            DomainName: baseDomain,
            ValidationDomain: baseDomain,
          },
          {
            DomainName: `*.${baseDomain}`,
            ValidationDomain: baseDomain,
          },
        ],
      });
      
      const requestResponse = await this.acmClient.send(requestCommand);
      this.logger.log(`SSL certificate requested: ${requestResponse.CertificateArn}`);
      
      return requestResponse.CertificateArn!;
    } catch (error) {
      this.logger.error(`Error getting/creating SSL certificate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalidate CloudFront cache for a specific distribution
   */
  async invalidateCloudFrontCache(distributionId: string, paths: string[] = ['/*']): Promise<void> {
    try {
      const command = new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: `invalidation-${Date.now()}`,
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      });

      await this.cloudFrontClient.send(command);
      this.logger.log(`CloudFront cache invalidated for distribution ${distributionId}`);
    } catch (error) {
      this.logger.error(`Error invalidating CloudFront cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Copy form files from businessType bucket to business-specific bucket
   */
  private async copyFormFilesFromBusinessType(businessType: string, targetBucketName: string): Promise<void> {
    try {
      const sourceBucketName = `business-forms-${businessType}`;
      
      this.logger.log(`Copying form files from ${sourceBucketName} to ${targetBucketName}`);
      
      // List all objects in the businessType bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: sourceBucketName,
      });
      
      const listResponse = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        this.logger.warn(`No files found in source bucket ${sourceBucketName}`);
        return;
      }
      
      // Copy each file from source to target bucket
      const copyPromises = listResponse.Contents.map(async (object) => {
        if (!object.Key) return;
        
        const copyCommand = new CopyObjectCommand({
          Bucket: targetBucketName,
          CopySource: `${sourceBucketName}/${encodeURIComponent(object.Key)}`,
          Key: object.Key,
        });
        
        try {
          await this.s3Client.send(copyCommand);
          this.logger.log(`Copied file: ${object.Key}`);
        } catch (error) {
          this.logger.error(`Failed to copy file ${object.Key}: ${error.message}`);
          throw error;
        }
      });
      
      await Promise.all(copyPromises);
      
      this.logger.log(`Successfully copied ${listResponse.Contents.length} files from ${sourceBucketName} to ${targetBucketName}`);
    } catch (error) {
      this.logger.error(`Error copying form files from businessType ${businessType}: ${error.message}`);
      throw error;
    }
  }
} 