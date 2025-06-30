import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Query, 
  UseGuards, 
  Headers
} from '@nestjs/common';
import { UserDataService } from './user-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader } from '@nestjs/swagger';

@ApiTags('User Data')
@Controller('user-data')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Get()
  @ApiOperation({ summary: 'Get user data' })
  @ApiResponse({ status: 200, description: 'User data retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getUserData(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @CurrentUser() user: any,
    @Query('type') type?: string,
  ) {
    return this.userDataService.getUserData({
      tenantId,
      userId: user.id,
      locationId,
      type,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Set user data' })
  @ApiResponse({ status: 201, description: 'User data set successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async setUserData(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @CurrentUser() user: any,
    @Body() setUserDataDto: any,
  ) {
    return this.userDataService.setUserData(setUserDataDto, tenantId, user.id, locationId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete user data' })
  @ApiResponse({ status: 200, description: 'User data deleted successfully' })
  @ApiQuery({ name: 'type', required: true, type: String })
  @ApiQuery({ name: 'key', required: true, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async deleteUserData(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @CurrentUser() user: any,
    @Query('type') type: string,
    @Query('key') key: string,
  ) {
    return this.userDataService.deleteUserData(type, key, tenantId, user.id, locationId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default user data' })
  @ApiResponse({ status: 200, description: 'Default user data retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDefaultUserData(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @CurrentUser() user: any,
  ) {
    return this.userDataService.getDefaultUserData(tenantId, user.id, locationId);
  }
} 