import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthResult, ReadinessResult, LivenessResult } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: any[];
    errors?: string[];
  }> {
    const health = await this.healthService.checkHealth();
    
    if (health.status === 'healthy') {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: health.checks,
      };
    } else {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: health.checks,
        errors: health.errors,
      };
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is ready to serve traffic' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async getReadiness(): Promise<{
    status: string;
    timestamp: string;
    checks: any[];
    errors?: string[];
  }> {
    const readiness = await this.healthService.checkReadiness();
    
    if (readiness.status === 'ready') {
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: readiness.checks,
      };
    } else {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: readiness.checks,
        errors: readiness.errors,
      };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is not alive' })
  async getLiveness(): Promise<{
    status: string;
    timestamp: string;
    uptime?: number;
    memory?: any;
    errors?: string[];
  }> {
    const liveness = await this.healthService.checkLiveness();
    
    if (liveness.status === 'alive') {
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } else {
      return {
        status: 'dead',
        timestamp: new Date().toISOString(),
        errors: liveness.errors,
      };
    }
  }
}
