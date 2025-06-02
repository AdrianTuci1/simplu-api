import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post(':tenantId/messages')
  async createMessage(
    @Param('tenantId') tenantId: string,
    @Body('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.conversationsService.createMessage(tenantId, messageId, content);
  }

  @Get(':tenantId/messages')
  async getMessages(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.conversationsService.getMessages(tenantId, limit);
  }

  @Get('messages/:messageId')
  async getMessageByMessageId(@Param('messageId') messageId: string) {
    return this.conversationsService.getMessageByMessageId(messageId);
  }
} 