import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { BusinessClientsController } from './business-clients.controller';
import { BusinessClientsService } from './business-clients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientsController, BusinessClientsController],
  providers: [ClientsService, BusinessClientsService],
  exports: [ClientsService, BusinessClientsService],
})
export class ClientsModule {} 