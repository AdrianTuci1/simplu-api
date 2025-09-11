import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBody } from '@nestjs/swagger';
import { PatientBookingService } from './patient-booking.service';
import { Public } from '../auth/decorators/public.decorator';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CognitoUser } from '../auth/auth.service';

@ApiTags('Patient Booking')
@Controller('patient-booking')
export class PatientBookingController {
  constructor(private readonly bookingService: PatientBookingService) {}

  @Get('services/:businessId-:locationId')
  @Public()
  @ApiOperation({ summary: 'List public services available for booking' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPublicServices(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.listPublicServices(businessId, locationId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
  }

  @Get('available-dates/:businessId-:locationId')
  @Public()
  @ApiOperation({ summary: 'Get available dates with any free slots' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'from', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'serviceId', required: false })
  async getAvailableDates(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.bookingService.getAvailableDates(businessId, locationId, from, to, serviceId);
  }

  @Get('day-slots/:businessId-:locationId/:date')
  @Public()
  @ApiOperation({ summary: 'Get available time slots for a given day' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiParam({ name: 'date', description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'serviceId', required: false })
  async getDaySlots(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.bookingService.getDaySlots(businessId, locationId, date, serviceId);
  }

  @Post('reserve/:businessId-:locationId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reservation (auth optional via Public if desired)' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  async reserve(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body()
    payload: {
      date: string; // YYYY-MM-DD
      time: string; // HH:mm
      serviceId: string;
      duration?: number; // minutes
      customer?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    },
  ) {
    return this.bookingService.reserve(businessId, locationId, payload, user);
  }

  @Get('appointments/history/:businessId-:locationId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get appointment history for a business location' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, description: 'scheduled|completed|canceled' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAppointmentHistory(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.getAppointmentHistory(
      businessId,
      locationId,
      {
        from,
        to,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      user,
    );
  }

  @Post('appointments/modify/:businessId-:locationId/:appointmentId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modify an appointment with status scheduled' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiParam({ name: 'appointmentId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:mm' },
        serviceId: { type: 'string' },
        duration: { type: 'number' },
        customer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
    },
  })
  async modifyScheduledAppointment(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('appointmentId') appointmentId: string,
    @Body()
    payload: {
      date?: string;
      time?: string;
      serviceId?: string;
      duration?: number;
      customer?: { name?: string; email?: string; phone?: string };
    },
  ) {
    return this.bookingService.modifyScheduledAppointment(businessId, locationId, appointmentId, payload, user);
  }

  @Get('plan/:businessId-:locationId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user plan' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserPlan(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.getUserResourcesByType(
      businessId,
      locationId,
      'plan',
      user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('gallery/:businessId-:locationId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user gallery' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserGallery(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.getUserResourcesByType(
      businessId,
      locationId,
      'gallery',
      user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}


