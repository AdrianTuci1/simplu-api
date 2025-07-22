import { Controller, Post, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InfrastructureService } from './infrastructure.service';

@ApiTags('infrastructure')
@Controller('infrastructure')
export class InfrastructureController {
  constructor(private readonly infrastructureService: InfrastructureService) {}

  @Post('react-app')
  @ApiOperation({ summary: 'Create React app infrastructure' })
  @ApiResponse({ status: 201, description: 'React app infrastructure created' })
  async createReactApp(
    @Body() body: {
      businessId: string;
      businessType: string;
      subdomain?: string;
      customDomain?: string;
    }
  ) {
    try {
      const { businessId, businessType, subdomain, customDomain } = body;
      return await this.infrastructureService.createReactApp(businessId, businessType, subdomain, customDomain);
    } catch (error) {
      throw new HttpException('Failed to create React app infrastructure', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('react-app/:stackName')
  @ApiOperation({ summary: 'Delete React app infrastructure' })
  @ApiResponse({ status: 200, description: 'React app infrastructure deleted' })
  async deleteReactApp(@Param('stackName') stackName: string) {
    try {
      await this.infrastructureService.deleteReactApp(stackName);
      return { message: 'React app infrastructure deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete React app infrastructure', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('domain')
  @ApiOperation({ summary: 'Create custom domain' })
  @ApiResponse({ status: 201, description: 'Custom domain created' })
  async createCustomDomain(@Body() body: { domain: string }) {
    try {
      return await this.infrastructureService.createCustomDomain(body.domain);
    } catch (error) {
      throw new HttpException('Failed to create custom domain', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('dns')
  @ApiOperation({ summary: 'Setup domain DNS' })
  @ApiResponse({ status: 200, description: 'DNS setup completed' })
  async setupDomainDNS(@Body() body: { domain: string; targetUrl: string }) {
    try {
      await this.infrastructureService.setupDomainDNS(body.domain, body.targetUrl);
      return { message: 'DNS setup completed successfully' };
    } catch (error) {
      throw new HttpException('Failed to setup DNS', HttpStatus.BAD_REQUEST);
    }
  }
} 