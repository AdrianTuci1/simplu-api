import { Controller, Post, Body, Headers, Param } from '@nestjs/common';
import { TwilioService } from './twilio.service';

@Controller('twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('webhook/whatsapp/:tenantId')
  async handleWhatsAppWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
  ) {
    // Verify Twilio signature here if needed
    return this.twilioService.handleIncomingWhatsApp(tenantId, body);
  }
} 