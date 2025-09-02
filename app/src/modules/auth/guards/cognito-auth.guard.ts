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
    const authHeader = request.headers.authorization;
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

    if (!authHeader) {
      this.logger.warn(`No authorization header for ${method} ${url}`);
      throw new UnauthorizedException('Authorization header required');
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
}
