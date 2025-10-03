import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ExternalApiConfigService } from '../services/external-api-config.service';
import { 
  CreateExternalApiConfigDto, 
  UpdateExternalApiConfigDto,
  SMSTemplate,
  EmailTemplate,
  COMMON_TEMPLATE_VARIABLES
} from '../interfaces/external-api-config.interface';

@Controller('external-api-config')
export class ExternalApiConfigController {
  constructor(
    private readonly configService: ExternalApiConfigService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConfig(@Body() dto: CreateExternalApiConfigDto) {
    return await this.configService.createConfig(dto);
  }

  @Get(':businessId')
  async getConfig(
    @Param('businessId') businessId: string,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.getOrCreateConfig(businessId, locationId);
  }

  @Put(':businessId')
  async updateConfig(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateExternalApiConfigDto,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.updateConfig(businessId, dto, locationId);
  }

  @Delete(':businessId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('businessId') businessId: string,
    @Query('locationId') locationId?: string
  ) {
    await this.configService.deleteConfig(businessId, locationId);
  }

  @Get('business/:businessId')
  async getConfigsByBusiness(@Param('businessId') businessId: string) {
    return await this.configService.getConfigsByBusiness(businessId);
  }

  // Template management endpoints
  @Post(':businessId/sms/templates')
  async addSMSTemplate(
    @Param('businessId') businessId: string,
    @Body() template: SMSTemplate,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.addSMSTemplate(businessId, template, locationId);
  }

  @Put(':businessId/sms/templates/:templateId')
  async updateSMSTemplate(
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Body() template: Partial<SMSTemplate>,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.updateSMSTemplate(businessId, templateId, template, locationId);
  }

  @Delete(':businessId/sms/templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSMSTemplate(
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Query('locationId') locationId?: string
  ) {
    await this.configService.deleteSMSTemplate(businessId, templateId, locationId);
  }

  @Post(':businessId/email/templates')
  async addEmailTemplate(
    @Param('businessId') businessId: string,
    @Body() template: EmailTemplate,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.addEmailTemplate(businessId, template, locationId);
  }

  @Put(':businessId/email/templates/:templateId')
  async updateEmailTemplate(
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Body() template: Partial<EmailTemplate>,
    @Query('locationId') locationId?: string
  ) {
    return await this.configService.updateEmailTemplate(businessId, templateId, template, locationId);
  }

  @Delete(':businessId/email/templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmailTemplate(
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Query('locationId') locationId?: string
  ) {
    await this.configService.deleteEmailTemplate(businessId, templateId, locationId);
  }

  // Utility endpoints
  @Get('template-variables')
  getTemplateVariables() {
    return {
      variables: COMMON_TEMPLATE_VARIABLES
    };
  }

  @Post(':businessId/process-template')
  async processTemplate(
    @Param('businessId') businessId: string,
    @Body() body: { template: string; variables: Record<string, string> }
  ) {
    return {
      processed: this.configService.processTemplate(body.template, body.variables)
    };
  }
}
