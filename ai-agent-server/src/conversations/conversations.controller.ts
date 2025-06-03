import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get(':tenantId/users/:userId')
  async getSessions(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string
  ) {
    return this.conversationsService.getSessions(tenantId, userId, limit);
  }

  @Get(':tenantId/sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('tenantId') tenantId: string,
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string
  ) {
    return this.conversationsService.getSessionMessages(tenantId, sessionId, limit, before);
  }
} 