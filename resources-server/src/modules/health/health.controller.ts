import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'resources-server' },
        timestamp: { type: 'string', example: '2025-01-08T10:00:00.000Z' }
      }
    }
  })
  check() {
    return {
      status: 'ok',
      service: 'resources-server',
      timestamp: new Date().toISOString()
    };
  }
}