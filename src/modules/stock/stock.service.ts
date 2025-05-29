import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockItem } from './entities/stock-item.entity';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepository: Repository<StockItem>,
  ) {}

  async create(createStockItemDto: CreateStockItemDto): Promise<StockItem> {
    const stockItem = this.stockItemRepository.create(createStockItemDto);
    return this.stockItemRepository.save(stockItem);
  }

  async findAll(): Promise<StockItem[]> {
    return this.stockItemRepository.find({
      relations: ['tenant'],
    });
  }

  async findOne(id: string): Promise<StockItem> {
    return this.stockItemRepository.findOneOrFail({
      where: { id },
      relations: ['tenant'],
    });
  }

  async update(id: string, updateStockItemDto: UpdateStockItemDto): Promise<StockItem> {
    await this.stockItemRepository.update(id, updateStockItemDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.stockItemRepository.delete(id);
  }

  async findByTenant(tenantId: string): Promise<StockItem[]> {
    return this.stockItemRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async updateQuantity(id: string, quantity: number): Promise<StockItem> {
    const stockItem = await this.findOne(id);
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