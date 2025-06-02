import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreateStockItemDto {
  @ApiProperty({ description: 'Name of the stock item' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the stock item', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'SKU (Stock Keeping Unit) of the item' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Current quantity in stock' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Unit price of the item' })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ description: 'Minimum quantity threshold for reordering', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reorderThreshold?: number;

  @ApiProperty({ description: 'Category of the stock item' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Additional settings for the stock item', required: false })
  @IsOptional()
  settings?: Record<string, any>;
} 