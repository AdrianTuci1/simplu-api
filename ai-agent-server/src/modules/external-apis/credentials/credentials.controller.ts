import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { MetaCredentialsDto } from './dto/credentials.dto';

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


  @Get('meta/:businessId')
  async getMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.getMetaCredentials(businessId);
  }


  @Post('meta/:businessId/test')
  async testMetaCredentials(@Param('businessId') businessId: string) {
    return this.credentialsService.testMetaCredentials(businessId);
  }


  @Put('meta/:businessId')
  async updateMetaCredentials(
    @Param('businessId') businessId: string,
    @Body() updates: Partial<MetaCredentialsDto>
  ) {
    return this.credentialsService.updateMetaCredentials(businessId, updates);
  }

} 