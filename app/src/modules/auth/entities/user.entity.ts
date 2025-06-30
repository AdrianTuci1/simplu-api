import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { History } from '../../history/entities/history.entity';
import { Report } from '../../reports/entities/report.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserData } from '../../user-data/entities/user-data.entity';

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

  @ApiProperty({ description: 'The history entries associated with this user', type: () => [History] })
  @OneToMany(() => History, history => history.user)
  history: Promise<History[]>;

  @ApiProperty({ description: 'The reports associated with this user', type: () => [Report] })
  @OneToMany(() => Report, report => report.user)
  reports: Promise<Report[]>;

  @ApiProperty({ description: 'The roles associated with this user', type: () => [Role] })
  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Promise<Role[]>;

  @ApiProperty({ description: 'The user data associated with this user', type: () => [UserData] })
  @OneToMany(() => UserData, userData => userData.user)
  userData: Promise<UserData[]>;

  @ApiProperty({ description: 'The creation date of the user' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the user' })
  @UpdateDateColumn()
  updatedAt: Date;
} 