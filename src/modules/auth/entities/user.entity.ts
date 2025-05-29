import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Employee } from '../../employees/entities/employee.entity';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  CLIENT = 'client',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The email of the user' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'The hashed password of the user' })
  @Column()
  password: string;

  @ApiProperty({ description: 'The first name of the user' })
  @Column({ nullable: true })
  firstName: string;

  @ApiProperty({ description: 'The last name of the user' })
  @Column({ nullable: true })
  lastName: string;

  @ApiProperty({ description: 'The role of the user', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  @ApiProperty({ description: 'Whether the user is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'The tenants this user belongs to', type: () => [Tenant] })
  @ManyToMany(() => Tenant, tenant => tenant.users)
  @JoinTable({
    name: 'user_tenants',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tenant_id', referencedColumnName: 'id' },
  })
  tenants: Tenant[];

  @ApiProperty({ description: 'The associated employee profile', type: () => Employee })
  @OneToOne(() => Employee, employee => employee.user)
  employee: Employee;

  @ApiProperty({ description: 'The creation date of the user' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the user' })
  @UpdateDateColumn()
  updatedAt: Date;
} 