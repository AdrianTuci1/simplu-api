import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Headers, 
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { WebhooksService, MetaWebhookDto, TwilioWebhookDto } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('meta/:businessId')
  @HttpCode(HttpStatus.OK)
  async handleMetaWebhook(
    @Param('businessId') businessId: string,
    @Body() payload: MetaWebhookDto,
    @Headers('x-hub-signature-256') signature: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string
  ) {
    // 1. Verificare webhook verification (pentru setup)
    if (mode === 'subscribe' && verifyToken) {
      return this.verifyMetaWebhook(verifyToken, challenge);
    }

    // 2. Validare signature
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    // 3. Procesare webhook
    const result = await this.webhooksService.processMetaWebhook(
      businessId,
      payload,
      signature
    );

    return result;
  }

  @Post('twilio/:businessId')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(
    @Param('businessId') businessId: string,
    @Body() payload: TwilioWebhookDto
  ) {
    // 1. Validare payload
    if (!payload.From || !payload.Body) {
      throw new BadRequestException('Invalid Twilio webhook payload');
    }

    // 2. Procesare webhook
    const result = await this.webhooksService.processTwilioWebhook(
      businessId,
      payload
    );

    return result;
  }

  @Get('meta/:businessId')
  async handleMetaVerification(
    @Param('businessId') businessId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string
  ) {
    if (mode === 'subscribe' && verifyToken) {
      return this.verifyMetaWebhook(verifyToken, challenge);
    }

    throw new BadRequestException('Invalid verification request');
  }

  private verifyMetaWebhook(verifyToken: string, challenge: string): string {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (verifyToken === expectedToken) {
      return challenge;
    } else {
      throw new UnauthorizedException('Invalid verification token');
    }
  }

  @Post('test/:businessId')
  async testWebhook(
    @Param('businessId') businessId: string,
    @Body() testData: {
      source: 'meta' | 'twilio';
      message: string;
      userId: string;
    }
  ) {
    // Endpoint pentru testare webhook-uri
    const webhookData = {
      businessId,
      locationId: `${businessId}-test`,
      userId: testData.userId,
      message: testData.message,
      source: testData.source,
      sessionId: `${businessId}:${testData.userId}:${Date.now()}`
    };

    const result = await this.webhooksService['agentService'].processWebhookMessage(webhookData);
    
    return {
      status: 'test_completed',
      result
    };
  }
} 