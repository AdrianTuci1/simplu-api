import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authHeader.substring(7);

    try {
      const user = await this.authService.validateAccessToken(token);

      // Attach user to request for use in controllers
      (request as any).user = user;

      // Validate business access if business context is available
      const businessId = request.headers['x-business-id'] as string;
      const locationId = request.headers['x-location-id'] as string;

      if (businessId && locationId) {
        const hasAccess = await this.authService.validateBusinessAccess(
          user,
          businessId,
          locationId,
        );

        if (!hasAccess) {
          throw new UnauthorizedException(
            'User does not have access to this business or location',
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
