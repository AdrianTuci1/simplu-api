import { Controller, Post, Body, Param, UnauthorizedException } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('api')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post(':tenantId/chat')
  async chat(
    @Param('tenantId') tenantId: string,
    @Body('message') message: string,
  ) {
    try {
      return await this.routesService.processRequest(tenantId, message);
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
} 