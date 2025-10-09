import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);

  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    let authHeader = request.headers.authorization;
    const aiServerKey = request.headers['ai-server-key'] as string;
    const url = request.url;
    const method = request.method;

    this.logger.log(`Auth check for ${method} ${url}`);

    // Check if endpoint is public
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) {
      this.logger.log(`Public endpoint accessed: ${method} ${url}`);
      return true;
    }

    // Check AI-SERVER-KEY first (for internal services like cron jobs)
    if (aiServerKey) {
      return this.validateAiServerKey(aiServerKey, method, url, request);
    }

    // Fall back to Authorization header (Cognito tokens)
    if (!authHeader) {
      this.logger.warn(`No authorization header or AI-SERVER-KEY for ${method} ${url}`);
      throw new UnauthorizedException('Authorization header or AI-SERVER-KEY required');
    }

    // Clean the authorization header by removing backticks and extra whitespace
    if (typeof authHeader === 'string') {
      authHeader = authHeader.replace(/`/g, '').trim();
      this.logger.debug(`Cleaned auth header: ${authHeader.substring(0, 20)}...`);
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        `Invalid authorization header format for ${method} ${url}: ${authHeader.substring(0, 20)}...`,
      );
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authHeader.substring(7);
    this.logger.debug(
      `Token received for ${method} ${url}: ${token.substring(0, 20)}...`,
    );

    try {
      const user = await this.authService.validateAccessToken(token);
      this.logger.log(
        `Token validated successfully for user ${user.userId} on ${method} ${url}`,
      );

      // Attach user to request for use in controllers
      (request as any).user = user;

      return true;
    } catch (error) {
      this.logger.error(
        `Token validation failed for ${method} ${url}: ${error.message}`,
        error.stack,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        `Token validation failed: ${error.message}`,
      );
    }
  }

  /**
   * Validate AI-SERVER-KEY for internal service authentication
   * Used by cron jobs and other internal services
   * Sets an internal system user with full access
   */
  private validateAiServerKey(apiKey: string, method: string, url: string, request: any): boolean {
    const validApiKey = process.env.AI_SERVER_KEY;
    
    if (!validApiKey) {
      this.logger.error('AI_SERVER_KEY environment variable not configured');
      throw new UnauthorizedException('Internal authentication not configured');
    }

    if (apiKey !== validApiKey) {
      this.logger.warn(`Invalid AI-SERVER-KEY for ${method} ${url}`);
      throw new UnauthorizedException('Invalid AI-SERVER-KEY');
    }

    this.logger.log(`AI-SERVER-KEY validated successfully for ${method} ${url}`);
    
    // Set an internal system user with full access
    // This bypasses permission checks as it's an internal service
    request.user = {
      userId: 'system-internal',
      username: 'ai-agent-server',
      email: 'system@internal.service',
      businessId: 'system',
      isInternalService: true, // Flag to identify internal service requests
    };

    return true;
  }
}
