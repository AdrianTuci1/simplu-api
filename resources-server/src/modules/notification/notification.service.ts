import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly elixirUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.elixirUrl = this.configService.get<string>('elixir.url', 'http://elixir:4000');
    }

    /**
     * Send resource notification to Elixir service
     */
    async notifyElixir(notificationData: any): Promise<void> {
        try {
            const response = await fetch(`${this.elixirUrl}/api/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...notificationData,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.logger.log(`Successfully notified Elixir of ${notificationData.type}`);
        } catch (error) {
            this.logger.error(`Failed to notify Elixir:`, error);
            // Don't throw error to avoid breaking the main operation
            // The resource operation should succeed even if notification fails
        }
    }

    /**
     * Send resource creation notification
     */
    async notifyResourceCreated(resourceData: any): Promise<void> {
        await this.notifyElixir({
            type: 'resource_created',
            ...resourceData,
        });
    }

    /**
     * Send resource update notification
     */
    async notifyResourceUpdated(resourceData: any): Promise<void> {
        await this.notifyElixir({
            type: 'resource_updated',
            ...resourceData,
        });
    }

    /**
     * Send resource deletion notification
     */
    async notifyResourceDeleted(resourceData: any): Promise<void> {
        await this.notifyElixir({
            type: 'resource_deleted',
            ...resourceData,
        });
    }

    /**
     * Send resource patch notification
     */
    async notifyResourcePatched(resourceData: any): Promise<void> {
        await this.notifyElixir({
            type: 'resource_patched',
            ...resourceData,
        });
    }
}