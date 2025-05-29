import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-tenant-id'];
  },
); 