import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  CLIENT = 'client',
  GUEST = 'guest',
}

@Entity('roles')
export class Role {
  @ApiProperty({ description: 'The unique identifier of the role' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the role' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the role' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'The type of role', enum: RoleType })
  @Column({
    type: 'enum',
    enum: RoleType,
  })
  type: RoleType;

  @ApiProperty({ description: 'The permissions associated with this role' })
  @Column('jsonb', { default: [] })
  permissions: string[];

  @ApiProperty({ description: 'Whether this role is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Whether this is a default role' })
  @Column({ default: false })
  isDefault: boolean;

  @ApiProperty({ description: 'The tenant this role belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.roles)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The users associated with this role', type: () => [User] })
  @ManyToMany(() => User, user => user.roles)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  users: Promise<User[]>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional metadata for the role' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the role' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the role' })
  @UpdateDateColumn()
  updatedAt: Date;
} 