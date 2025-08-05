import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { KinesisService } from './kinesis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly kinesisService: KinesisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        kinesis: 'configured', // Could add actual health check here
      },
      version: process.env.APP_VERSION || '1.0.0',
    };
  }
}
