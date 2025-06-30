import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Headers,
  Param
} from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TenantGuard } from '../tenants/guards/tenant.guard';

interface CreateAppointmentDto {
  clientId: string;
  doctorId?: string;
  trainerId?: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  notes?: string;
  status: string;
}

@ApiTags('Timeline')
@Controller('timeline')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('dental')
  @ApiOperation({ summary: 'Get dental timeline' })
  @ApiResponse({ status: 200, description: 'Dental timeline retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getDentalTimeline(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
  ) {
    return this.timelineService.getDentalTimeline(tenantId, locationId, {
      startDate,
      endDate,
      doctorId,
      status,
    });
  }

  @Post('dental')
  @ApiOperation({ summary: 'Create dental appointment' })
  @ApiResponse({ status: 201, description: 'Dental appointment created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createDentalAppointment(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.timelineService.createDentalAppointment(createAppointmentDto, tenantId, locationId);
  }

  @Get('gym')
  @ApiOperation({ summary: 'Get gym timeline' })
  @ApiResponse({ status: 200, description: 'Gym timeline retrieved successfully' })
  @ApiQuery({ name: 'type', required: true, enum: ['today', 'active-members', 'all-members'], description: 'Type of gym data to retrieve' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format (for all-members)' })
  @ApiQuery({ name: 'classType', required: false, type: String })
  @ApiQuery({ name: 'trainerId', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getGymTimeline(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('type') type: 'today' | 'active-members' | 'all-members',
    @Query('date') date?: string,
    @Query('classType') classType?: string,
    @Query('trainerId') trainerId?: string,
  ) {
    return this.timelineService.getGymTimeline(tenantId, locationId, {
      type,
      date,
      classType,
      trainerId,
    });
  }

  @Post('gym')
  @ApiOperation({ summary: 'Create gym appointment' })
  @ApiResponse({ status: 201, description: 'Gym appointment created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createGymAppointment(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.timelineService.createGymAppointment(createAppointmentDto, tenantId, locationId);
  }

  @Get('hotel')
  @ApiOperation({ summary: 'Get hotel timeline' })
  @ApiResponse({ status: 200, description: 'Hotel timeline retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'roomType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async getHotelTimeline(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('roomType') roomType?: string,
    @Query('status') status?: string,
  ) {
    return this.timelineService.getHotelTimeline(tenantId, locationId, {
      startDate,
      endDate,
      roomType,
      status,
    });
  }

  @Post('hotel')
  @ApiOperation({ summary: 'Create hotel reservation' })
  @ApiResponse({ status: 201, description: 'Hotel reservation created successfully' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiHeader({ name: 'X-Location-ID', required: true })
  async createHotelReservation(
    @Headers('X-Tenant-ID') tenantId: string,
    @Headers('X-Location-ID') locationId: string,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.timelineService.createHotelReservation(createAppointmentDto, tenantId, locationId);
  }
} 