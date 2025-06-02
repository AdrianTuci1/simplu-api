import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CommunicationConfigService } from '../services/communication-config.service';
import { CommunicationConfig } from '../models/communication-config.model';

@Controller('communication-config')
export class CommunicationConfigController {
  constructor(private readonly configService: CommunicationConfigService) {}

  @Get(':tenantId')
  async getConfig(@Param('tenantId') tenantId: string) {
    return this.configService.getConfig(tenantId);
  }

  @Post(':tenantId')
  async createConfig(
    @Param('tenantId') tenantId: string,
    @Body() config: Partial<CommunicationConfig>,
  ) {
    return this.configService.updateConfig(tenantId, config);
  }

  @Put(':tenantId')
  async updateConfig(
    @Param('tenantId') tenantId: string,
    @Body() config: Partial<CommunicationConfig>,
  ) {
    return this.configService.updateConfig(tenantId, config);
  }

  @Delete(':tenantId')
  async deactivateConfig(@Param('tenantId') tenantId: string) {
    await this.configService.deactivateConfig(tenantId);
    return { message: 'Configuration deactivated successfully' };
  }
} 