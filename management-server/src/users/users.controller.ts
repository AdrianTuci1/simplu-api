import { Body, Controller, Get, Put, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CognitoAuthGuard } from '../modules/auth/guards/cognito-auth.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (DynamoDB mapping to Cognito user)' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  async getMe(@Request() req: any) {
    const user = req.user; // contains userId (sub), email, name
    return this.usersService.getOrCreateUser(user.userId, user.email, user.name);
  }

  @Put('me')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile (address, default payment method)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(@Request() req: any, @Body() dto: UpdateUserDto) {
    const user = req.user;
    return this.usersService.updateUser(user.userId, dto as any);
  }
}

