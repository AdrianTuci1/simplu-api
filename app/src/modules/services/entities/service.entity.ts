import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

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

  @ApiProperty({ description: 'The duration of the service in minutes' })
  @Column({ type: 'int' })
  duration: number;

  @ApiProperty({ description: 'The price of the service' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

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
  @ManyToOne(() => Tenant, tenant => tenant.services, { lazy: true })
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

  @ApiProperty({ description: 'The creation date of the service' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the service' })
  @UpdateDateColumn()
  updatedAt: Date;
} 