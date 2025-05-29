import { IsString, IsDate, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class CreateReservationDto {
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  clientId: string;

  @IsUUID()
  employeeId: string;

  @IsUUID()
  serviceId: string;
} 