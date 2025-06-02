import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { RoutesService } from './routes.service';


@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('process')
  async processRequest(
    @Body() body: { message: string; context?: any },
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    return await this.routesService.processRequest(
      tenantId,
      userId,
      body.message,
      body.context
    );
  }
} 