import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessToken, TokenUsageLog, TokenOperationType } from './token.entity';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  // Token costs for different operations
  private readonly TOKEN_COSTS = {
    [TokenOperationType.WHATSAPP_CONVERSATION]: 10,
    [TokenOperationType.SMS]: 1,
    [TokenOperationType.EMAIL]: 1,
    [TokenOperationType.ELEVEN_LABS_CALL]: 50,
    [TokenOperationType.INTERNAL_API_LLM]: 1,
    [TokenOperationType.MONTHLY_FEE]: 200,
  };

  constructor(
    @InjectRepository(BusinessToken)
    private businessTokenRepository: Repository<BusinessToken>,
    @InjectRepository(TokenUsageLog)
    private tokenUsageLogRepository: Repository<TokenUsageLog>,
  ) {}

  async getOrCreateBusinessToken(tenantId: string, locationId?: string): Promise<BusinessToken> {
    let token = await this.businessTokenRepository.findOne({
      where: { tenantId, locationId },
    });

    if (!token) {
      token = this.businessTokenRepository.create({
        tenantId,
        locationId,
        availableTokens: 0,
        totalTokensPurchased: 0,
        totalTokensUsed: 0,
      });
      await this.businessTokenRepository.save(token);
    }

    return token;
  }

  async checkTokenAvailability(tenantId: string, operationType: TokenOperationType, locationId?: string): Promise<boolean> {
    const token = await this.getOrCreateBusinessToken(tenantId, locationId);
    const requiredTokens = this.TOKEN_COSTS[operationType];
    
    return token.availableTokens >= requiredTokens;
  }

  async useTokens(
    tenantId: string,
    operationType: TokenOperationType,
    locationId?: string,
    userId?: string,
    sessionId?: string,
    description?: string,
    metadata?: any,
  ): Promise<boolean> {
    const token = await this.getOrCreateBusinessToken(tenantId, locationId);
    const requiredTokens = this.TOKEN_COSTS[operationType];

    if (token.availableTokens < requiredTokens) {
      this.logger.warn(`Insufficient tokens for tenant ${tenantId}. Required: ${requiredTokens}, Available: ${token.availableTokens}`);
      return false;
    }

    // Update token balance
    token.availableTokens -= requiredTokens;
    token.totalTokensUsed += requiredTokens;
    await this.businessTokenRepository.save(token);

    // Log usage
    const usageLog = this.tokenUsageLogRepository.create({
      tenantId,
      locationId,
      userId,
      sessionId,
      operationType,
      tokensUsed: requiredTokens,
      description,
      metadata,
    });
    await this.tokenUsageLogRepository.save(usageLog);

    this.logger.log(`Used ${requiredTokens} tokens for ${operationType} operation. Tenant: ${tenantId}, Remaining: ${token.availableTokens}`);
    return true;
  }

  async addTokens(tenantId: string, amount: number, locationId?: string): Promise<BusinessToken> {
    const token = await this.getOrCreateBusinessToken(tenantId, locationId);
    
    token.availableTokens += amount;
    token.totalTokensPurchased += amount;
    
    return this.businessTokenRepository.save(token);
  }

  async getTokenBalance(tenantId: string, locationId?: string): Promise<BusinessToken> {
    return this.getOrCreateBusinessToken(tenantId, locationId);
  }

  async getUsageHistory(
    tenantId: string,
    locationId?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ logs: TokenUsageLog[]; total: number }> {
    const query = this.tokenUsageLogRepository.createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });

    if (locationId) {
      query.andWhere('log.locationId = :locationId', { locationId });
    }

    const [logs, total] = await query
      .orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

  async processMonthlyFee(tenantId: string, locationId?: string): Promise<boolean> {
    const token = await this.getOrCreateBusinessToken(tenantId, locationId);
    const now = new Date();
    
    // Check if monthly fee was already processed this month
    if (token.lastMonthlyFeeDate) {
      const lastFeeDate = new Date(token.lastMonthlyFeeDate);
      const sameMonth = lastFeeDate.getFullYear() === now.getFullYear() && 
                       lastFeeDate.getMonth() === now.getMonth();
      
      if (sameMonth) {
        return true; // Already processed this month
      }
    }

    // Process monthly fee
    const success = await this.useTokens(
      tenantId,
      TokenOperationType.MONTHLY_FEE,
      locationId,
      undefined,
      undefined,
      'Monthly fee for internal API LLM usage',
    );

    if (success) {
      token.lastMonthlyFeeDate = now;
      await this.businessTokenRepository.save(token);
    }

    return success;
  }

  getTokenCost(operationType: TokenOperationType): number {
    return this.TOKEN_COSTS[operationType];
  }
} 