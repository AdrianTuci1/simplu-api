import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly verifier: any;

  constructor(private readonly configService: ConfigService) {
    const userPoolId = this.configService.get<string>('cognito.userPoolId');
    const clientId = this.configService.get<string>('cognito.clientId');
    
    this.verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.verifier.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 