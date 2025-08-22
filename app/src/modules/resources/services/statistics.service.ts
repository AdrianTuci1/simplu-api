import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';
import { CitrusShardingService } from '../../../config/citrus-sharding.config';

export interface BusinessStatistics {
  appointments: {
    today: number;
    yesterday: number;
    difference: number;
    percentageChange: number;
  };
  clients: {
    thisMonth: number;
    lastMonth: number;
    difference: number;
    percentageChange: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    difference: number;
    percentageChange: number;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  summary: {
    totalRevenue: number;
    totalClients: number;
    totalAppointments: number;
    averageRevenuePerClient: number;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);
  private readonly citrusService: CitrusShardingService;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
  ) {
    this.citrusService = new CitrusShardingService();
  }

  /**
   * Get comprehensive business statistics
   */
  async getBusinessStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics> {
    try {
      this.logger.log(`Generating statistics for ${businessId}/${locationId}`);

      const [
        appointments,
        clients,
        revenue,
        inventory,
      ] = await Promise.all([
        this.getAppointmentStatistics(businessId, locationId),
        this.getClientStatistics(businessId, locationId),
        this.getRevenueStatistics(businessId, locationId),
        this.getInventoryStatistics(businessId, locationId),
      ]);

      const summary = this.calculateSummary(revenue, clients, appointments);

      return {
        appointments,
        clients,
        revenue,
        inventory,
        summary,
      };
    } catch (error) {
      this.logger.error(`Error generating business statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get appointment statistics (today vs yesterday)
   */
  private async getAppointmentStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics['appointments']> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [todayAppointments, yesterdayAppointments] = await Promise.all([
      this.countResourcesByDate(businessId, locationId, 'timeline', todayStr),
      this.countResourcesByDate(businessId, locationId, 'timeline', yesterdayStr),
    ]);

    const difference = todayAppointments - yesterdayAppointments;
    const percentageChange = yesterdayAppointments > 0 
      ? ((difference / yesterdayAppointments) * 100) 
      : 0;

    return {
      today: todayAppointments,
      yesterday: yesterdayAppointments,
      difference,
      percentageChange: Math.round(percentageChange * 100) / 100,
    };
  }

  /**
   * Get client statistics (this month vs last month)
   */
  private async getClientStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics['clients']> {
    const { thisMonth, lastMonth } = this.getMonthRanges();

    const [thisMonthClients, lastMonthClients] = await Promise.all([
      this.countResourcesByDateRange(businessId, locationId, 'clients', thisMonth.startDate, thisMonth.endDate),
      this.countResourcesByDateRange(businessId, locationId, 'clients', lastMonth.startDate, lastMonth.endDate),
    ]);

    const difference = thisMonthClients - lastMonthClients;
    const percentageChange = lastMonthClients > 0 
      ? ((difference / lastMonthClients) * 100) 
      : 0;

    return {
      thisMonth: thisMonthClients,
      lastMonth: lastMonthClients,
      difference,
      percentageChange: Math.round(percentageChange * 100) / 100,
    };
  }

  /**
   * Get revenue statistics (this month vs last month)
   */
  private async getRevenueStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics['revenue']> {
    const { thisMonth, lastMonth } = this.getMonthRanges();

    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      this.calculateRevenueByDateRange(businessId, locationId, thisMonth.startDate, thisMonth.endDate),
      this.calculateRevenueByDateRange(businessId, locationId, lastMonth.startDate, lastMonth.endDate),
    ]);

    const difference = thisMonthRevenue - lastMonthRevenue;
    const percentageChange = lastMonthRevenue > 0 
      ? ((difference / lastMonthRevenue) * 100) 
      : 0;

    return {
      thisMonth: Math.round(thisMonthRevenue * 100) / 100,
      lastMonth: Math.round(lastMonthRevenue * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      percentageChange: Math.round(percentageChange * 100) / 100,
    };
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics['inventory']> {
    const inventoryItems = await this.getResourcesByType(businessId, locationId, 'stocks');

    let totalProducts = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    inventoryItems.forEach(item => {
      const data = item.data;
      const quantity = data.quantity || data.stockQuantity || 0;
      const price = data.price || data.unitPrice || 0;
      const minStock = data.minStock || data.minimumStock || 0;

      totalProducts++;
      totalValue += quantity * price;

      if (quantity === 0) {
        outOfStock++;
      } else if (quantity <= minStock) {
        lowStock++;
      }
    });

    return {
      totalProducts,
      lowStock,
      outOfStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    revenue: BusinessStatistics['revenue'],
    clients: BusinessStatistics['clients'],
    appointments: BusinessStatistics['appointments'],
  ): BusinessStatistics['summary'] {
    const totalRevenue = revenue.thisMonth;
    const totalClients = clients.thisMonth;
    const totalAppointments = appointments.today;
    const averageRevenuePerClient = totalClients > 0 ? totalRevenue / totalClients : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClients,
      totalAppointments,
      averageRevenuePerClient: Math.round(averageRevenuePerClient * 100) / 100,
    };
  }

  /**
   * Get month ranges for current and previous month
   */
  private getMonthRanges(): { thisMonth: DateRange; lastMonth: DateRange } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // This month
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Last month
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0);

    return {
      thisMonth: {
        startDate: thisMonthStart.toISOString().split('T')[0],
        endDate: thisMonthEnd.toISOString().split('T')[0],
      },
      lastMonth: {
        startDate: lastMonthStart.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Count resources by specific date
   */
  private async countResourcesByDate(
    businessId: string,
    locationId: string,
    resourceType: string,
    date: string,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessId = :businessId', { businessId })
        .andWhere('resource.locationId = :locationId', { locationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .andWhere('DATE(resource.startDate) = :date', { date })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting resources by date: ${error.message}`);
      return 0;
    }
  }

  /**
   * Count resources by date range
   */
  private async countResourcesByDateRange(
    businessId: string,
    locationId: string,
    resourceType: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessId = :businessId', { businessId })
        .andWhere('resource.locationId = :locationId', { locationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .andWhere('resource.startDate >= :startDate', { startDate })
        .andWhere('resource.startDate <= :endDate', { endDate })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting resources by date range: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate revenue by date range from invoices
   */
  private async calculateRevenueByDateRange(
    businessId: string,
    locationId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    try {
      const invoices = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessId = :businessId', { businessId })
        .andWhere('resource.locationId = :locationId', { locationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'invoices' })
        .andWhere('resource.startDate >= :startDate', { startDate })
        .andWhere('resource.startDate <= :endDate', { endDate })
        .getMany();

      let totalRevenue = 0;

      invoices.forEach(invoice => {
        const data = invoice.data;
        const amount = data.total || data.amount || data.revenue || 0;
        totalRevenue += parseFloat(amount.toString());
      });

      return totalRevenue;
    } catch (error) {
      this.logger.error(`Error calculating revenue: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get resources by type
   */
  private async getResourcesByType(
    businessId: string,
    locationId: string,
    resourceType: string,
  ): Promise<ResourceEntity[]> {
    try {
      return await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessId = :businessId', { businessId })
        .andWhere('resource.locationId = :locationId', { locationId })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .getMany();
    } catch (error) {
      this.logger.error(`Error getting resources by type: ${error.message}`);
      return [];
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
      const resources = await this.getResourcesByType(businessId, locationId, resourceType);
      
      if (dateRange) {
        const filteredResources = resources.filter(resource => {
          const resourceDate = new Date(resource.startDate);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          return resourceDate >= startDate && resourceDate <= endDate;
        });
        return this.analyzeResources(filteredResources, resourceType);
      }

      return this.analyzeResources(resources, resourceType);
    } catch (error) {
      this.logger.error(`Error getting resource type statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze resources and generate statistics
   */
  private analyzeResources(resources: ResourceEntity[], resourceType: string): any {
    const stats = {
      total: resources.length,
      byDate: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalValue: 0,
      averageValue: 0,
    };

    resources.forEach(resource => {
      const data = resource.data;
      const date = resource.startDate.split('T')[0];
      const status = data.status || 'unknown';
      const value = data.total || data.amount || data.price || 0;

      // Count by date
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;

      // Count by status
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Calculate total value
      stats.totalValue += parseFloat(value.toString());
    });

    // Calculate average value
    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return {
      resourceType,
      ...stats,
      totalValue: Math.round(stats.totalValue * 100) / 100,
      averageValue: Math.round(stats.averageValue * 100) / 100,
    };
  }
}
