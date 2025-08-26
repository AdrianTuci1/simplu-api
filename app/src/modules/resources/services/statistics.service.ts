import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';

export interface BusinessStatistics {
  registeredPatients: number;
  scheduledVisits: number;
  completedVisits: number;
  canceledVisits: number;
}

export interface RecentActivity {
  id: string;
  resourceType: string;
  resourceId: string;
  activityType: 'appointment' | 'patient' | 'product' | 'pickup' | 'sale' | 'other';
  title: string;
  description: string;
  amount?: number;
  status?: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
  ) {}

  /**
   * Get simplified business statistics with only 4 KPIs for current month
   */
  async getBusinessStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics> {
    try {
      this.logger.log(`Generating simplified statistics for ${businessId}/${locationId}`);

      const businessLocationId = `${businessId}-${locationId}`;
      const { thisMonth } = this.getMonthRanges();

      console.log('thisMonth', thisMonth);

      const [
        registeredPatients,
        scheduledVisits,
        completedVisits,
        canceledVisits,
      ] = await Promise.all([
        this.getRegisteredPatients(businessLocationId, thisMonth),
        this.getScheduledVisits(businessLocationId, thisMonth),
        this.getCompletedVisits(businessLocationId, thisMonth),
        this.getCanceledVisits(businessLocationId, thisMonth),
      ]);

      return {
        registeredPatients,
        scheduledVisits,
        completedVisits,
        canceledVisits,
      };
    } catch (error) {
      this.logger.error(`Error generating business statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recent activities for current day (all relevant resource types)
   */
  async getRecentActivities(
    businessId: string,
    locationId: string,
  ): Promise<RecentActivity[]> {
    try {
      this.logger.log(`Getting recent activities for ${businessId}/${locationId}`);

      const businessLocationId = `${businessId}-${locationId}`;
      const today = this.getTodayRange();
      
      // Get all activities from specified resource types
      const activities = await this.getAllActivities(businessLocationId, today);

      // Sort by updated date (newest first)
      activities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return activities;
    } catch (error) {
      this.logger.error(`Error getting recent activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get statistics for a specific resource type
   */
  async getResourceTypeStatistics(
    businessId: string,
    locationId: string,
    resourceType: string,
    dateRange?: DateRange,
  ): Promise<any> {
    try {
      this.logger.log(`Getting statistics for ${resourceType} in ${businessId}/${locationId}`);

      const businessLocationId = `${businessId}-${locationId}`;
      const range = dateRange || this.getMonthRanges().thisMonth;

      const resources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .andWhere('resource.startDate >= :startDate', { startDate: range.startDate })
        .andWhere('resource.startDate <= :endDate', { endDate: range.endDate })
        .getMany();

      const total = resources.length;
      const totalValue = resources.reduce((sum, res) => sum + (res.data.amount || 0), 0);
      
      // Group by date
      const byDate: Record<string, number> = {};
      resources.forEach(res => {
        const date = res.startDate;
        byDate[date] = (byDate[date] || 0) + 1;
      });

      return {
        total,
        totalValue,
        byDate,
        resourceType,
        dateRange: range,
      };
    } catch (error) {
      this.logger.error(`Error getting resource type statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get registered patients count for current month
   */
  private async getRegisteredPatients(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'patient' })
        .andWhere('resource.createdAt >= :startDate', { startDate: dateRange.startDate })
        .andWhere('resource.createdAt <= :endDate', { endDate: dateRange.endDate })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting registered patients: ${error.message}`);
      return 0;
    }
  }



  /**
   * Get scheduled visits count for current month
   */
  private async getScheduledVisits(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'appointment' })
        .andWhere('resource.startDate >= :startDate', { startDate: dateRange.startDate })
        .andWhere('resource.startDate <= :endDate', { endDate: dateRange.endDate })
        .andWhere("resource.data->>'status' = :status", { status: 'scheduled' })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting scheduled visits: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get completed visits count for current month
   */
  private async getCompletedVisits(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'appointment' })
        .andWhere('resource.startDate >= :startDate', { startDate: dateRange.startDate })
        .andWhere('resource.startDate <= :endDate', { endDate: dateRange.endDate })
        .andWhere("resource.data->>'status' = :status", { status: 'completed' })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting completed visits: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get canceled visits count for current month
   */
  private async getCanceledVisits(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'appointment' })
        .andWhere('resource.startDate >= :startDate', { startDate: dateRange.startDate })
        .andWhere('resource.startDate <= :endDate', { endDate: dateRange.endDate })
        .andWhere("resource.data->>'status' = :status", { status: 'canceled' })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting canceled visits: ${error.message}`);
      return 0;
    }
  }



  /**
   * Get month ranges for current month
   */
  private getMonthRanges(): { thisMonth: DateRange } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // This month
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    return {
      thisMonth: {
        startDate: thisMonthStart.toISOString().split('T')[0],
        endDate: thisMonthEnd.toISOString().split('T')[0],
      },
    };
  }

    /**
   * Get today's date range for updated_at filtering
   */
  private getTodayRange(): DateRange {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return {
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
    };
  }

  /**
   * Get all activities from specified resource types for current day
   */
  private async getAllActivities(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<RecentActivity[]> {
    try {
      // Define the resource types we want to track
      const targetResourceTypes = ['appointment', 'patient', 'product', 'pickups', 'sales'];
      
      const activities = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType IN (:...resourceTypes)', { resourceTypes: targetResourceTypes })
        .andWhere('resource.updatedAt >= :startDate', { startDate: dateRange.startDate })
        .andWhere('resource.updatedAt < :endDate', { endDate: dateRange.endDate })
        .getMany();

      return activities.map(res => {
        const activityType = this.mapResourceTypeToActivityType(res.resourceType);
        
        return {
          id: res.id.toString(),
          resourceType: res.resourceType,
          resourceId: res.resourceId,
          activityType,
          title: res.data.title || res.data.name || this.getDefaultTitle(res.resourceType),
          description: res.data.description || res.data.notes || this.getDefaultDescription(res.resourceType),
          amount: res.data.amount || res.data.price || res.data.total,
          status: res.data.status || res.data.state,
          updatedAt: res.updatedAt,
          createdAt: res.createdAt,
        };
      });
    } catch (error) {
      this.logger.error(`Error fetching all activities: ${error.message}`);
      return [];
    }
  }

  /**
   * Map resource type to activity type
   */
  private mapResourceTypeToActivityType(resourceType: string): RecentActivity['activityType'] {
    switch (resourceType) {
      case 'appointment':
        return 'appointment';
      case 'patient':
        return 'patient';
      case 'product':
        return 'product';
      case 'pickups':
        return 'pickup';
      case 'sales':
        return 'sale';
      default:
        return 'other';
    }
  }

  /**
   * Get default title for resource type
   */
  private getDefaultTitle(resourceType: string): string {
    switch (resourceType) {
      case 'appointment':
        return 'Programare';
      case 'patient':
        return 'Pacient';
      case 'product':
        return 'Produs';
      case 'pickups':
        return 'Ridicare';
      case 'sales':
        return 'Vânzare';
      default:
        return 'Activitate';
    }
  }

  /**
   * Get default description for resource type
   */
  private getDefaultDescription(resourceType: string): string {
    switch (resourceType) {
      case 'appointment':
        return 'Programare nouă sau actualizată';
      case 'patient':
        return 'Pacient nou sau actualizat';
      case 'product':
        return 'Produs nou sau actualizat';
      case 'pickups':
        return 'Ridicare programată';
      case 'sales':
        return 'Vânzare nouă';
      default:
        return 'Activitate nouă';
    }
  }
}
