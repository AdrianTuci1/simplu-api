# Implementation Plan

- [x] 1. Create unified configuration structure
  - [x] 1.1 Create unified.config.ts file
    - Create a new file that consolidates all configuration functions
    - Ensure backward compatibility with existing services
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Migrate database configuration
    - Move database configuration from database.config.ts and typeorm.config.ts to unified.config.ts
    - Add validation for required environment variables
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 1.3 Migrate Kafka configuration
    - Move Kafka configuration from kafka.config.ts to unified.config.ts
    - Add support for both standard Kafka and AWS MSK
    - _Requirements: 1.3, 2.1, 2.6_

  - [x] 1.4 Migrate Redis configuration
    - Move Redis configuration from redis.config.ts to unified.config.ts
    - _Requirements: 1.1, 1.4_

  - [x] 1.5 Update app.module.ts
    - Update imports to use the new unified configuration
    - _Requirements: 1.1, 1.5_

- [x] 2. Implement AWS MSK integration
  - [x] 2.1 Add AWS SDK dependencies
    - Add @aws-sdk/client-kafka and @aws-sdk/client-msk to package.json
    - _Requirements: 2.1_

  - [x] 2.2 Create MSK configuration interface
    - Define interfaces for MSK configuration
    - Add support for IAM authentication
    - _Requirements: 2.1, 2.4, 2.6_

  - [x] 2.3 Create MSK service
    - Create a new service that uses AWS SDK for MSK
    - Implement connection, publishing, and consuming methods
    - Add error handling and reconnection logic
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 2.4 Update Kafka service
    - Modify the existing Kafka service to use the new MSK service
    - Ensure backward compatibility with existing code
    - _Requirements: 2.1, 2.2, 2.7_

- [x] 3. Add environment configuration
  - [x] 3.1 Update environment variables
    - Add AWS MSK specific environment variables
    - Update example.env file with new variables
    - _Requirements: 2.1, 2.4, 2.6, 2.8_

  - [x] 3.2 Add environment-specific configurations
    - Create configurations for development, staging, and production
    - _Requirements: 2.8_

- [x] 4. Implement testing
  - [x] 4.1 Add unit tests for unified configuration
    - Test configuration loading with various environment variables
    - Test error handling for missing variables
    - _Requirements: 1.6, 2.6_

  - [x] 4.2 Add unit tests for MSK service
    - Test connection, publishing, and consuming with mocked AWS SDK
    - Test error handling and reconnection logic
    - _Requirements: 2.5_

  - [-] 4.3 Add integration tests
    - Test connection to AWS MSK using local credentials
    - Test publishing and consuming messages
    - _Requirements: 2.1, 2.2, 2.3_
    - Note: Integration tests require actual AWS MSK cluster access and will be implemented in a separate PR