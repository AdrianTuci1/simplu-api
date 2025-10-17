import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { MetaCredentialsDto } from './dto/credentials.dto';

@Injectable()
export class CredentialsService {
  constructor(private readonly externalApisService: ExternalApisService) {}

  async saveMetaCredentials(
    businessId: string,
    credentials: MetaCredentialsDto
  ): Promise<any> {
    await this.validateMetaCredentials(credentials);
    return this.externalApisService.saveMetaCredentials(businessId, credentials);
  }



  async getMetaCredentials(businessId: string): Promise<any> {
    return this.externalApisService.getMetaCredentials(businessId);
  }



  async testMetaCredentials(businessId: string): Promise<any> {
    try {
      const result = await this.externalApisService.sendMetaMessage(
        'test',
        'Test message from AI Agent',
        businessId
      );
      
      return {
        success: result.success,
        message: result.success ? 'Meta credentials are valid' : 'Meta credentials are invalid',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test Meta credentials',
        error: error.message
      };
    }
  }

  async updateMetaCredentials(
    businessId: string,
    updates: Partial<MetaCredentialsDto>
  ): Promise<any> {
    const existing = await this.getMetaCredentials(businessId);
    if (!existing) {
      throw new BadRequestException('No existing Meta credentials found');
    }

    const updatedCredentials = { ...existing, ...updates };
    await this.validateMetaCredentials(updatedCredentials);
    
    return this.externalApisService.saveMetaCredentials(businessId, updatedCredentials);
  }



  private async validateMetaCredentials(credentials: MetaCredentialsDto): Promise<void> {
    if (!credentials.accessToken || !credentials.phoneNumberId || !credentials.appSecret) {
      throw new BadRequestException('Missing required Meta credentials');
    }
  }

} 