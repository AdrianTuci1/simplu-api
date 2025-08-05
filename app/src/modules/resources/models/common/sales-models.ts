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
import { InvoiceItemData } from './invoice-models';

// Sales transaction data model (for 'sales' resource type)
export class SalesTransactionData {
  @ApiProperty({ description: 'Customer ID', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Customer name', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: 'Sale items' })
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
    description: 'Payment method',
    enum: ['cash', 'card', 'transfer', 'check'],
  })
  @IsEnum(['cash', 'card', 'transfer', 'check'])
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';

  @ApiProperty({
    description: 'Transaction status',
    enum: ['completed', 'pending', 'cancelled', 'refunded'],
  })
  @IsEnum(['completed', 'pending', 'cancelled', 'refunded'])
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';

  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ description: 'Receipt number', required: false })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Processed by user ID' })
  @IsString()
  processedBy: string;
}
