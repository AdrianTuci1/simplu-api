import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('employees')
export class Employee {
  @ApiProperty({ description: 'The unique identifier of the employee' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The first name of the employee' })
  @Column()
  firstName: string;

  @ApiProperty({ description: 'The last name of the employee' })
  @Column()
  lastName: string;

  @ApiProperty({ description: 'The email of the employee' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'The phone number of the employee' })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ description: 'The position of the employee' })
  @Column()
  position: string;

  @ApiProperty({ description: 'Additional notes about the employee' })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({ description: 'The tenant this employee belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.employees, { lazy: true })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The reservations associated with this employee', type: () => [Reservation] })
  @OneToMany(() => Reservation, reservation => reservation.employee, { lazy: true })
  reservations: Promise<Reservation[]>;

  @ApiProperty({ description: 'The associated user account', type: () => User })
  @OneToOne(() => User, user => user.employee, { lazy: true })
  user: Promise<User>;

  @ApiProperty({ description: 'The creation date of the employee' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the employee' })
  @UpdateDateColumn()
  updatedAt: Date;
} 