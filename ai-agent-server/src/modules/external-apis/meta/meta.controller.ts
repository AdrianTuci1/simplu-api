import { Controller, Get, Query } from '@nestjs/common';
import { MetaService } from './meta.service';

@Controller('external/meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('auth-url')
  getAuthUrl(@Query('businessId') businessId: string, @Query('userId') userId: string) {
    return { url: this.meta.generateAuthUrl(businessId, userId) };
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return this.meta.handleCallback(code, state);
  }
}


