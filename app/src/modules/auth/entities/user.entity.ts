import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The email of the user' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'The password hash of the user' })
  @Column()
  password: string;

  @ApiProperty({ description: 'The first name of the user', required: false })
  @Column({ nullable: true })
  firstName?: string;

  @ApiProperty({ description: 'The last name of the user', required: false })
  @Column({ nullable: true })
  lastName?: string;

  @ApiProperty({ description: 'The role of the user', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role: UserRole;

  @ApiProperty({ description: 'Whether the user is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'The business ID the user belongs to',
    required: false,
  })
  @Column({ nullable: true })
  businessId?: string;

  @ApiProperty({
    description: 'The location ID the user belongs to',
    required: false,
  })
  @Column({ nullable: true })
  locationId?: string;

  @ApiProperty({ description: 'Additional user settings', required: false })
  @Column('jsonb', { nullable: true })
  settings?: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the user' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the user' })
  @UpdateDateColumn()
  updatedAt: Date;
}
