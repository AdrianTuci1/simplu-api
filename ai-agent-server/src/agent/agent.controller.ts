import { Controller, Post, Body, Headers, UnauthorizedException, Get, Param, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ConversationsService } from '../conversations/conversations.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post('process')
  async processMessage(
    @Body() body: { message: string; context?: any; sessionId?: string },
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-location-id') locationId?: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const sessionId = body.sessionId || uuidv4();
    
    return this.agentService.processMessage(
      tenantId,
      userId,
      sessionId,
      body.message,
      {
        ...body.context,
        locationId,
      }
    );
  }

  @Get('conversations/:tenantId/users/:userId')
  async getConversations(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Headers('x-location-id') locationId?: string,
  ) {
    return this.conversationsService.getSessions(tenantId, userId, limit);
  }

  @Get('conversations/:tenantId/sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('tenantId') tenantId: string,
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Headers('x-location-id') locationId?: string,
  ) {
    return this.conversationsService.getSessionMessages(tenantId, sessionId, limit, before);
  }

  @Get('conversations/:tenantId/sessions/:sessionId')
  async getSession(
    @Param('tenantId') tenantId: string,
    @Param('sessionId') sessionId: string,
    @Headers('x-location-id') locationId?: string,
  ) {
    return this.conversationsService.getSession(tenantId, sessionId);
  }
} 