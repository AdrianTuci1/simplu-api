import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

// Stock item data model
export class StockItemData {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Item description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Item category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'SKU (Stock Keeping Unit)', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Current quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Minimum quantity threshold' })
  @IsNumber()
  minQuantity: number;

  @ApiProperty({ description: 'Maximum quantity threshold', required: false })
  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Cost per unit' })
  @IsNumber()
  cost: number;

  @ApiProperty({ description: 'Selling price per unit' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Supplier name', required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ description: 'Expiry date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ description: 'Batch number', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ description: 'Storage location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Item is active' })
  @IsBoolean()
  active: boolean;
}
