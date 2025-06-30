import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History, HistoryType } from './entities/history.entity';

export interface GetHistoryParams {
  tenantId: string;
  locationId: string;
  date: string;
  type?: string;
  userId?: string;
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History)
    private readonly historyRepository: Repository<History>,
  ) {}

  async getHistory(params: GetHistoryParams) {
    const { tenantId, locationId, date, type, userId } = params;

    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.user', 'user')
      .where('history.tenant.id = :tenantId', { tenantId })
      .andWhere('DATE(history.createdAt) = :date', { date });

    if (locationId) {
      queryBuilder.andWhere('history.locationId = :locationId', { locationId });
    }

    if (type) {
      queryBuilder.andWhere('history.type = :type', { type });
    }

    if (userId) {
      queryBuilder.andWhere('history.user.id = :userId', { userId });
    }

    const history = await queryBuilder
      .orderBy('history.createdAt', 'DESC')
      .getMany();

    return {
      history,
      total: history.length,
      date,
      filters: { type, userId },
      tenantId,
      locationId,
    };
  }

  async logAction(
    type: HistoryType,
    action: string,
    description: string,
    tenantId: string,
    userId?: string,
    entityId?: string,
    entityType?: string,
    details?: Record<string, any>,
    locationId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const historyData: any = {
      type,
      action: action as any,
      description,
      entityId,
      entityType,
      details,
      ipAddress,
      userAgent,
      tenant: Promise.resolve({ id: tenantId } as any),
      locationId,
    };

    if (userId) {
      historyData.user = Promise.resolve({ id: userId } as any);
    }

    const historyEntry = this.historyRepository.create(historyData);
    return this.historyRepository.save(historyEntry) as unknown as History;
  }
} 