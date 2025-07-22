# Design Document: Configuration Consolidation and AWS MSK Migration

## Overview

This design document outlines the approach for implementing two critical infrastructure improvements:

1. **Configuration Consolidation**: Creating a unified configuration structure to improve maintainability and reduce duplication
2. **AWS MSK Migration**: Migrating from standard Kafka to AWS MSK to leverage AWS's managed service benefits

These changes will improve the system's maintainability, security, and scalability while reducing operational overhead.

## Architecture

### Current Architecture

The current architecture has several configuration files:
- `database.config.ts`: Contains PostgreSQL database configuration
- `typeorm.config.ts`: Contains TypeORM-specific configuration
- `kafka.config.ts`: Contains Kafka configuration
- `redis.config.ts`: Contains Redis configuration

The Kafka service currently uses the `kafkajs` library to connect to a standard Kafka broker.

### New Architecture

The new architecture will:

1. Consolidate all configuration into a unified structure in `src/config/unified.config.ts`
2. Replace the `kafkajs` library with AWS SDK for MSK in the Kafka service
3. Update all services to use the new unified configuration

## Components and Interfaces

### 1. Unified Configuration

#### `unified.config.ts`

This will be the central configuration file that exports functions to get configuration for different services:

```typescript
export function getDatabaseConfig(configService: ConfigService): TypeOrmModuleOptions;
export function getTypeOrmDataSource(configService: ConfigService): DataSource;
export function getKafkaConfig(configService: ConfigService): KafkaOptions;
export function getMskConfig(configService: ConfigService): MskOptions;
export function getRedisConfig(configService: ConfigService): RedisOptions;
```

### 2. AWS MSK Client

#### `msk.service.ts`

This will replace the current `kafka.service.ts` and use AWS SDK for MSK:

```typescript
@Injectable()
export class MskService {
  private producer: Producer;
  
  constructor(private configService: ConfigService) {
    // Initialize AWS MSK client
  }
  
  async publish(topic: string, message: any): Promise<void>;
  async disconnect(): Promise<void>;
}
```

## Data Models

### MSK Configuration Interface

```typescript
interface MskOptions {
  region: string;
  brokers: string[];
  clientId: string;
  groupId: string;
  authentication: {
    type: 'IAM' | 'SASL' | 'NONE';
    // IAM-specific properties
    iamRole?: string;
    // SASL-specific properties
    username?: string;
    password?: string;
  };
}
```

### Unified Configuration Interface

```typescript
interface UnifiedConfig {
  database: TypeOrmModuleOptions;
  kafka: KafkaOptions | MskOptions;
  redis: RedisOptions;
}
```

## Error Handling

### Configuration Validation

The unified configuration will include validation to ensure all required environment variables are present:

1. Required environment variables will be checked at startup
2. Clear error messages will be provided for missing variables
3. Type validation will be performed on configuration values

### MSK Connection Handling

The MSK service will include robust error handling:

1. Connection failures will be logged with detailed error information
2. Automatic reconnection with exponential backoff will be implemented
3. Health checks will be added to monitor MSK connection status

## Testing Strategy

### Unit Tests

1. Test unified configuration with various environment variables
2. Test MSK service with mocked AWS SDK
3. Test error handling for missing configuration

### Integration Tests

1. Test connection to AWS MSK using local credentials
2. Test publishing and consuming messages
3. Test reconnection behavior

### End-to-End Tests

1. Deploy to a test environment with AWS MSK
2. Verify message publishing and consumption
3. Verify behavior under network interruptions

## Implementation Plan

### Phase 1: Configuration Consolidation

1. Create `unified.config.ts` with all configuration functions
2. Update imports in `app.module.ts` and other services
3. Add validation for required environment variables
4. Add unit tests for configuration

### Phase 2: AWS MSK Migration

1. Add AWS SDK dependencies
2. Create MSK service with AWS SDK integration
3. Update Kafka service to use MSK service
4. Add environment variables for AWS MSK
5. Add unit and integration tests

### Phase 3: Deployment and Verification

1. Deploy to development environment
2. Verify MSK connection and message publishing
3. Monitor for any issues
4. Update documentation