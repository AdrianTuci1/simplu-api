import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessConfig, BusinessType, BusinessFeatures } from '../entities/business-config.entity';

@Injectable()
export class BusinessConfigService {
  constructor(
    @InjectRepository(BusinessConfig)
    private businessConfigRepository: Repository<BusinessConfig>,
  ) {}

  async getBusinessConfig(businessId: string): Promise<BusinessConfig> {
    const config = await this.businessConfigRepository.findOne({ where: { businessId } });
    if (!config) {
      throw new Error(`Business configuration not found for ${businessId}`);
    }
    return config;
  }

  async updateBusinessConfig(
    businessId: string,
    type: BusinessType,
    enabledFeatures: BusinessFeatures,
  ): Promise<BusinessConfig> {
    let config = await this.businessConfigRepository.findOne({ where: { businessId } });
    
    if (!config) {
      config = new BusinessConfig();
      config.businessId = businessId;
    }

    config.type = type;
    config.enabledFeatures = enabledFeatures;

    return this.businessConfigRepository.save(config);
  }

  async isFeatureEnabled(businessId: string, feature: keyof BusinessFeatures): Promise<boolean> {
    const config = await this.getBusinessConfig(businessId);
    if (feature === 'marketing') {
      return Object.values(config.enabledFeatures.marketing).some(enabled => enabled);
    }
    return config.enabledFeatures[feature] as boolean;
  }

  async isMarketingChannelEnabled(businessId: string, channel: keyof BusinessFeatures['marketing']): Promise<boolean> {
    const config = await this.getBusinessConfig(businessId);
    return config.enabledFeatures.marketing[channel];
  }

  async getEnabledMarketingChannels(businessId: string): Promise<string[]> {
    const config = await this.getBusinessConfig(businessId);
    const marketing = config.enabledFeatures.marketing;
    return Object.entries(marketing)
      .filter(([_, enabled]) => enabled)
      .map(([channel]) => channel);
  }

  async getBusinessType(businessId: string): Promise<BusinessType> {
    const config = await this.getBusinessConfig(businessId);
    return config.type;
  }
} 