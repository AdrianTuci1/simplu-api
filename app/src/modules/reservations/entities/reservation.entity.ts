import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Service } from '../../services/entities/service.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('reservations')
export class Reservation {
  @ApiProperty({ description: 'The unique identifier of the reservation' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The start time of the reservation' })
  @Column()
  startTime: Date;

  @ApiProperty({ description: 'The end time of the reservation' })
  @Column()
  endTime: Date;

  @ApiProperty({ description: 'The status of the reservation' })
  @Column()
  status: string;

  @ApiProperty({ description: 'Additional notes about the reservation' })
  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  cancellationReason?: {
    reason: string;
    cancelledBy: string;
    cancelledAt: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  reminderSent: {
    sent: boolean;
    sentAt: Date;
  };

  @ApiProperty({ description: 'The tenant this reservation belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.reservations, { lazy: true })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The client who made the reservation', type: () => Client })
  @ManyToOne(() => Client, client => client.reservations, { lazy: true })
  client: Promise<Client>;

  @ApiProperty({ description: 'The employee assigned to the reservation', type: () => Employee })
  @ManyToOne(() => Employee, employee => employee.reservations, { lazy: true })
  employee: Promise<Employee>;

  @ApiProperty({ description: 'The service being reserved', type: () => Service })
  @ManyToOne(() => Service, service => service.reservations, { lazy: true })
  service: Promise<Service>;

  @ApiProperty({ description: 'The creation date of the reservation' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the reservation' })
  @UpdateDateColumn()
  updatedAt: Date;
} 