import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockItem } from './entities/stock-item.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockItem])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {} 