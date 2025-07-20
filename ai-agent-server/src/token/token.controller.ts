import { Controller, Get, Post, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenOperationType } from './token.entity';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('balance/:tenantId')
  async getTokenBalance(
    @Param('tenantId') tenantId: string,
    @Headers('x-location-id') locationId?: string,
  ) {
    return this.tokenService.getTokenBalance(tenantId, locationId);
  }

  @Get('usage/:tenantId')
  async getUsageHistory(
    @Param('tenantId') tenantId: string,
    @Headers('x-location-id') locationId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.tokenService.getUsageHistory(tenantId, locationId, limit, offset);
  }

  @Post('add/:tenantId')
  async addTokens(
    @Param('tenantId') tenantId: string,
    @Body() body: { amount: number },
    @Headers('x-location-id') locationId?: string,
  ) {
    return this.tokenService.addTokens(tenantId, body.amount, locationId);
  }

  @Get('costs')
  async getTokenCosts() {
    return {
      [TokenOperationType.WHATSAPP_CONVERSATION]: this.tokenService.getTokenCost(TokenOperationType.WHATSAPP_CONVERSATION),
      [TokenOperationType.SMS]: this.tokenService.getTokenCost(TokenOperationType.SMS),
      [TokenOperationType.EMAIL]: this.tokenService.getTokenCost(TokenOperationType.EMAIL),
      [TokenOperationType.ELEVEN_LABS_CALL]: this.tokenService.getTokenCost(TokenOperationType.ELEVEN_LABS_CALL),
      [TokenOperationType.INTERNAL_API_LLM]: this.tokenService.getTokenCost(TokenOperationType.INTERNAL_API_LLM),
      [TokenOperationType.MONTHLY_FEE]: this.tokenService.getTokenCost(TokenOperationType.MONTHLY_FEE),
    };
  }
} 