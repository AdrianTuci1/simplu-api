import { Controller, Post, Body, Param } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post(':tenantId/message')
  async processMessage(
    @Param('tenantId') tenantId: string,
    @Body('message') message: string,
  ) {
    return this.agentService.processMessage(message, tenantId);
  }
} 