export interface CitrusShardingConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

export interface ShardConnection {
  shardId: string;
  connectionString: string;
  isActive: boolean;
  lastHealthCheck: Date;
  businessCount?: number;
  maxBusinesses?: number;
}

export interface CitrusShardResponse {
  shardId: string;
  connectionString: string;
  isActive: boolean;
  lastHealthCheck: string;
  businessCount: number;
  maxBusinesses: number;
}

export class CitrusShardingService {
  private config: CitrusShardingConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.CITRUS_SERVER_URL || 'http://localhost:8080',
      apiKey: process.env.CITRUS_API_KEY || '',
      timeout: parseInt(process.env.CITRUS_TIMEOUT || '5000', 10),
      retryAttempts: parseInt(process.env.CITRUS_RETRY_ATTEMPTS || '3', 10),
    };
  }

  /**
   * Gets the shard connection details for a specific business+location combination
   * The shard is determined by businessId+locationId and managed by Citrus
   */
  async getShardForBusiness(businessId: string, locationId: string): Promise<ShardConnection> {
    this.validateShardParams(businessId, locationId);

    const shardKey = `${businessId}-${locationId}`;
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/shard/${encodeURIComponent(shardKey)}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Citrus server responded with status: ${response.status}`);
      }

      const shardData: CitrusShardResponse = await response.json();
      
      return {
        shardId: shardData.shardId,
        connectionString: shardData.connectionString,
        isActive: shardData.isActive,
        lastHealthCheck: new Date(shardData.lastHealthCheck),
        businessCount: shardData.businessCount,
        maxBusinesses: shardData.maxBusinesses,
      };
    } catch (error) {
      console.error(`Failed to get shard for ${shardKey}:`, error);
      throw new Error(`Unable to determine shard for business ${businessId} location ${locationId}`);
    }
  }

  /**
   * Registers a new business+location combination with the Citrus sharding system
   * Citrus will automatically assign the appropriate shard based on its own logic
   */
  async registerBusinessLocation(businessId: string, locationId: string, businessType?: string): Promise<ShardConnection> {
    this.validateShardParams(businessId, locationId);

    const shardKey = `${businessId}-${locationId}`;
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          locationId,
          businessType,
          shardKey
        })
      });

      if (!response.ok) {
        throw new Error(`Citrus server responded with status: ${response.status}`);
      }

      const shardData: CitrusShardResponse = await response.json();
      
      console.log(`Successfully registered business-location ${shardKey} with Citrus server, assigned to shard ${shardData.shardId}`);
      
      return {
        shardId: shardData.shardId,
        connectionString: shardData.connectionString,
        isActive: shardData.isActive,
        lastHealthCheck: new Date(shardData.lastHealthCheck),
        businessCount: shardData.businessCount,
        maxBusinesses: shardData.maxBusinesses,
      };
    } catch (error) {
      console.error(`Failed to register ${shardKey}:`, error);
      throw new Error(`Unable to register business ${businessId} location ${locationId}`);
    }
  }

  /**
   * Gets health status of all shards from Citrus
   */
  async getShardsHealthStatus(): Promise<ShardConnection[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/shards/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Citrus server responded with status: ${response.status}`);
      }

      const shardsData: CitrusShardResponse[] = await response.json();
      
      return shardsData.map(shard => ({
        shardId: shard.shardId,
        connectionString: shard.connectionString,
        isActive: shard.isActive,
        lastHealthCheck: new Date(shard.lastHealthCheck),
        businessCount: shard.businessCount,
        maxBusinesses: shard.maxBusinesses,
      }));
    } catch (error) {
      console.error('Failed to get shards health status:', error);
      return [];
    }
  }

  /**
   * Gets shard usage statistics from Citrus
   */
  async getShardUsageStats(): Promise<Array<{ 
    shardId: string; 
    businessCount: number; 
    maxBusinesses: number; 
    usagePercentage: number;
    isActive: boolean;
  }>> {
    try {
      const shards = await this.getShardsHealthStatus();
      
      return shards.map(shard => ({
        shardId: shard.shardId,
        businessCount: shard.businessCount ?? 0,
        maxBusinesses: shard.maxBusinesses ?? 3,
        usagePercentage: shard.maxBusinesses ? (shard.businessCount ?? 0) / shard.maxBusinesses * 100 : 0,
        isActive: shard.isActive,
      }));
    } catch (error) {
      console.error('Failed to get shard usage stats:', error);
      return [];
    }
  }

  /**
   * Checks if a business can be added to a specific shard
   * This is handled by Citrus, but we can check the current status
   */
  async canAddBusinessToShard(shardId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/shard/${shardId}/capacity`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const capacityData = await response.json();
      return capacityData.canAcceptNewBusiness || false;
    } catch (error) {
      console.error(`Failed to check capacity for shard ${shardId}:`, error);
      return false;
    }
  }

  /**
   * Validates that businessId and locationId are provided
   */
  validateShardParams(businessId: string, locationId: string): void {
    if (!businessId || businessId.trim() === '') {
      throw new Error('Business ID is required for shard operations');
    }
    if (!locationId || locationId.trim() === '') {
      throw new Error('Location ID is required for shard operations');
    }
  }

  /**
   * Gets the Citrus server configuration
   */
  getConfig(): CitrusShardingConfig {
    return { ...this.config };
  }
}

export const citrusShardingService = new CitrusShardingService(); 