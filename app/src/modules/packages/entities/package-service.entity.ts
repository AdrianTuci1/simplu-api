import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Package } from './package.entity';
import { Service } from '../../services/entities/service.entity';

@Entity('package_services')
export class PackageService {
  @ApiProperty({ description: 'The unique identifier of the package service' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The package this service belongs to', type: () => Package })
  @ManyToOne(() => Package, package_ => package_.packageServices)
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @ApiProperty({ description: 'The service included in this package', type: () => Service })
  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Promise<Service>;

  @ApiProperty({ description: 'The quantity of this service in the package' })
  @Column('int', { default: 1 })
  quantity: number;

  @ApiProperty({ description: 'The price of this service in the package' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'The creation date of the package service' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the package service' })
  @UpdateDateColumn()
  updatedAt: Date;
} 