import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';

// Hotel room data model
export class HotelRoomData {
  @ApiProperty({ description: 'Room number' })
  @IsString()
  roomNumber: string;

  @ApiProperty({
    description: 'Room type',
    enum: ['standard', 'deluxe', 'suite', 'presidential'],
  })
  @IsEnum(['standard', 'deluxe', 'suite', 'presidential'])
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential';

  @ApiProperty({ description: 'Floor number' })
  @IsNumber()
  floor: number;

  @ApiProperty({ description: 'Room capacity' })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    description: 'Bed type',
    enum: ['single', 'double', 'queen', 'king', 'twin'],
  })
  @IsEnum(['single', 'double', 'queen', 'king', 'twin'])
  bedType: 'single' | 'double' | 'queen' | 'king' | 'twin';

  @ApiProperty({ description: 'Room amenities' })
  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @ApiProperty({ description: 'Base rate per night' })
  @IsNumber()
  baseRate: number;

  @ApiProperty({
    description: 'Room status',
    enum: ['available', 'occupied', 'maintenance', 'out-of-order', 'cleaning'],
  })
  @IsEnum(['available', 'occupied', 'maintenance', 'out-of-order', 'cleaning'])
  status:
    | 'available'
    | 'occupied'
    | 'maintenance'
    | 'out-of-order'
    | 'cleaning';

  @ApiProperty({ description: 'Last cleaned date', required: false })
  @IsOptional()
  @IsDateString()
  lastCleaned?: string;

  @ApiProperty({ description: 'Next maintenance date', required: false })
  @IsOptional()
  @IsDateString()
  nextMaintenance?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
