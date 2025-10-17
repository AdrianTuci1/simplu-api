import { Controller, Get, Query } from '@nestjs/common';
import { MetaService } from './meta.service';

@Controller('external/meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('auth-url')
  getAuthUrl(
    @Query('businessId') businessId: string, 
    @Query('locationId') locationId: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.meta.generateAuthUrl(businessId, locationId, redirectUri);
  }

  @Get('status')
  async getStatus(
    @Query('businessId') businessId: string,
    @Query('locationId') locationId: string
  ) {
    return this.meta.getCredentialsStatus(businessId, locationId);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return this.meta.handleCallback(code, state);
  }
}


