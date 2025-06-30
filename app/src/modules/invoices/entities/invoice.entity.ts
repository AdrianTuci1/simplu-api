import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
export class Invoice {
  @ApiProperty({ description: 'The unique identifier of the invoice' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The invoice number' })
  @Column({ unique: true })
  invoiceNumber: string;

  @ApiProperty({ description: 'The status of the invoice', enum: InvoiceStatus })
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @ApiProperty({ description: 'The total amount of the invoice' })
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @ApiProperty({ description: 'The due date of the invoice' })
  @Column({ type: 'date' })
  dueDate: Date;

  @ApiProperty({ description: 'The issue date of the invoice' })
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  issueDate: Date;

  @ApiProperty({ description: 'The payment date of the invoice' })
  @Column({ type: 'date', nullable: true })
  paymentDate: Date;

  @ApiProperty({ description: 'Additional notes for the invoice' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ description: 'The payment method used' })
  @Column({ nullable: true })
  paymentMethod: string;

  @ApiProperty({ description: 'The tenant this invoice belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.invoices)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The client this invoice is for', type: () => Client })
  @ManyToOne(() => Client, client => client.invoices)
  @JoinColumn({ name: 'client_id' })
  client: Promise<Client>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'The items in this invoice' })
  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @ApiProperty({ description: 'The creation date of the invoice' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the invoice' })
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('invoice_items')
export class InvoiceItem {
  @ApiProperty({ description: 'The unique identifier of the invoice item' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The service ID' })
  @Column()
  serviceId: string;

  @ApiProperty({ description: 'The quantity of the item' })
  @Column('int')
  quantity: number;

  @ApiProperty({ description: 'The unit price of the item' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'The total price for this item' })
  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @ApiProperty({ description: 'The description of the item' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'The invoice this item belongs to', type: () => Invoice })
  @ManyToOne(() => Invoice, invoice => invoice.items)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ApiProperty({ description: 'The creation date of the invoice item' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the invoice item' })
  @UpdateDateColumn()
  updatedAt: Date;
} 