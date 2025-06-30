import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { StockItem } from './entities/stock-item.entity';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';

interface StockFilters {
  category?: string;
  lowStock?: boolean;
  search?: string;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepository: Repository<StockItem>,
  ) {}

  async create(createStockItemDto: CreateStockItemDto, tenantId: string, locationId?: string): Promise<StockItem> {
    const stockItem = this.stockItemRepository.create({
      ...createStockItemDto,
      tenant: Promise.resolve({ id: tenantId } as any),
    });
    return this.stockItemRepository.save(stockItem);
  }

  async findAll(tenantId: string, locationId?: string, filters?: StockFilters): Promise<StockItem[]> {
    const queryBuilder = this.stockItemRepository
      .createQueryBuilder('stockItem')
      .leftJoinAndSelect('stockItem.tenant', 'tenant')
      .where('tenant.id = :tenantId', { tenantId });

    if (filters?.category) {
      queryBuilder.andWhere('stockItem.category = :category', { category: filters.category });
    }

    if (filters?.lowStock) {
      queryBuilder.andWhere('stockItem.quantity <= stockItem.reorderThreshold');
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(stockItem.name ILIKE :search OR stockItem.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, tenantId: string, locationId?: string): Promise<StockItem> {
    const stockItem = await this.stockItemRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!stockItem) {
      throw new NotFoundException('Stock item not found');
    }

    const tenant = await stockItem.tenant;
    if (tenant.id !== tenantId) {
      throw new NotFoundException('Stock item not found');
    }

    return stockItem;
  }

  async update(id: string, updateStockItemDto: UpdateStockItemDto, tenantId: string, locationId?: string): Promise<StockItem> {
    const stockItem = await this.findOne(id, tenantId, locationId);
    Object.assign(stockItem, updateStockItemDto);
    return this.stockItemRepository.save(stockItem);
  }

  async remove(id: string, tenantId: string, locationId?: string): Promise<void> {
    const stockItem = await this.findOne(id, tenantId, locationId);
    await this.stockItemRepository.remove(stockItem);
  }

  async findByTenant(tenantId: string): Promise<StockItem[]> {
    return this.stockItemRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async updateQuantity(id: string, quantity: number, tenantId: string, locationId?: string): Promise<StockItem> {
    const stockItem = await this.findOne(id, tenantId, locationId);
    stockItem.quantity = quantity;
    return this.stockItemRepository.save(stockItem);
  }

  async findByCategory(category: string, tenantId: string): Promise<StockItem[]> {
    return this.stockItemRepository.find({
      where: { category, tenant: { id: tenantId } },
    });
  }

  async findLowStock(tenantId: string): Promise<StockItem[]> {
    return this.stockItemRepository
      .createQueryBuilder('stockItem')
      .where('stockItem.quantity <= stockItem.reorderThreshold')
      .andWhere('stockItem.tenant.id = :tenantId', { tenantId })
      .getMany();
  }
} 