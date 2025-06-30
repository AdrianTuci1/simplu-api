import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Package } from '../../packages/entities/package.entity';
import { Service } from '../../services/entities/service.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AppointmentType {
  DENTAL = 'dental',
  GYM = 'gym',
  HOTEL = 'hotel',
}

@Entity('appointments')
export class Appointment {
  @ApiProperty({ description: 'The unique identifier of the appointment' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The type of appointment', enum: AppointmentType })
  @Column({
    type: 'enum',
    enum: AppointmentType,
  })
  type: AppointmentType;

  @ApiProperty({ description: 'The status of the appointment', enum: AppointmentStatus })
  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @ApiProperty({ description: 'The date of the appointment' })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({ description: 'The time of the appointment' })
  @Column({ type: 'time' })
  time: string;

  @ApiProperty({ description: 'The duration of the appointment in minutes' })
  @Column('int')
  duration: number;

  @ApiProperty({ description: 'The service being provided' })
  @Column()
  service: string;

  @ApiProperty({ description: 'Additional notes for the appointment' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Dental-specific fields
  @ApiProperty({ description: 'Doctor notes for dental appointments' })
  @Column({ type: 'text', nullable: true })
  doctorNotes: string;

  @ApiProperty({ description: 'Treatment type for dental appointments' })
  @Column({ nullable: true })
  treatmentType: string;

  // Gym-specific fields
  @ApiProperty({ description: 'Class type for gym appointments' })
  @Column({ nullable: true })
  classType: string;

  @ApiProperty({ description: 'Trainer notes for gym appointments' })
  @Column({ type: 'text', nullable: true })
  trainerNotes: string;

  // Hotel-specific fields
  @ApiProperty({ description: 'Room number for hotel reservations' })
  @Column({ nullable: true })
  roomNumber: string;

  @ApiProperty({ description: 'Check-in date for hotel reservations' })
  @Column({ type: 'date', nullable: true })
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date for hotel reservations' })
  @Column({ type: 'date', nullable: true })
  checkOut: Date;

  @ApiProperty({ description: 'Special requests for hotel reservations' })
  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @ApiProperty({ description: 'The tenant this appointment belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.appointments)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The client for this appointment', type: () => Client })
  @ManyToOne(() => Client, client => client.appointments)
  @JoinColumn({ name: 'client_id' })
  client: Promise<Client>;

  @ApiProperty({ description: 'The employee/doctor/trainer for this appointment', type: () => Employee })
  @ManyToOne(() => Employee, employee => employee.appointments, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Promise<Employee>;

  // Dental: Relation to packages (treatments)
  @ApiProperty({ description: 'Dental packages/treatments for this appointment', type: () => [Package] })
  @ManyToMany(() => Package, { nullable: true })
  @JoinTable({
    name: 'appointment_packages',
    joinColumn: { name: 'appointment_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'package_id', referencedColumnName: 'id' },
  })
  packages: Promise<Package[]>;

  // Gym: Relation to services (classes/trainings)
  @ApiProperty({ description: 'Gym services for this appointment', type: () => [Service] })
  @ManyToMany(() => Service, { nullable: true })
  @JoinTable({
    name: 'appointment_services',
    joinColumn: { name: 'appointment_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_id', referencedColumnName: 'id' },
  })
  services: Promise<Service[]>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional data specific to the appointment type' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the appointment' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the appointment' })
  @UpdateDateColumn()
  updatedAt: Date;
} 