import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';

// Hotel reservation data model
export class HotelReservationData {
  @ApiProperty({ description: 'Guest ID' })
  @IsString()
  guestId: string;

  @ApiProperty({ description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Check-in date' })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({ description: 'Check-out date' })
  @IsDateString()
  checkOutDate: string;

  @ApiProperty({ description: 'Number of adults' })
  @IsNumber()
  numberOfGuests: number;

  @ApiProperty({ description: 'Number of nights' })
  @IsNumber()
  numberOfNights: number;

  @ApiProperty({ description: 'Room rate per night' })
  @IsNumber()
  roomRate: number;

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Reservation status',
    enum: ['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'],
  })
  @IsEnum(['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'])
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'no-show';

  @ApiProperty({
    description: 'Payment status',
    enum: ['pending', 'partial', 'paid', 'refunded'],
  })
  @IsEnum(['pending', 'partial', 'paid', 'refunded'])
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';

  @ApiProperty({ description: 'Special requests', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];

  @ApiProperty({
    description: 'Booking source',
    enum: [
      'direct',
      'online',
      'phone',
      'walk-in',
      'travel-agent',
      'booking-platform',
    ],
  })
  @IsEnum([
    'direct',
    'online',
    'phone',
    'walk-in',
    'travel-agent',
    'booking-platform',
  ])
  source:
    | 'direct'
    | 'online'
    | 'phone'
    | 'walk-in'
    | 'travel-agent'
    | 'booking-platform';

  @ApiProperty({ description: 'Confirmation number' })
  @IsString()
  confirmationNumber: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
