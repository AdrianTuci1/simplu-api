import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CommunicationConfig } from '../entities/communication-config.entity';

@Injectable()
export class CommunicationConfigService {
  private configCache: Map<string, CommunicationConfig> = new Map();

  constructor(
    @Inject(forwardRef(() => 'COMMUNICATION_CONFIG_REPOSITORY'))
    private configRepository: Repository<CommunicationConfig>,
  ) {}

  async getConfig(tenantId: string): Promise<CommunicationConfig> {
    // Check cache first
    const cachedConfig = this.configCache.get(tenantId);
    if (cachedConfig) {
      return cachedConfig;
    }

    // If not in cache, get from database
    const config = await this.configRepository.findOne({
      where: { tenantId, isActive: true },
    });

    if (!config) {
      throw new Error(`No active communication configuration found for tenant ${tenantId}`);
    }

    // Cache the config
    this.configCache.set(tenantId, config);
    return config;
  }

  async updateConfig(tenantId: string, config: Partial<CommunicationConfig>): Promise<CommunicationConfig> {
    const existingConfig = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (existingConfig) {
      // Update existing config
      Object.assign(existingConfig, config);
      existingConfig.updatedAt = new Date();
      const updated = await this.configRepository.save(existingConfig);
      this.configCache.set(tenantId, updated);
      return updated;
    } else {
      // Create new config
      const newConfig = this.configRepository.create({
        tenantId,
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await this.configRepository.save(newConfig);
      this.configCache.set(tenantId, saved);
      return saved;
    }
  }

  async deactivateConfig(tenantId: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (config) {
      config.isActive = false;
      config.updatedAt = new Date();
      await this.configRepository.save(config);
      this.configCache.delete(tenantId);
    }
  }

  clearCache(tenantId?: string) {
    if (tenantId) {
      this.configCache.delete(tenantId);
    } else {
      this.configCache.clear();
    }
  }
} 