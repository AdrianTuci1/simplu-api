import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Headers
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

@ApiTags('History')
@Controller('history')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get business history for a specific day' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getHistory(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('date') date: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    return this.historyService.getHistory({
      tenantId,
      locationId,
      date,
      type,
      userId,
    });
  }
} 