import { Injectable, Logger } from '@nestjs/common';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { v4 as uuidv4 } from 'uuid';

export interface AgentLogAction {
  // Resource type for agent-log
  resourceType: 'agent-log';
  operation: 'create'; // Întotdeauna create pentru logs
  
  // Multi-tenant context
  businessId: string;
  locationId: string;
  
  // Agent log specific data
  data: {
    actionType: 'sms' | 'email' | 'voice_call' | 'meta_message';
    subAction: 'send' | 'receive' | 'failed';
    
    // Agent context
    agentSessionId: string;
    triggeredBy: 'bedrock_agent';
    
    // Recipient info (sanitized)
    recipient?: {
      phone?: string;
      email?: string;
      userId?: string;
      name?: string;
    };
    
    // Provider info
    provider: 'twilio' | 'aws_sns' | 'elevenlabs' | 'meta' | 'gmail' | 'smtp';
    externalId?: string; // ID from provider
    
    // Related resources
    relatedResourceType?: string; // 'appointment', 'treatment', etc
    relatedResourceId?: string;
    
    // Metadata specific to action type
    metadata?: {
      // Voice call
      callDuration?: number;
      conversationId?: string;
      transcriptAvailable?: boolean;
      
      // SMS/Email
      templateId?: string;
      subject?: string; // email only
      messageLength?: number;
      
      // Status
      deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
      errorMessage?: string;
    };

  timestamp: string;
  requestId: string;
  };
  
}

@Injectable()
export class KinesisLoggerService {
  private readonly logger = new Logger(KinesisLoggerService.name);
  private readonly kinesisClient: KinesisClient;
  private readonly streamName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    const clientConfig: any = {
      region,
    };

    // Credentials
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
      this.logger.log('Using explicit AWS credentials for Kinesis Logger');
    }

    this.kinesisClient = new KinesisClient(clientConfig);
    // Folosim același stream ca și resources (resources-operations)
    this.streamName = process.env.KINESIS_STREAM_NAME || 'resources-stream';
    
    this.logger.log(`✅ Kinesis Logger initialized for stream: ${this.streamName}`);
  }

  /**
   * Log acțiune externă inițiată de agent
   * Formatul este compatibil cu ResourceOperation pentru a merge pe același stream
   */
  async logAgentAction(params: {
    businessId: string;
    locationId: string;
    agentSessionId: string;
    actionType: 'sms' | 'email' | 'voice_call' | 'meta_message';
    subAction: 'send' | 'receive' | 'failed';
    recipient?: {
      phone?: string;
      email?: string;
      userId?: string;
      name?: string;
    };
    provider: 'twilio' | 'aws_sns' | 'elevenlabs' | 'meta' | 'gmail' | 'smtp';
    externalId?: string;
    relatedResourceType?: string;
    relatedResourceId?: string;
    metadata?: {
      callDuration?: number;
      conversationId?: string;
      transcriptAvailable?: boolean;
      templateId?: string;
      subject?: string;
      messageLength?: number;
      deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
      errorMessage?: string;
    };
  }): Promise<void> {
    try {
      const action: AgentLogAction = {
        resourceType: 'agent-log',
        operation: 'create',
        businessId: params.businessId,
        locationId: params.locationId,
        data: {
          actionType: params.actionType,
          subAction: params.subAction,
          agentSessionId: params.agentSessionId,
          triggeredBy: 'bedrock_agent',
          recipient: params.recipient,
          provider: params.provider,
          externalId: params.externalId,
          relatedResourceType: params.relatedResourceType,
          relatedResourceId: params.relatedResourceId,
          metadata: params.metadata,
          timestamp: new Date().toISOString(),
          requestId: uuidv4(),
        },
      };

      await this.sendToKinesis(action);
    } catch (error) {
      this.logger.error(`❌ Failed to log agent action: ${error.message}`);
      // Nu throw - logging nu trebuie să oprească flow-ul principal
    }
  }

  /**
   * Helper: Log SMS inițiat de agent
   */
  async logAgentSms(params: {
    businessId: string;
    locationId: string;
    agentSessionId: string;
    recipient: { phone: string; userId?: string; name?: string };
    provider: 'twilio' | 'aws_sns';
    success: boolean;
    externalId?: string;
    relatedResourceType?: string;
    relatedResourceId?: string;
    templateId?: string;
    messageLength?: number;
    errorMessage?: string;
  }): Promise<void> {
    await this.logAgentAction({
      businessId: params.businessId,
      locationId: params.locationId,
      agentSessionId: params.agentSessionId,
      actionType: 'sms',
      subAction: params.success ? 'send' : 'failed',
      recipient: params.recipient,
      provider: params.provider,
      externalId: params.externalId,
      relatedResourceType: params.relatedResourceType,
      relatedResourceId: params.relatedResourceId,
      metadata: {
        templateId: params.templateId,
        messageLength: params.messageLength,
        deliveryStatus: params.success ? 'sent' : 'failed',
        errorMessage: params.errorMessage,
      },
    });
  }

  /**
   * Helper: Log Email inițiat de agent
   */
  async logAgentEmail(params: {
    businessId: string;
    locationId: string;
    agentSessionId: string;
    recipient: { email: string; userId?: string; name?: string };
    provider: 'gmail' | 'smtp';
    success: boolean;
    externalId?: string;
    relatedResourceType?: string;
    relatedResourceId?: string;
    templateId?: string;
    subject?: string;
    errorMessage?: string;
  }): Promise<void> {
    await this.logAgentAction({
      businessId: params.businessId,
      locationId: params.locationId,
      agentSessionId: params.agentSessionId,
      actionType: 'email',
      subAction: params.success ? 'send' : 'failed',
      recipient: params.recipient,
      provider: params.provider,
      externalId: params.externalId,
      relatedResourceType: params.relatedResourceType,
      relatedResourceId: params.relatedResourceId,
      metadata: {
        templateId: params.templateId,
        subject: params.subject,
        deliveryStatus: params.success ? 'sent' : 'failed',
        errorMessage: params.errorMessage,
      },
    });
  }

  /**
   * Helper: Log Meta message inițiat de agent
   */
  async logAgentMetaMessage(params: {
    businessId: string;
    locationId: string;
    agentSessionId: string;
    recipient: { phone: string; userId?: string; name?: string };
    success: boolean;
    externalId?: string;
    relatedResourceType?: string;
    relatedResourceId?: string;
    templateId?: string;
    messageLength?: number;
    errorMessage?: string;
  }): Promise<void> {
    await this.logAgentAction({
      businessId: params.businessId,
      locationId: params.locationId,
      agentSessionId: params.agentSessionId,
      actionType: 'meta_message',
      subAction: params.success ? 'send' : 'failed',
      recipient: params.recipient,
      provider: 'meta',
      externalId: params.externalId,
      relatedResourceType: params.relatedResourceType,
      relatedResourceId: params.relatedResourceId,
      metadata: {
        templateId: params.templateId,
        messageLength: params.messageLength,
        deliveryStatus: params.success ? 'sent' : 'failed',
        errorMessage: params.errorMessage,
      },
    });
  }

  /**
   * Helper: Log Voice call (Eleven Labs)
   */
  async logAgentVoiceCall(params: {
    businessId: string;
    locationId: string;
    agentSessionId: string;
    subAction: 'receive' | 'send' | 'failed';
    recipient?: { phone?: string; userId?: string; name?: string };
    conversationId: string;
    callDuration?: number;
    transcriptAvailable?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await this.logAgentAction({
      businessId: params.businessId,
      locationId: params.locationId,
      agentSessionId: params.agentSessionId,
      actionType: 'voice_call',
      subAction: params.subAction,
      recipient: params.recipient,
      provider: 'elevenlabs',
      externalId: params.conversationId,
      metadata: {
        conversationId: params.conversationId,
        callDuration: params.callDuration,
        transcriptAvailable: params.transcriptAvailable,
        deliveryStatus: params.subAction === 'failed' ? 'failed' : 'delivered',
        errorMessage: params.errorMessage,
      },
    });
  }

  /**
   * Send to Kinesis stream
   */
  private async sendToKinesis(action: AgentLogAction): Promise<void> {
    try {
      const partitionKey = `${action.businessId}-${action.locationId}-${action.resourceType}`;

      const command = new PutRecordCommand({
        StreamName: this.streamName,
        Data: Buffer.from(JSON.stringify(action)),
        PartitionKey: partitionKey,
      });

      const result = await this.kinesisClient.send(command);

      this.logger.log(
        `📤 Agent log sent to Kinesis: ${action.data.actionType}.${action.data.subAction} ` +
        `(Business: ${action.businessId}, Session: ${action.data.agentSessionId}) - ` +
        `Sequence: ${result.SequenceNumber}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(
        `❌ Failed to send agent log to Kinesis: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}

