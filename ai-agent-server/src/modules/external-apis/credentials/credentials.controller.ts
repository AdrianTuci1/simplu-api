import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { MetaCredentialsDto } from './dto/credentials.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // Multi-location support: /meta/:businessId/:locationId sau /meta/:businessId?locationId=...
  @Post('meta/:businessId/:locationId?')
  async saveMetaCredentials(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string = 'L0100001',
    @Body() credentials: MetaCredentialsDto
  ) {
    return this.credentialsService.saveMetaCredentials(businessId, locationId, credentials);
  }


  @Get('meta/:businessId/:locationId?')
  async getMetaCredentials(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string = 'L0100001'
  ) {
    return this.credentialsService.getMetaCredentials(businessId, locationId);
  }


  @Post('meta/:businessId/:locationId?/test')
  async testMetaCredentials(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string = 'L0100001'
  ) {
    return this.credentialsService.testMetaCredentials(businessId, locationId);
  }


  @Put('meta/:businessId/:locationId?')
  async updateMetaCredentials(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string = 'L0100001',
    @Body() updates: Partial<MetaCredentialsDto>
  ) {
    return this.credentialsService.updateMetaCredentials(businessId, locationId, updates);
  }

} 