import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';

export abstract class BaseService<T extends BaseEntity> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(tenant: Tenant): Promise<T[]> {
    return this.repository.find({
      where: { tenant: { id: tenant.id } } as FindOptionsWhere<T>,
    });
  }

  async findOne(id: string, tenant: Tenant): Promise<T | null> {
    return this.repository.findOne({
      where: { id, tenant: { id: tenant.id } } as FindOptionsWhere<T>,
    });
  }

  async create(data: DeepPartial<T>, tenant: Tenant): Promise<T> {
    const entity = this.repository.create({
      ...data,
      tenant,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async update(id: string, data: DeepPartial<T>, tenant: Tenant): Promise<T | null> {
    await this.repository.update(
      { id, tenant: { id: tenant.id } } as FindOptionsWhere<T>,
      data as any,
    );
    return this.findOne(id, tenant);
  }

  async remove(id: string, tenant: Tenant): Promise<void> {
    await this.repository.delete({
      id,
      tenant: { id: tenant.id },
    } as FindOptionsWhere<T>);
  }
} 