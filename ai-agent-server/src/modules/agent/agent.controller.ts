import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import { MessageDto } from '@/shared/interfaces/message.interface';
import { WebhookData } from './interfaces/agent.interface';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('process-message')
  async processMessage(@Body() data: MessageDto) {
    return await this.agentService.processMessage(data);
  }

  @Post('process-webhook')
  async processWebhook(@Body() webhookData: WebhookData) {
    return await this.agentService.processWebhookMessage(webhookData);
  }

  @Post('process-webhook-pipeline')
  async processWebhookThroughPipeline(@Body() webhookData: WebhookData) {
    return await this.agentService.processWebhookThroughPipeline(webhookData);
  }

  @Get('health')
  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Agent Service'
    };
  }

  @Get('test-intent/:message')
  async testIntent(@Param('message') message: string) {
    // Test endpoint pentru analiza intențiilor
    const intent = await (this.agentService as any).analyzeIntent(message, 'dental');
    return {
      message,
      intent,
      timestamp: new Date().toISOString()
    };
  }
} 