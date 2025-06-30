import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

export interface CreateClientDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface UpdateClientDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface DentalClientFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class BusinessClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async getDentalClients(tenantId: string, locationId: string, filters?: DentalClientFilters) {
    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .where('client.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      // For now, we'll use the tenant location as a filter
      // In a real implementation, you might have a separate location relationship
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(client.firstName ILIKE :search OR client.lastName ILIKE :search OR client.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters?.status) {
      // Add status filtering logic here
    }

    if (filters?.dateFrom && filters?.dateTo) {
      queryBuilder.andWhere('client.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    const clients = await queryBuilder
      .orderBy('client.createdAt', 'DESC')
      .getMany();

    return {
      clients,
      total: clients.length,
      filters,
      tenantId,
      locationId,
    };
  }

  async createDentalClient(createClientDto: CreateClientDto, tenantId: string, locationId: string) {
    const client = this.clientRepository.create({
      ...createClientDto,
      tenant: Promise.resolve({ id: tenantId } as any),
    });

    const savedClient = await this.clientRepository.save(client) as unknown as Client;
    return this.getClientWithRelations(savedClient.id);
  }

  async getDentalClient(id: string, tenantId: string, locationId: string) {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!client) {
      return null;
    }

    const tenant = await client.tenant;
    if (tenant.id !== tenantId) {
      return null;
    }

    return client;
  }

  async updateDentalClient(id: string, updateClientDto: UpdateClientDto, tenantId: string, locationId: string) {
    const client = await this.getDentalClient(id, tenantId, locationId);
    if (!client) {
      return null;
    }

    Object.assign(client, updateClientDto);
    return this.clientRepository.save(client);
  }

  async deleteDentalClient(id: string, tenantId: string, locationId: string) {
    const client = await this.getDentalClient(id, tenantId, locationId);
    if (!client) {
      return { message: 'Client not found' };
    }

    await this.clientRepository.remove(client);
    return { message: 'Client deleted successfully' };
  }

  private async getClientWithRelations(id: string) {
    return this.clientRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });
  }
} 