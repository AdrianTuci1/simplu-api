import { Controller, Get, Query } from '@nestjs/common';
import { GmailService } from './gmail.service';

@Controller('external/gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth-url')
  getAuthUrl(@Query('businessId') businessId: string, @Query('userId') userId: string) {
    return { url: this.gmailService.generateAuthUrl(businessId, userId) };
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return this.gmailService.handleOAuthCallback(code, state);
  }
}


