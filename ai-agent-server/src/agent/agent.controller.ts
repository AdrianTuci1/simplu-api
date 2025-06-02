import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AgentService } from './agent.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('process')
  async processMessage(
    @Body() body: { message: string; context?: any },
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const sessionId = uuidv4(); // Generate a new session ID for each request
    
    return this.agentService.processMessage(
      tenantId,
      userId,
      sessionId,
      body.message,
      body.context
    );
  }
} 