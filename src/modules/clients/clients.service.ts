import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto, tenantId: string): Promise<Client> {
    const client = new Client();
    Object.assign(client, {
      ...createClientDto,
      tenant: { id: tenantId },
    });
    return this.clientsRepository.save(client);
  }

  async findAll(tenantId: string): Promise<Client[]> {
    return this.clientsRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['tenant'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant'],
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, tenantId: string): Promise<Client> {
    const client = await this.findOne(id, tenantId);
    Object.assign(client, updateClientDto);
    return this.clientsRepository.save(client);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const client = await this.findOne(id, tenantId);
    await this.clientsRepository.remove(client);
  }
} 