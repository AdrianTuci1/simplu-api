import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { MetaCredentialsDto, TwilioCredentialsDto } from './dto/credentials.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post('meta/:businessId')
  async saveMetaCredentials(
    @Param('businessId') businessId: string,
    @Body() credentials: MetaCredentialsDto
  ) {
    return this.credentialsService.saveMetaCredentials(businessId, credentials);
  }

  @Post('twilio/:businessId')
  async saveTwilioCredentials(
    @Param('businessId') businessId: string,
    @Body() credentials: TwilioCredentialsDto
  ) {
    return this.credentialsService.saveTwilioCredentials(businessId, credentials);
  }

  @Get('meta/:businessId')
  async getMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.getMetaCredentials(businessId);
  }

  @Get('twilio/:businessId')
  async getTwilioCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.getTwilioCredentials(businessId);
  }

  @Post('meta/:businessId/test')
  async testMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.testMetaCredentials(businessId);
  }

  @Post('twilio/:businessId/test')
  async testTwilioCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.testTwilioCredentials(businessId);
  }

  @Put('meta/:businessId')
  async updateMetaCredentials(
    @Param('businessId') businessId: string,
    @Body() updates: Partial<MetaCredentialsDto>
  ) {
    return this.credentialsService.updateMetaCredentials(businessId, updates);
  }

  @Put('twilio/:businessId')
  async updateTwilioCredentials(
    @Param('businessId') businessId: string,
    @Body() updates: Partial<TwilioCredentialsDto>
  ) {
    return this.credentialsService.updateTwilioCredentials(businessId, updates);
  }
} 