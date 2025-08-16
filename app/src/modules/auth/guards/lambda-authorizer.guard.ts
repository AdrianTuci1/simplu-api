import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { LambdaAuthorizerResponse } from '../interfaces';

@Injectable()
export class LambdaAuthorizerGuard implements CanActivate {
  private readonly logger = new Logger(LambdaAuthorizerGuard.name);

  constructor(
    private authService: AuthService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url;
    const method = request.method;

    this.logger.log(`Lambda authorizer check for ${method} ${url}`);

    // Check if endpoint is public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      this.logger.log(`Public endpoint accessed: ${method} ${url}`);
      return true;
    }

    // Check if Lambda authorizer is disabled
    const lambdaAuthorizerConfig = this.configService.get('lambdaAuthorizer');
    if (!lambdaAuthorizerConfig.enabled) {
      this.logger.warn(`Lambda authorizer is disabled - allowing access to ${method} ${url}`);
      return true;
    }

    // Check if bypass is enabled for development
    if (lambdaAuthorizerConfig.bypassForDevelopment) {
      this.logger.warn(`Lambda authorizer bypass enabled for development - allowing access to ${method} ${url}`);
      
      // If mock user is configured, attach it to the request
      if (lambdaAuthorizerConfig.mockUser) {
        const mockUser = await this.authService.validateLambdaAuthorizerResponse(lambdaAuthorizerConfig.mockUser);
        (request as any).user = mockUser;
        this.logger.log(`Mock user attached to request: ${mockUser.userId}`);
      }
      
      return true;
    }

    // Check for Lambda authorizer response in headers
    const authorizerResponse = this.extractAuthorizerResponse(request);
    
    if (authorizerResponse) {
      try {
        const user = await this.authService.validateLambdaAuthorizerResponse(authorizerResponse);
        this.logger.log(`Lambda authorizer response validated successfully for user ${user.userId} on ${method} ${url}`);

        // Attach user to request for use in controllers
        (request as any).user = user;
        return true;
      } catch (error) {
        this.logger.error(`Lambda authorizer response validation failed for ${method} ${url}: ${error.message}`, error.stack);
        throw new UnauthorizedException(`Lambda authorizer validation failed: ${error.message}`);
      }
    }

    // Check for JWT token with Lambda authorizer context
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      this.logger.debug(`JWT token received for ${method} ${url}: ${token.substring(0, 20)}...`);

      try {
        const user = await this.authService.validateLambdaAuthorizerToken(token);
        this.logger.log(`Lambda authorizer JWT token validated successfully for user ${user.userId} on ${method} ${url}`);

        // Attach user to request for use in controllers
        (request as any).user = user;
        return true;
      } catch (error) {
        this.logger.error(`Lambda authorizer JWT token validation failed for ${method} ${url}: ${error.message}`, error.stack);
        throw new UnauthorizedException(`Lambda authorizer JWT validation failed: ${error.message}`);
      }
    }

    // No valid authentication found
    this.logger.warn(`No valid Lambda authorizer authentication found for ${method} ${url}`);
    throw new UnauthorizedException('Lambda authorizer authentication required');
  }

  /**
   * Extracts Lambda authorizer response from request headers
   */
  private extractAuthorizerResponse(request: Request): LambdaAuthorizerResponse | null {
    // Check for Lambda authorizer response in custom headers
    const userId = request.headers['x-authorizer-user-id'] as string;
    const userName = request.headers['x-authorizer-user-name'] as string;
    const businessId = request.headers['x-authorizer-business-id'] as string;
    const rolesHeader = request.headers['x-authorizer-roles'] as string;

    if (!userId || !userName || !businessId || !rolesHeader) {
      return null;
    }

    try {
      const roles = JSON.parse(rolesHeader);
      
      if (!Array.isArray(roles)) {
        this.logger.warn('Invalid roles format in x-authorizer-roles header');
        return null;
      }

      return {
        userId,
        userName,
        businessId,
        roles,
      };
    } catch (error) {
      this.logger.warn('Failed to parse roles from x-authorizer-roles header');
      return null;
    }
  }
} 