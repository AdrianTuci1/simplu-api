import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../resources/entities/resource.entity';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface HealthResult {
  status: 'healthy' | 'unhealthy';
  checks: HealthCheck[];
  errors?: string[];
}

export interface ReadinessResult {
  status: 'ready' | 'not ready';
  checks: HealthCheck[];
  errors?: string[];
}

export interface LivenessResult {
  status: 'alive' | 'dead';
  errors?: string[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
  ) {}

  async checkHealth(): Promise<HealthResult> {
    const checks: HealthCheck[] = [];
    const errors: string[] = [];

    // Check database connectivity
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);
    if (dbCheck.status === 'unhealthy') {
      errors.push(`Database: ${dbCheck.error}`);
    }

    // Check memory usage
    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);
    if (memoryCheck.status === 'unhealthy') {
      errors.push(`Memory: ${memoryCheck.error}`);
    }

    // Check environment variables
    const envCheck = this.checkEnvironment();
    checks.push(envCheck);
    if (envCheck.status === 'unhealthy') {
      errors.push(`Environment: ${envCheck.error}`);
    }

    // Check application uptime
    const uptimeCheck = this.checkUptime();
    checks.push(uptimeCheck);
    if (uptimeCheck.status === 'unhealthy') {
      errors.push(`Uptime: ${uptimeCheck.error}`);
    }

    const isHealthy = checks.every((check) => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async checkReadiness(): Promise<ReadinessResult> {
    const checks: HealthCheck[] = [];
    const errors: string[] = [];

    // Check database connectivity (critical for readiness)
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);
    if (dbCheck.status === 'unhealthy') {
      errors.push(`Database: ${dbCheck.error}`);
    }

    // Check if we can perform basic database operations
    const dbOperationsCheck = await this.checkDatabaseOperations();
    checks.push(dbOperationsCheck);
    if (dbOperationsCheck.status === 'unhealthy') {
      errors.push(`Database Operations: ${dbOperationsCheck.error}`);
    }

    const isReady = checks.every((check) => check.status === 'healthy');

    return {
      status: isReady ? 'ready' : 'not ready',
      checks,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async checkLiveness(): Promise<LivenessResult> {
    const errors: string[] = [];

    // Check if process is responsive
    const uptime = process.uptime();
    if (uptime < 0) {
      errors.push('Process uptime is negative');
    }

    // Check memory usage (if too high, process might be dead)
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    const maxMemoryMB = 1024; // 1GB threshold

    if (memoryUsageMB > maxMemoryMB) {
      errors.push(`Memory usage too high: ${memoryUsageMB.toFixed(2)}MB`);
    }

    return {
      status: errors.length === 0 ? 'alive' : 'dead',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Try to execute a simple query
      await this.resourceRepository.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: 'healthy',
        responseTime,
        details: {
          type: 'postgresql',
          responseTime: `${responseTime}ms`,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          type: 'postgresql',
          error: error.message,
        },
      };
    }
  }

  private async checkDatabaseOperations(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Try to count resources (basic operation)
      const count = await this.resourceRepository.count();

      const responseTime = Date.now() - startTime;

      return {
        name: 'database-operations',
        status: 'healthy',
        responseTime,
        details: {
          operation: 'count',
          result: count,
          responseTime: `${responseTime}ms`,
        },
      };
    } catch (error) {
      this.logger.error('Database operations health check failed:', error);

      return {
        name: 'database-operations',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          operation: 'count',
          error: error.message,
        },
      };
    }
  }

  private checkMemory(): HealthCheck {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const rssMB = memoryUsage.rss / 1024 / 1024;

    // Thresholds
    const maxHeapUsedMB = 512; // 512MB
    const maxRssMB = 1024; // 1GB

    if (heapUsedMB > maxHeapUsedMB || rssMB > maxRssMB) {
      return {
        name: 'memory',
        status: 'unhealthy',
        error: `Memory usage exceeded thresholds: heap=${heapUsedMB.toFixed(2)}MB, rss=${rssMB.toFixed(2)}MB`,
        details: {
          heapUsed: `${heapUsedMB.toFixed(2)}MB`,
          heapTotal: `${heapTotalMB.toFixed(2)}MB`,
          rss: `${rssMB.toFixed(2)}MB`,
          maxHeapUsed: `${maxHeapUsedMB}MB`,
          maxRss: `${maxRssMB}MB`,
        },
      };
    }

    return {
      name: 'memory',
      status: 'healthy',
      details: {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        heapTotal: `${heapTotalMB.toFixed(2)}MB`,
        rss: `${rssMB.toFixed(2)}MB`,
      },
    };
  }

  private checkEnvironment(): HealthCheck {
    const requiredEnvVars = [
      'DATABASE_TYPE',
      'RDS_HOST',
      'RDS_USERNAME',
      'RDS_PASSWORD',
      'RDS_DATABASE',
    ];

    const missingVars: string[] = [];
    const envDetails: Record<string, string> = {};

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        missingVars.push(envVar);
      } else {
        // Mask sensitive values
        const maskedValue =
          envVar.includes('PASSWORD') || envVar.includes('SECRET')
            ? '***'
            : value;
        envDetails[envVar] = maskedValue;
      }
    }

    if (missingVars.length > 0) {
      return {
        name: 'environment',
        status: 'unhealthy',
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        details: {
          missing: missingVars,
          present: envDetails,
        },
      };
    }

    return {
      name: 'environment',
      status: 'healthy',
      details: {
        nodeEnv: process.env.NODE_ENV || 'development',
        databaseType: process.env.DATABASE_TYPE,
        present: envDetails,
      },
    };
  }

  private checkUptime(): HealthCheck {
    const uptime = process.uptime();
    const uptimeMinutes = uptime / 60;
    const maxUptimeMinutes = 1440; // 24 hours (for demo purposes)

    if (uptime < 0) {
      return {
        name: 'uptime',
        status: 'unhealthy',
        error: 'Process uptime is negative',
        details: {
          uptime: `${uptime}s`,
          uptimeMinutes: `${uptimeMinutes.toFixed(2)}min`,
        },
      };
    }

    if (uptimeMinutes > maxUptimeMinutes) {
      return {
        name: 'uptime',
        status: 'unhealthy',
        error: `Process uptime exceeded ${maxUptimeMinutes} minutes`,
        details: {
          uptime: `${uptime}s`,
          uptimeMinutes: `${uptimeMinutes.toFixed(2)}min`,
          maxUptimeMinutes: `${maxUptimeMinutes}min`,
        },
      };
    }

    return {
      name: 'uptime',
      status: 'healthy',
      details: {
        uptime: `${uptime}s`,
        uptimeMinutes: `${uptimeMinutes.toFixed(2)}min`,
      },
    };
  }
}
