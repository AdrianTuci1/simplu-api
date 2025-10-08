import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { CognitoUser } from '../auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as CognitoUser;

    if (!user) {
      this.logger.warn('Admin guard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has admin group
    const isAdmin = user.groups?.includes('admin') || user.groups?.includes('Admin');
    
    if (!isAdmin) {
      this.logger.warn(`Admin guard: User ${user.userId} is not an admin. Groups: ${JSON.stringify(user.groups)}`);
      throw new ForbiddenException('Admin access required');
    }

    this.logger.log(`Admin guard: User ${user.userId} has admin access`);
    return true;
  }
}
