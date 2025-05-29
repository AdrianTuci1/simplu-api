import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

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

  @ApiProperty({ description: 'Additional notes about the client' })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({ description: 'The tenant this client belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.clients, { lazy: true })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The reservations associated with this client', type: () => [Reservation] })
  @OneToMany(() => Reservation, reservation => reservation.client, { lazy: true })
  reservations: Promise<Reservation[]>;

  @ApiProperty({ description: 'The creation date of the client' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the client' })
  @UpdateDateColumn()
  updatedAt: Date;
} 