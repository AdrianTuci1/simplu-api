import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Service } from '../../services/entities/service.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ApiProperty } from '@nestjs/swagger';
import { StockItem } from '../../stock/entities/stock-item.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Appointment } from '../../timeline/entities/appointment.entity';
import { Package } from '../../packages/entities/package.entity';
import { History } from '../../history/entities/history.entity';
import { Workflow } from '../../workflows/entities/workflow.entity';
import { Report } from '../../reports/entities/report.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserData } from '../../user-data/entities/user-data.entity';

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

  @ApiProperty({ description: 'The invoices associated with this tenant', type: () => [Invoice] })
  @OneToMany(() => Invoice, invoice => invoice.tenant)
  invoices: Promise<Invoice[]>;

  @ApiProperty({ description: 'The appointments associated with this tenant', type: () => [Appointment] })
  @OneToMany(() => Appointment, appointment => appointment.tenant)
  appointments: Promise<Appointment[]>;

  @ApiProperty({ description: 'The packages associated with this tenant', type: () => [Package] })
  @OneToMany(() => Package, package_ => package_.tenant)
  packages: Promise<Package[]>;

  @ApiProperty({ description: 'The history entries associated with this tenant', type: () => [History] })
  @OneToMany(() => History, history => history.tenant)
  history: Promise<History[]>;

  @ApiProperty({ description: 'The workflows associated with this tenant', type: () => [Workflow] })
  @OneToMany(() => Workflow, workflow => workflow.tenant)
  workflows: Promise<Workflow[]>;

  @ApiProperty({ description: 'The reports associated with this tenant', type: () => [Report] })
  @OneToMany(() => Report, report => report.tenant)
  reports: Promise<Report[]>;

  @ApiProperty({ description: 'The roles associated with this tenant', type: () => [Role] })
  @OneToMany(() => Role, role => role.tenant)
  roles: Promise<Role[]>;

  @ApiProperty({ description: 'The user data associated with this tenant', type: () => [UserData] })
  @OneToMany(() => UserData, userData => userData.tenant)
  userData: Promise<UserData[]>;

  @ApiProperty({ description: 'The creation date of the tenant' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the tenant' })
  @UpdateDateColumn()
  updatedAt: Date;
} 