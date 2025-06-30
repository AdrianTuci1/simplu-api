import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

export enum UserDataType {
  PREFERENCES = 'preferences',
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
  NOTIFICATIONS = 'notifications',
  CUSTOM = 'custom',
}

@Entity('user_data')
export class UserData {
  @ApiProperty({ description: 'The unique identifier of the user data' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The type of user data', enum: UserDataType })
  @Column({
    type: 'enum',
    enum: UserDataType,
  })
  type: UserDataType;

  @ApiProperty({ description: 'The key for the user data' })
  @Column()
  key: string;

  @ApiProperty({ description: 'The value of the user data' })
  @Column('jsonb')
  value: Record<string, any>;

  @ApiProperty({ description: 'The tenant this user data belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.userData)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The user this data belongs to', type: () => User })
  @ManyToOne(() => User, user => user.userData)
  @JoinColumn({ name: 'user_id' })
  user: Promise<User>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Whether this data is encrypted' })
  @Column({ default: false })
  isEncrypted: boolean;

  @ApiProperty({ description: 'Additional metadata for the user data' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the user data' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the user data' })
  @UpdateDateColumn()
  updatedAt: Date;
} 