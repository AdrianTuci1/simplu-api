import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { BaseTimelineData } from '../common/shared-interfaces';

// Hotel timeline data (reservations and events view)
export class HotelTimelineData extends BaseTimelineData {
  @ApiProperty({ description: 'Entry type', enum: ['reservation', 'check-in', 'check-out', 'maintenance'] })
  @IsEnum(['reservation', 'check-in', 'check-out', 'maintenance'])
  type: 'reservation' | 'check-in' | 'check-out' | 'maintenance';

  @ApiProperty({ description: 'Guest information', required: false })
  @IsOptional()
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  @ApiProperty({ description: 'Room information' })
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
  };

  @ApiProperty({ description: 'Number of nights', required: false })
  @IsOptional()
  @IsNumber()
  numberOfNights?: number;

  @ApiProperty({ description: 'Total amount', required: false })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiProperty({ description: 'Status', enum: ['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'] })
  @IsEnum(['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'])
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'no-show';

  @ApiProperty({ description: 'Confirmation number', required: false })
  @IsOptional()
  @IsString()
  confirmationNumber?: string;
}