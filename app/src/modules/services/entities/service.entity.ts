import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum ServiceType {
  DENTAL = 'dental',
  GYM = 'gym',
  HOTEL = 'hotel',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Entity('services')
export class Service {
  @ApiProperty({ description: 'The unique identifier of the service' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the service' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the service' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'The type of service', enum: ServiceType })
  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  type: ServiceType;

  @ApiProperty({ description: 'The status of the service', enum: ServiceStatus })
  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.ACTIVE,
  })
  status: ServiceStatus;

  @ApiProperty({ description: 'The price of the service' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'The duration of the service in minutes' })
  @Column('int', { nullable: true })
  duration: number;

  // Hotel-specific fields (for rooms)
  @ApiProperty({ description: 'Room type for hotel services' })
  @Column({ nullable: true })
  roomType: string;

  @ApiProperty({ description: 'Room name for hotel services' })
  @Column({ nullable: true })
  roomName: string;

  @ApiProperty({ description: 'Maximum number of persons for hotel rooms' })
  @Column('int', { nullable: true })
  maxPersons: number;

  @ApiProperty({ description: 'Room number for hotel services' })
  @Column({ nullable: true })
  roomNumber: string;

  @ApiProperty({ description: 'Room floor for hotel services' })
  @Column({ nullable: true })
  floor: string;

  @ApiProperty({ description: 'Room amenities for hotel services' })
  @Column('jsonb', { nullable: true })
  amenities: string[];

  // Gym-specific fields
  @ApiProperty({ description: 'Class type for gym services' })
  @Column({ nullable: true })
  classType: string;

  @ApiProperty({ description: 'Trainer for gym services' })
  @Column({ nullable: true })
  trainer: string;

  @ApiProperty({ description: 'Maximum capacity for gym classes' })
  @Column('int', { nullable: true })
  maxCapacity: number;

  // Dental-specific fields
  @ApiProperty({ description: 'Treatment category for dental services' })
  @Column({ nullable: true })
  treatmentCategory: string;

  @ApiProperty({ description: 'Treatment color for dental services' })
  @Column({ nullable: true })
  treatmentColor: string;

  @ApiProperty({ description: 'The category of the service' })
  @Column({ type: 'jsonb', nullable: true })
  category: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'The images associated with the service' })
  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @ApiProperty({ description: 'The requirements for the service' })
  @Column({ type: 'jsonb', nullable: true })
  requirements: string[];

  @ApiProperty({ description: 'The benefits of the service' })
  @Column({ type: 'jsonb', nullable: true })
  benefits: string[];

  @ApiProperty({ description: 'Whether the service is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional settings for the service' })
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    maxBookingsPerDay?: number;
    minNoticeHours?: number;
    maxNoticeDays?: number;
    cancellationPolicy?: string;
  };

  @ApiProperty({ description: 'The tenant this service belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.services)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The employees associated with the service', type: () => [Employee] })
  @ManyToMany(() => Employee, { lazy: true })
  @JoinTable({
    name: 'service_employees',
    joinColumn: { name: 'service_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' },
  })
  employees: Promise<Employee[]>;

  @ApiProperty({ description: 'The reservations associated with the service', type: () => [Reservation] })
  @OneToMany(() => Reservation, reservation => reservation.service, { lazy: true })
  reservations: Promise<Reservation[]>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional data specific to the service type' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the service' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the service' })
  @UpdateDateColumn()
  updatedAt: Date;
} 