import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// Base Resource Request
export class ResourceRequest {
  @ApiProperty({ description: 'Resource type' })
  @IsString()
  resourceType: string;

  @ApiProperty({ description: 'Operation to perform', required: false })
  @IsOptional()
  @IsString()
  operation?: string;

  @ApiProperty({ description: 'Resource data', required: false })
  @IsOptional()
  data?: any;
}

// Timeline Filters (for all business types)
export class TimelineFilters {
  @ApiProperty({ description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

// Dental Business Filters
export class DentalTimelineFilters extends TimelineFilters {
  @ApiProperty({ description: 'Dentist ID filter', required: false })
  @IsOptional()
  @IsString()
  dentistId?: string;
}

export class DentalClientsFilters {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Last visit date', required: false })
  @IsOptional()
  @IsDateString()
  lastVisit?: string;
}

export class DentalServicesFilters {
  @ApiProperty({ description: 'Category filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Active status filter', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// Gym Business Filters
export class GymTimelineFilters extends TimelineFilters {
  @ApiProperty({ description: 'Class ID filter', required: false })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ description: 'Trainer ID filter', required: false })
  @IsOptional()
  @IsString()
  trainerId?: string;
}

export class GymMembersFilters {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Membership status filter', required: false })
  @IsOptional()
  @IsString()
  membershipStatus?: string;

  @ApiProperty({ description: 'Membership type filter', required: false })
  @IsOptional()
  @IsString()
  membershipType?: string;
}

export class GymPackagesFilters {
  @ApiProperty({ description: 'Active status filter', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Category filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

// Hotel Business Filters
export class HotelTimelineFilters extends TimelineFilters {
  @ApiProperty({ description: 'Room ID filter', required: false })
  @IsOptional()
  @IsString()
  roomId?: string;
}

export class HotelClientsFilters {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Loyalty status filter', required: false })
  @IsOptional()
  @IsString()
  loyaltyStatus?: string;

  @ApiProperty({ description: 'Last stay date', required: false })
  @IsOptional()
  @IsDateString()
  lastStay?: string;
}

export class HotelRoomsFilters {
  @ApiProperty({ description: 'Room status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Room type filter', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Floor filter', required: false })
  @IsOptional()
  @IsNumber()
  floor?: number;
}

// Sales Resource Filters (Common Resource)
export class SalesProductsFilters {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Category filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'In stock filter', required: false })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({ description: 'Active status filter', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SalesSalesFilters {
  @ApiProperty({ description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

// Common Resource Filters
export class StocksFilters {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Category filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Low stock filter', required: false })
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;
}

export class InvoicesFilters {
  @ApiProperty({ description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Customer ID filter', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class ActivitiesFilters {
  @ApiProperty({ description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Type filter', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'User ID filter', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ReportsFilters {
  @ApiProperty({ description: 'Report type filter', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Resource Data DTOs for Creation
export class DentalClientData {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Medical history', required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ description: 'Allergies', required: false })
  @IsOptional()
  @IsArray()
  allergies?: string[];
}

export class DentalAppointmentData {
  @ApiProperty({ description: 'Patient ID' })
  @IsString()
  patientId: string;

  @ApiProperty({ description: 'Dentist ID' })
  @IsString()
  dentistId: string;

  @ApiProperty({ description: 'Treatment ID' })
  @IsString()
  treatmentId: string;

  @ApiProperty({ description: 'Appointment date' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ServiceData {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Service description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Active status' })
  @IsBoolean()
  active: boolean;
}

// Generic Resource Query DTO
export class ResourceQuery {
  @ApiProperty({
    description: 'Resource type',
    enum: [
      'timeline',
      'clients',
      'services',
      'members',
      'packages',
      'rooms',
      'products',
      'sales',
      'stocks',
      'invoices',
      'activities',
      'reports',
    ],
  })
  @IsString()
  resourceType: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ description: 'Additional filters', required: false })
  @IsOptional()
  filters?: Record<string, any>;
}
