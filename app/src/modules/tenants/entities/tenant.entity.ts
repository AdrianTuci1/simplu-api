import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Service } from '../../services/entities/service.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ApiProperty } from '@nestjs/swagger';
import { StockItem } from '../../stock/entities/stock-item.entity';

@Entity('tenants')
export class Tenant {
  @ApiProperty({ description: 'The unique identifier of the tenant' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the tenant' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The unique slug for the tenant' })
  @Column({ unique: true })
  slug: string;

  @ApiProperty({ description: 'The description of the tenant', required: false })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: 'Additional settings for the tenant', required: false })
  @Column('jsonb', { nullable: true })
  settings: Record<string, any>;

  @ApiProperty({ description: 'The users associated with this tenant', type: () => [User] })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'user_tenants',
    joinColumn: { name: 'tenant_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  users: Promise<User[]>;

  @ApiProperty({ description: 'The clients associated with this tenant', type: () => [Client] })
  @OneToMany(() => Client, client => client.tenant)
  clients: Promise<Client[]>;

  @ApiProperty({ description: 'The employees associated with this tenant', type: () => [Employee] })
  @OneToMany(() => Employee, employee => employee.tenant)
  employees: Promise<Employee[]>;

  @ApiProperty({ description: 'The services associated with this tenant', type: () => [Service] })
  @OneToMany(() => Service, service => service.tenant)
  services: Promise<Service[]>;

  @ApiProperty({ description: 'The reservations associated with this tenant', type: () => [Reservation] })
  @OneToMany(() => Reservation, reservation => reservation.tenant)
  reservations: Promise<Reservation[]>;

  @ApiProperty({ description: 'The stock items associated with this tenant', type: () => [StockItem] })
  @OneToMany(() => StockItem, stockItem => stockItem.tenant)
  stockItems: Promise<StockItem[]>;

  @ApiProperty({ description: 'The creation date of the tenant' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the tenant' })
  @UpdateDateColumn()
  updatedAt: Date;
} 