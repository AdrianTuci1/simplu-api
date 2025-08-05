import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Invoice item interface
export class InvoiceItemData {
  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ description: 'Total price for this item' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Tax rate applied', required: false })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ description: 'Discount applied', required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;
}

// Invoice data model
export class InvoiceData {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Customer type',
    enum: ['patient', 'member', 'guest', 'client'],
  })
  @IsEnum(['patient', 'member', 'guest', 'client'])
  customerType: 'patient' | 'member' | 'guest' | 'client';

  @ApiProperty({ description: 'Invoice number' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Due date' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'Invoice items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemData)
  items: InvoiceItemData[];

  @ApiProperty({ description: 'Subtotal amount' })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Tax amount' })
  @IsNumber()
  tax: number;

  @ApiProperty({ description: 'Discount amount', required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Invoice status',
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
  })
  @IsEnum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'card', 'transfer', 'check'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['cash', 'card', 'transfer', 'check'])
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'check';

  @ApiProperty({ description: 'Payment date', required: false })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
