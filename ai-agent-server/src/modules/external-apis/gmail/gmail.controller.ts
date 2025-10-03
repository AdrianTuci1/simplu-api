import { Controller, Get, Query, Res } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { Response } from 'express';

@Controller('external/gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth-url')
  getAuthUrl(
    @Query('businessId') businessId: string, 
    @Query('locationId') locationId: string,
    @Query('redirectUrl') redirectUrl?: string
  ) {
    return { url: this.gmailService.generateAuthUrl(businessId, locationId, redirectUrl) };
  }

  @Get('status')
  async getStatus(
    @Query('businessId') businessId: string,
    @Query('locationId') locationId: string
  ) {
    return this.gmailService.getCredentialsStatus(businessId, locationId);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string, 
    @Query('state') state: string,
    @Res() res: Response
  ) {
    return this.gmailService.handleOAuthCallback(code, state, res);
  }
}


