import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PackageService } from './package-service.entity';

export enum PackageType {
  DENTAL = 'dental',
  GYM = 'gym',
  HOTEL = 'hotel',
}

export enum PackageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

@Entity('packages')
export class Package {
  @ApiProperty({ description: 'The unique identifier of the package' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the package' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the package' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'The type of package', enum: PackageType })
  @Column({
    type: 'enum',
    enum: PackageType,
  })
  type: PackageType;

  @ApiProperty({ description: 'The status of the package', enum: PackageStatus })
  @Column({
    type: 'enum',
    enum: PackageStatus,
    default: PackageStatus.ACTIVE,
  })
  status: PackageStatus;

  @ApiProperty({ description: 'The price of the package' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'The duration of the package in days' })
  @Column('int', { nullable: true })
  duration: number;

  // Dental-specific fields
  @ApiProperty({ description: 'Treatment name for dental packages' })
  @Column({ nullable: true })
  treatmentName: string;

  @ApiProperty({ description: 'Treatment color for dental packages' })
  @Column({ nullable: true })
  treatmentColor: string;

  @ApiProperty({ description: 'Services included in dental packages' })
  @Column('jsonb', { nullable: true })
  servicesIncluded: string[];

  @ApiProperty({ description: 'Treatment category for dental packages' })
  @Column({ nullable: true })
  treatmentCategory: string;

  // Gym-specific fields
  @ApiProperty({ description: 'Class type for gym packages' })
  @Column({ nullable: true })
  classType: string;

  @ApiProperty({ description: 'Number of sessions included in gym packages' })
  @Column('int', { nullable: true })
  sessionsIncluded: number;

  @ApiProperty({ description: 'Trainer for gym packages' })
  @Column({ nullable: true })
  trainer: string;

  // Hotel-specific fields
  @ApiProperty({ description: 'Room type for hotel packages' })
  @Column({ nullable: true })
  roomType: string;

  @ApiProperty({ description: 'Number of nights included in hotel packages' })
  @Column('int', { nullable: true })
  nightsIncluded: number;

  @ApiProperty({ description: 'Breakfast included in hotel packages' })
  @Column({ default: false })
  breakfastIncluded: boolean;

  @ApiProperty({ description: 'Maximum persons for hotel packages' })
  @Column('int', { nullable: true })
  maxPersons: number;

  @ApiProperty({ description: 'The tenant this package belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.packages)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The services included in this package', type: () => [PackageService] })
  @OneToMany(() => PackageService, packageService => packageService.package)
  packageServices: Promise<PackageService[]>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional data specific to the package type' })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the package' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the package' })
  @UpdateDateColumn()
  updatedAt: Date;
} 