import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: any) {
    const user = req.user;
    return this.usersService.getMe(user.userId, user.email, user.firstName, user.lastName);
  }

  @Put('me')
  async updateMe(@Req() req: any, @Body() body: any) {
    const user = req.user;
    return this.usersService.updateMe(user.userId, user.email, body, user.firstName, user.lastName);
  }

  @Get('me/payment-methods')
  async getPaymentMethods(@Req() req: any) {
    const user = req.user;
    return this.usersService.getPaymentMethods(user.userId, user.email, user.firstName, user.lastName);
  }

  @Post('me/payment-methods')
  async addPaymentMethod(@Req() req: any, @Body() body: { paymentMethodId: string }) {
    const user = req.user;
    return this.usersService.addPaymentMethod(user.userId, user.email, body.paymentMethodId, user.firstName, user.lastName);
  }
}

