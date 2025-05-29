import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentTenant } from '../tenants/decorators/tenant.decorator';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'The reservation has been successfully created.', type: Reservation })
  create(@Body() createReservationDto: CreateReservationDto, @CurrentTenant() tenant: Tenant) {
    return this.reservationsService.create(createReservationDto, tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiResponse({ status: 200, description: 'Return all reservations.', type: [Reservation] })
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.reservationsService.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  @ApiResponse({ status: 200, description: 'Return the reservation.', type: Reservation })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.reservationsService.findOne(id, tenant.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiResponse({ status: 200, description: 'The reservation has been successfully updated.', type: Reservation })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.reservationsService.update(id, updateReservationDto, tenant.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiResponse({ status: 200, description: 'The reservation has been successfully deleted.' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.reservationsService.remove(id, tenant.id);
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string, @CurrentTenant() tenant: Tenant) {
    return this.reservationsService.findByClient(clientId, tenant.id);
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string, @CurrentTenant() tenant: Tenant) {
    return this.reservationsService.findByEmployee(employeeId, tenant.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ReservationStatus,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.reservationsService.updateStatus(id, status, tenant.id);
  }
} 