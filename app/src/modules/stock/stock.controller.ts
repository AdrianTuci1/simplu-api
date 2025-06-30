import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItem } from './entities/stock-item.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('stock')
@Controller('stocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new stock item' })
  @ApiResponse({ status: 201, description: 'Stock item created successfully', type: StockItem })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  create(
    @Body() createStockItemDto: CreateStockItemDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
  ): Promise<StockItem> {
    return this.stockService.create(createStockItemDto, tenantId, locationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock items' })
  @ApiResponse({ status: 200, description: 'Return all stock items', type: [StockItem] })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('search') search?: string,
  ): Promise<StockItem[]> {
    return this.stockService.findAll(tenantId, locationId, { category, lowStock, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock item by id' })
  @ApiResponse({ status: 200, description: 'Return the stock item', type: StockItem })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  findOne(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
  ): Promise<StockItem> {
    return this.stockService.findOne(id, tenantId, locationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a stock item' })
  @ApiResponse({ status: 200, description: 'Stock item updated successfully', type: StockItem })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  update(
    @Param('id') id: string,
    @Body() updateStockItemDto: UpdateStockItemDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
  ): Promise<StockItem> {
    return this.stockService.update(id, updateStockItemDto, tenantId, locationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a stock item' })
  @ApiResponse({ status: 200, description: 'Stock item deleted successfully' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  remove(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
  ): Promise<void> {
    return this.stockService.remove(id, tenantId, locationId);
  }

  @Patch(':id/quantity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update stock item quantity' })
  @ApiResponse({ status: 200, description: 'Stock item quantity updated successfully', type: StockItem })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-location-id') locationId: string,
  ): Promise<StockItem> {
    return this.stockService.updateQuantity(id, quantity, tenantId, locationId);
  }
} 