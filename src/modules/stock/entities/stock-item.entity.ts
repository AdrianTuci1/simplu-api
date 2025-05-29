import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('stock_items')
export class StockItem {
  @ApiProperty({ description: 'The unique identifier of the stock item' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the stock item' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the stock item' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: 'The SKU of the stock item' })
  @Column({ unique: true })
  sku: string;

  @ApiProperty({ description: 'The quantity of the stock item' })
  @Column('int')
  quantity: number;

  @ApiProperty({ description: 'The unit price of the stock item' })
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @ApiProperty({ description: 'The minimum quantity threshold for reordering' })
  @Column('int', { default: 0 })
  reorderThreshold: number;

  @ApiProperty({ description: 'The category of the stock item' })
  @Column()
  category: string;

  @ApiProperty({ description: 'Additional settings for the stock item' })
  @Column('jsonb', { nullable: true })
  settings: Record<string, any>;

  @ApiProperty({ description: 'The tenant this stock item belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.stockItems, { lazy: true })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The creation date of the stock item' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the stock item' })
  @UpdateDateColumn()
  updatedAt: Date;
} 