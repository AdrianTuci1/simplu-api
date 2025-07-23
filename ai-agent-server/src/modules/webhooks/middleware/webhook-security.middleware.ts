import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ExternalApisService } from '../../external-apis/external-apis.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSecurityMiddleware implements NestMiddleware {
  constructor(private readonly externalApisService: ExternalApisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const businessId = req.params.businessId;
    const source = this.detectWebhookSource(req);

    if (source === 'meta') {
      await this.validateMetaWebhook(req, businessId);
    } else if (source === 'twilio') {
      await this.validateTwilioWebhook(req, businessId);
    }

    next();
  }

  private detectWebhookSource(req: Request): 'meta' | 'twilio' | 'unknown' {
    if (req.path.includes('/meta/')) {
      return 'meta';
    } else if (req.path.includes('/twilio/')) {
      return 'twilio';
    }
    return 'unknown';
  }

  private async validateMetaWebhook(req: Request, businessId: string): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!signature) {
      throw new UnauthorizedException('Missing Meta webhook signature');
    }

    // Validare signature (implementare similară cu cea din service)
    const isValid = await this.validateMetaSignature(businessId, req.body, signature);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid Meta webhook signature');
    }
  }

  private async validateTwilioWebhook(req: Request, businessId: string): Promise<void> {
    // Twilio nu folosește signature, dar putem valida alte aspecte
    const from = req.body.From;
    const body = req.body.Body;
    
    if (!from || !body) {
      throw new UnauthorizedException('Invalid Twilio webhook payload');
    }
  }

  private async validateMetaSignature(
    businessId: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      const credentials = await this.externalApisService.getMetaCredentials(businessId);
      if (!credentials) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', credentials.appSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating Meta signature:', error);
      return false;
    }
  }
} 