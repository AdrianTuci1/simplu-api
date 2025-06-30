import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

export enum HistoryType {
  INVOICE = 'invoice',
  APPOINTMENT = 'appointment',
  RESERVATION = 'reservation',
  CLIENT = 'client',
  EMPLOYEE = 'employee',
  SERVICE = 'service',
  PACKAGE = 'package',
  STOCK = 'stock',
  SYSTEM = 'system',
}

export enum HistoryAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
}

@Entity('history')
export class History {
  @ApiProperty({ description: 'The unique identifier of the history entry' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The type of history entry', enum: HistoryType })
  @Column({
    type: 'enum',
    enum: HistoryType,
  })
  type: HistoryType;

  @ApiProperty({ description: 'The action performed', enum: HistoryAction })
  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action: HistoryAction;

  @ApiProperty({ description: 'The entity ID that was affected' })
  @Column({ nullable: true })
  entityId: string;

  @ApiProperty({ description: 'The entity type that was affected' })
  @Column({ nullable: true })
  entityType: string;

  @ApiProperty({ description: 'The description of the action' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Additional details about the action' })
  @Column('jsonb', { nullable: true })
  details: Record<string, any>;

  @ApiProperty({ description: 'The IP address of the user' })
  @Column({ nullable: true })
  ipAddress: string;

  @ApiProperty({ description: 'The user agent of the request' })
  @Column({ nullable: true })
  userAgent: string;

  @ApiProperty({ description: 'The tenant this history entry belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.history)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The user who performed the action', type: () => User })
  @ManyToOne(() => User, user => user.history, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'The creation date of the history entry' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the history entry' })
  @UpdateDateColumn()
  updatedAt: Date;
} 