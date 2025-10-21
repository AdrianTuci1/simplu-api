import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBody } from '@nestjs/swagger';
import { PatientBookingService } from './patient-booking.service';
import { PatientAccessService } from './patient-access.service';
import { Public } from '../auth/decorators/public.decorator';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CognitoUser } from '../auth/auth.service';

@ApiTags('Patient Booking')
@Controller('patient-booking')
export class PatientBookingController {
  constructor(
    private readonly bookingService: PatientBookingService,
    private readonly patientAccessService: PatientAccessService,
  ) {}

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

  @Get('available-dates-with-slots/:businessId-:locationId')
  @Public()
  @ApiOperation({ summary: 'Get available dates with time slots included' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'from', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'medicId', required: false })
  async getAvailableDatesWithSlots(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('serviceId') serviceId?: string,
    @Query('medicId') medicId?: string,
  ) {
    return this.bookingService.getAvailableDatesWithSlots(businessId, locationId, from, to, serviceId, medicId);
  }

  @Post('reserve/:businessId-:locationId')
  @Public()
  @ApiOperation({ summary: 'Create a reservation using customer data' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:mm' },
        service: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, duration: { type: 'number' }, price: { type: 'number' } } },
        duration: { type: 'number', description: 'Duration in minutes' },
        medicId: { type: 'string', description: 'Optional medic ID for specific medic booking (auto-assigned if not provided)' },
        customer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
      required: ['date', 'time', 'serviceId', 'customer'],
    },
  })
  async reserve(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body()
    payload: {
      date: string; // YYYY-MM-DD
      time: string; // HH:mm
      service: {
        id: string;
        name: string;
        duration: number;
        price: number;
      };
      duration?: number; // minutes
      medicId?: string; // medic ID for specific medic booking
      description?: string; // description of the appointment
      customer: {
        name?: string;
        email?: string;
        phone?: string;
      };
    },
  ) {
    return this.bookingService.reserve(businessId, locationId, payload);
  }

  @Get('appointments/history/:businessId-:locationId')
  @Public()
  @ApiOperation({ summary: 'Get appointment history using customer email' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'email', required: true, description: 'Customer email to filter appointments' })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, description: 'scheduled|completed|canceled' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAppointmentHistory(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('email') email: string,
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
        email,
        from,
        to,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }

  @Post('appointments/modify/:businessId-:locationId/:appointmentId')
  @Public()
  @ApiOperation({ summary: 'Modify an appointment using customer data' })
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
        medicId: { type: 'string', description: 'Optional medic ID for specific medic booking (auto-assigned if not provided)' },
        customer: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
      required: ['customer'],
    },
  })
  async modifyScheduledAppointment(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('appointmentId') appointmentId: string,
    @Body()
    payload: {
      date?: string;
      time?: string;
      serviceId?: string;
      duration?: number;
      medicId?: string;
      customer: { name?: string; email?: string; phone?: string };
    },
  ) {
    return this.bookingService.modifyScheduledAppointment(businessId, locationId, appointmentId, payload);
  }

  @Get('rating/:businessId-:locationId/:token')
  @Public()
  @ApiOperation({ summary: 'Verify rating token and get appointment details' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiParam({ name: 'token' })
  async verifyRatingToken(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('token') token: string,
  ) {
    return this.bookingService.verifyRatingToken(businessId, locationId, token);
  }

  @Post('rating/:businessId-:locationId/:token/submit')
  @Public()
  @ApiOperation({ summary: 'Submit rating for completed appointment' })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiParam({ name: 'token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 5, description: 'Rating score (1-5 stars)' },
        comment: { type: 'string', description: 'Optional comment' },
        categories: {
          type: 'object',
          properties: {
            service: { type: 'number', minimum: 1, maximum: 5 },
            cleanliness: { type: 'number', minimum: 1, maximum: 5 },
            staff: { type: 'number', minimum: 1, maximum: 5 },
            waitTime: { type: 'number', minimum: 1, maximum: 5 },
          },
        },
      },
      required: ['score'],
    },
  })
  async submitRating(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('token') token: string,
    @Body() ratingData: {
      score: number;
      comment?: string;
      categories?: {
        service?: number;
        cleanliness?: number;
        staff?: number;
        waitTime?: number;
      };
    },
  ) {
    return this.bookingService.submitRating(businessId, locationId, token, ratingData);
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

  // ========================================
  // Patient Access Code Endpoints
  // ========================================

  @Post('validate-access/:businessId-:locationId')
  @Public()
  @ApiOperation({ 
    summary: 'Validate patient access code',
    description: 'Validates the 6-digit access code sent via SMS/Email against the patientId'
  })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Patient ID from URL query parameter' },
        accessCode: { type: 'string', description: '6-digit access code received via SMS/Email' },
      },
      required: ['patientId', 'accessCode'],
    },
  })
  async validateAccessCode(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() body: { patientId: string; accessCode: string },
  ) {
    const { patientId, accessCode } = body;
    
    const isValid = this.patientAccessService.validateAccessCode(patientId, accessCode);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid access code');
    }

    return {
      success: true,
      message: 'Access code validated successfully',
      patientId,
    };
  }

  @Get('patient-appointments/:businessId-:locationId')
  @Public()
  @ApiOperation({ 
    summary: 'Get patient appointments using access code',
    description: 'Returns appointments for a patient after validating their access code'
  })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient ID' })
  @ApiQuery({ name: 'accessCode', required: true, description: '6-digit access code' })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, description: 'scheduled|completed|canceled' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPatientAppointments(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Query('patientId') patientId: string,
    @Query('accessCode') accessCode: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validate access code
    const isValid = this.patientAccessService.validateAccessCode(patientId, accessCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid access code');
    }

    // Get appointments for this patient
    const businessLocationId = `${businessId}-${locationId}`;
    
    return this.bookingService.getPatientAppointmentsByPatientId(
      businessLocationId,
      patientId,
      {
        from,
        to,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }

  @Post('cancel-appointment/:businessId-:locationId/:appointmentId')
  @Public()
  @ApiOperation({ 
    summary: 'Cancel appointment using access code',
    description: 'Allows patient to cancel their appointment after validating access code'
  })
  @ApiParam({ name: 'businessId' })
  @ApiParam({ name: 'locationId' })
  @ApiParam({ name: 'appointmentId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Patient ID' },
        accessCode: { type: 'string', description: '6-digit access code' },
      },
      required: ['patientId', 'accessCode'],
    },
  })
  async cancelAppointmentWithAccessCode(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() body: { patientId: string; accessCode: string },
  ) {
    const { patientId, accessCode } = body;
    
    // Validate access code
    const isValid = this.patientAccessService.validateAccessCode(patientId, accessCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid access code');
    }

    // Cancel the appointment
    return this.bookingService.cancelAppointmentByPatient(
      businessId,
      locationId,
      appointmentId,
      patientId,
    );
  }
}


