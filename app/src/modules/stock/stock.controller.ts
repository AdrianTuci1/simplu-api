import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItem } from './entities/stock-item.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('stock')
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new stock item' })
  @ApiResponse({ status: 201, description: 'Stock item created successfully', type: StockItem })
  create(@Body() createStockItemDto: CreateStockItemDto): Promise<StockItem> {
    return this.stockService.create(createStockItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock items' })
  @ApiResponse({ status: 200, description: 'Return all stock items', type: [StockItem] })
  findAll(): Promise<StockItem[]> {
    return this.stockService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock item by id' })
  @ApiResponse({ status: 200, description: 'Return the stock item', type: StockItem })
  findOne(@Param('id') id: string): Promise<StockItem> {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a stock item' })
  @ApiResponse({ status: 200, description: 'Stock item updated successfully', type: StockItem })
  update(
    @Param('id') id: string,
    @Body() updateStockItemDto: UpdateStockItemDto,
  ): Promise<StockItem> {
    return this.stockService.update(id, updateStockItemDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a stock item' })
  @ApiResponse({ status: 200, description: 'Stock item deleted successfully' })
  remove(@Param('id') id: string): Promise<void> {
    return this.stockService.remove(id);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all stock items for a tenant' })
  @ApiResponse({ status: 200, description: 'Return all stock items for the tenant', type: [StockItem] })
  findByTenant(@Param('tenantId') tenantId: string): Promise<StockItem[]> {
    return this.stockService.findByTenant(tenantId);
  }

  @Patch(':id/quantity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update stock item quantity' })
  @ApiResponse({ status: 200, description: 'Stock item quantity updated successfully', type: StockItem })
  updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ): Promise<StockItem> {
    return this.stockService.updateQuantity(id, quantity);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get stock items by category' })
  @ApiResponse({ status: 200, description: 'Return stock items by category', type: [StockItem] })
  findByCategory(
    @Param('category') category: string,
    @Query('tenantId') tenantId: string,
  ): Promise<StockItem[]> {
    return this.stockService.findByCategory(category, tenantId);
  }

  @Get('low-stock/:tenantId')
  @ApiOperation({ summary: 'Get low stock items for a tenant' })
  @ApiResponse({ status: 200, description: 'Return low stock items', type: [StockItem] })
  findLowStock(@Param('tenantId') tenantId: string): Promise<StockItem[]> {
    return this.stockService.findLowStock(tenantId);
  }
} 