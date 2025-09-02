import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CognitoUser } from '../auth.service';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CognitoUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
