import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBridge } from 'aws-sdk';

export interface BusinessLaunchRequestedDetail {
  businessId: string;
  businessType: string;
  domainLabel?: string;
  ownerEmail?: string;
  ownerUserId?: string | null;
  locations: Array<{ id: string; active?: boolean }>;
  timestamp: string;
}

@Injectable()
export class EventBridgeService {
  private readonly logger = new Logger(EventBridgeService.name);
  private readonly client: EventBridge;
  private readonly eventBusName: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.client = new EventBridge({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    this.eventBusName = process.env.EVENT_BRIDGE_BUS_NAME;
  }

  async publishBusinessLaunchRequested(detail: BusinessLaunchRequestedDetail): Promise<void> {
    try {
      if (!this.eventBusName) {
        this.logger.warn('EVENT_BRIDGE_BUS_NAME not configured, skipping PutEvents');
        return;
      }

      const params: EventBridge.PutEventsRequest = {
        Entries: [
          {
            EventBusName: this.eventBusName,
            Source: 'management-server.business',
            DetailType: 'BUSINESS_LAUNCH_REQUESTED',
            Detail: JSON.stringify(detail),
          },
        ],
      };

      const result = await this.client.putEvents(params).promise();

      if ((result.FailedEntryCount || 0) > 0) {
        this.logger.error(`Failed to publish ${result.FailedEntryCount} EventBridge entries`);
        throw new Error('Some EventBridge entries failed to publish');
      }

      this.logger.log(`Published BUSINESS_LAUNCH_REQUESTED for business ${detail.businessId}`);
    } catch (error) {
      this.logger.error('Failed to publish BUSINESS_LAUNCH_REQUESTED', error as Error);
      throw error;
    }
  }
}


