import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Appointment } from '../../timeline/entities/appointment.entity';

export enum ClientType {
  DENTAL = 'dental',
  GYM = 'gym',
  HOTEL = 'hotel',
}

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('clients')
export class Client {
  @ApiProperty({ description: 'The unique identifier of the client' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The first name of the client' })
  @Column()
  firstName: string;

  @ApiProperty({ description: 'The last name of the client' })
  @Column()
  lastName: string;

  @ApiProperty({ description: 'The email of the client' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'The phone number of the client' })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ description: 'The type of client', enum: ClientType })
  @Column({
    type: 'enum',
    enum: ClientType,
  })
  type: ClientType;

  @ApiProperty({ description: 'The status of the client', enum: ClientStatus })
  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  status: ClientStatus;

  @ApiProperty({ description: 'Additional notes about the client' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Dental-specific fields
  @ApiProperty({ description: 'Medical history for dental clients' })
  @Column({ type: 'text', nullable: true })
  medicalHistory: string;

  @ApiProperty({ description: 'Allergies for dental clients' })
  @Column({ type: 'text', nullable: true })
  allergies: string;

  @ApiProperty({ description: 'Insurance information for dental clients' })
  @Column({ nullable: true })
  insurance: string;

  @ApiProperty({ description: 'Last visit date for dental clients' })
  @Column({ type: 'date', nullable: true })
  lastVisit: Date;

  // Gym-specific fields
  @ApiProperty({ description: 'Membership type for gym clients' })
  @Column({ nullable: true })
  membershipType: string;

  @ApiProperty({ description: 'Membership start date for gym clients' })
  @Column({ type: 'date', nullable: true })
  membershipStart: Date;

  @ApiProperty({ description: 'Membership end date for gym clients' })
  @Column({ type: 'date', nullable: true })
  membershipEnd: Date;

  @ApiProperty({ description: 'Assigned trainer for gym clients' })
  @Column({ nullable: true })
  trainer: string;

  @ApiProperty({ description: 'Fitness goals for gym clients' })
  @Column({ type: 'text', nullable: true })
  fitnessGoals: string;

  // Hotel-specific fields
  @ApiProperty({ description: 'Guest type for hotel clients (individual/company)' })
  @Column({ nullable: true })
  guestType: string;

  @ApiProperty({ description: 'Passport number for hotel clients' })
  @Column({ nullable: true })
  passportNumber: string;

  @ApiProperty({ description: 'Nationality for hotel clients' })
  @Column({ nullable: true })
  nationality: string;

  @ApiProperty({ description: 'Loyalty points for hotel clients' })
  @Column('int', { default: 0 })
  loyaltyPoints: number;

  @ApiProperty({ description: 'Company name for corporate hotel clients' })
  @Column({ nullable: true })
  companyName: string;

  @ApiProperty({ description: 'VAT number for corporate hotel clients' })
  @Column({ nullable: true })
  vatNumber: string;

  @ApiProperty({ description: 'The tenant this client belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.clients)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The reservations associated with this client', type: () => [Reservation] })
  @OneToMany(() => Reservation, reservation => reservation.client, { lazy: true })
  reservations: Promise<Reservation[]>;

  @ApiProperty({ description: 'The invoices associated with this client', type: () => [Invoice] })
  @OneToMany(() => Invoice, invoice => invoice.client, { lazy: true })
  invoices: Promise<Invoice[]>;

  @ApiProperty({ description: 'The appointments associated with this client', type: () => [Appointment] })
  @OneToMany(() => Appointment, appointment => appointment.client)
  appointments: Promise<Appointment[]>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional data specific to the client type' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the client' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the client' })
  @UpdateDateColumn()
  updatedAt: Date;
} 