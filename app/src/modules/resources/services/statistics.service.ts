import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';

export interface BusinessStatistics {
  totalAppointments: number;
  totalPatients: number;
  appointmentStats: {
    completed: number;
    cancelled: number;
    pending: number;
    absent: number;
  };
  appointmentsToday: AppointmentToday[];
  revenue: {
    monthly: number;
  };
  websiteBookings: number;
  clinicRating: {
    average: number;
    totalReviews: number;
  };
  smsStats: {
    sent: number;
    limit: number;
    percentage: number;
  };
  occupancyRate: number;
  doctorProgress: DoctorProgress[];
  popularTreatments: TreatmentCount[];
}

export interface AppointmentToday {
  id: number;
  patientName: string;
  time: string;
  status: string;
}

export interface DoctorProgress {
  doctor: string;
  progress: number;
  appointments: number;
}

export interface TreatmentCount {
  treatment: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  resourceType: string;
  resourceId: string;
  activityType:
    | 'appointment'
    | 'patient'
    | 'product'
    | 'pickup'
    | 'sale'
    | 'invoice'
    | 'medic'
    | 'treatment'
    | 'other';
  title: string;
  description: string;
  amount?: number;
  status?: string;
  time?: string; // Ora activității
  action?: string; // Acțiunea realizată (creat, actualizat, etc.)
  // Detalii specifice pentru appointments
  serviceName?: string; // data.service.name
  medicName?: string; // data.medic.name
  patientName?: string; // data.patient.name sau patientName pentru resursa patient
  productName?: string; //
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
   * Get comprehensive business statistics for current month
   */
  async getBusinessStatistics(
    businessId: string,
    locationId: string,
  ): Promise<BusinessStatistics> {
    try {
      this.logger.log(
        `Generating comprehensive statistics for ${businessId}/${locationId}`,
      );

      const businessLocationId = `${businessId}-${locationId}`;
      const { thisMonth } = this.getMonthRanges();
      const today = this.getTodayRange();

      const [
        totalAppointments,
        totalPatients,
        appointmentStats,
        appointmentsToday,
        revenue,
        websiteBookings,
        clinicRating,
        smsStats,
        occupancyRate,
        doctorProgress,
        popularTreatments,
      ] = await Promise.all([
        this.getTotalAppointments(businessLocationId, thisMonth),
        this.getTotalPatients(businessLocationId),
        this.getAppointmentStats(businessLocationId, thisMonth),
        this.getAppointmentsToday(businessLocationId, today),
        this.getMonthlyRevenue(businessLocationId, thisMonth),
        this.getWebsiteBookings(businessLocationId, thisMonth),
        this.getClinicRating(businessLocationId),
        this.getSmsStats(businessLocationId, thisMonth),
        this.getOccupancyRate(businessLocationId, thisMonth),
        this.getDoctorProgress(businessLocationId, thisMonth),
        this.getPopularTreatments(businessLocationId, thisMonth),
      ]);

      return {
        totalAppointments,
        totalPatients,
        appointmentStats,
        appointmentsToday,
        revenue: { monthly: revenue },
        websiteBookings,
        clinicRating,
        smsStats,
        occupancyRate,
        doctorProgress,
        popularTreatments,
      };
    } catch (error) {
      this.logger.error(
        `Error generating business statistics: ${error.message}`,
        error.stack,
      );
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
      this.logger.log(
        `Getting recent activities for ${businessId}/${locationId}`,
      );

      const businessLocationId = `${businessId}-${locationId}`;
      const today = this.getTodayRange();

      // Get all activities from specified resource types
      const activities = await this.getAllActivities(businessLocationId, today);

      // Sort by updated date (newest first)
      activities.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      return activities;
    } catch (error) {
      this.logger.error(
        `Error getting recent activities: ${error.message}`,
        error.stack,
      );
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
      this.logger.log(
        `Getting statistics for ${resourceType} in ${businessId}/${locationId}`,
      );

      const businessLocationId = `${businessId}-${locationId}`;
      const range = dateRange || this.getMonthRanges().thisMonth;

      const resources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', { resourceType })
        .andWhere('resource.startDate >= :startDate', {
          startDate: range.startDate,
        })
        .andWhere('resource.startDate <= :endDate', { endDate: range.endDate })
        .getMany();

      const total = resources.length;
      const totalValue = resources.reduce(
        (sum, res) => sum + (res.data.amount || 0),
        0,
      );

      // Group by date
      const byDate: Record<string, number> = {};
      resources.forEach((res) => {
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
      this.logger.error(
        `Error getting resource type statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get total appointments count for current month
   */
  private async getTotalAppointments(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting total appointments: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get total patients count (all time)
   */
  private async getTotalPatients(
    businessLocationId: string,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'patient',
        })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting total patients: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get appointment statistics breakdown by status
   */
  private async getAppointmentStats(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<BusinessStatistics['appointmentStats']> {
    try {
      const appointments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getMany();

      const stats = {
        completed: 0,
        cancelled: 0,
        pending: 0,
        absent: 0,
      };

      appointments.forEach((apt) => {
        const status = apt.data.status?.toLowerCase() || 'pending';
        if (status === 'completed') {
          stats.completed++;
        } else if (status === 'cancelled' || status === 'canceled') {
          stats.cancelled++;
        } else if (status === 'absent') {
          stats.absent++;
        } else {
          stats.pending++;
        }
      });

      return stats;
    } catch (error) {
      this.logger.error(`Error getting appointment stats: ${error.message}`);
      return { completed: 0, cancelled: 0, pending: 0, absent: 0 };
    }
  }

  /**
   * Get today's appointments with patient details
   */
  private async getAppointmentsToday(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<AppointmentToday[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const appointments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate = :todayStr', { todayStr })
        .orderBy('resource.data->>\'time\'', 'ASC')
        .getMany();

      return appointments.map((apt) => ({
        id: apt.id,
        patientName: apt.data.patientName || apt.data.patient || 'Pacient necunoscut',
        time: apt.data.time || apt.data.startTime || '00:00',
        status: apt.data.status || 'pending',
      }));
    } catch (error) {
      this.logger.error(`Error getting today's appointments: ${error.message}`);
      return [];
    }
  }

  /**
   * Get monthly revenue from sales and appointments
   */
  private async getMonthlyRevenue(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const resources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType IN (:...types)', {
          types: ['sale', 'sales', 'appointment'],
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getMany();

      const total = resources.reduce((sum, res) => {
        const amount = res.data.amount || res.data.price || res.data.total || 0;
        return sum + Number(amount);
      }, 0);

      return Math.round(total * 100) / 100;
    } catch (error) {
      this.logger.error(`Error calculating monthly revenue: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get website bookings count
   */
  private async getWebsiteBookings(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const count = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .andWhere("resource.data->>'source' = :source", { source: 'website' })
        .getCount();

      return count;
    } catch (error) {
      this.logger.error(`Error counting website bookings: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get clinic rating from submitted ratings for current month
   */
  private async getClinicRating(
    businessLocationId: string,
  ): Promise<BusinessStatistics['clinicRating']> {
    try {
      const { thisMonth } = this.getMonthRanges();
      
      // Get all rating resources that have been submitted (tokenUsed = true)
      const ratings = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'rating',
        })
        .andWhere("resource.data->>'tokenUsed' = :used", { used: 'true' })
        .andWhere("(resource.data->>'score')::int > :minScore", { minScore: 0 })
        .andWhere('resource.createdAt >= :startDate', {
          startDate: thisMonth.startDate,
        })
        .andWhere('resource.createdAt <= :endDate', {
          endDate: thisMonth.endDate,
        })
        .getMany();

      if (ratings.length === 0) {
        return { average: 0, totalReviews: 0 };
      }

      const totalRating = ratings.reduce((sum, rating) => {
        const score = Number(rating.data.score) || 0;
        return sum + score;
      }, 0);

      const average = totalRating / ratings.length;

      return {
        average: Math.round(average * 10) / 10, // Round to 1 decimal
        totalReviews: ratings.length,
      };
    } catch (error) {
      this.logger.error(`Error getting clinic rating: ${error.message}`);
      return { average: 0, totalReviews: 0 };
    }
  }

  /**
   * Get SMS statistics (placeholder - needs integration with SMS service)
   */
  private async getSmsStats(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<BusinessStatistics['smsStats']> {
    try {
      // This would need to come from an SMS tracking resource or external service
      const smsResources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'sms',
        })
        .andWhere('resource.createdAt >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.createdAt <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getCount();

      const limit = 300; // Default SMS limit
      const percentage = Math.round((smsResources / limit) * 100);

      return {
        sent: smsResources,
        limit,
        percentage,
      };
    } catch (error) {
      this.logger.error(`Error getting SMS stats: ${error.message}`);
      return { sent: 0, limit: 300, percentage: 0 };
    }
  }

  /**
   * Calculate occupancy rate (booked slots / available slots)
   */
  private async getOccupancyRate(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<number> {
    try {
      const appointments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getCount();

      // Calculate available slots (assuming 8 hours/day, 30-min slots = 16 slots/day)
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const workDays = Math.floor(daysInMonth * 0.7); // Assuming 70% work days
      const totalSlots = workDays * 16; // 16 slots per day

      const rate = Math.round((appointments / totalSlots) * 100);
      return Math.min(rate, 100); // Cap at 100%
    } catch (error) {
      this.logger.error(`Error calculating occupancy rate: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get doctor progress and appointment counts
   */
  private async getDoctorProgress(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<DoctorProgress[]> {
    try {
      const appointments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getMany();

      // Group by doctor
      const doctorMap = new Map<string, { total: number; completed: number }>();

      appointments.forEach((apt) => {
        const doctor = apt.data.doctor || apt.data.doctorName || 'Dr. Necunoscut';
        const status = apt.data.status?.toLowerCase() || '';
        
        if (!doctorMap.has(doctor)) {
          doctorMap.set(doctor, { total: 0, completed: 0 });
        }

        const stats = doctorMap.get(doctor)!;
        stats.total++;
        if (status === 'completed') {
          stats.completed++;
        }
      });

      // Convert to array and calculate progress
      const doctorProgress: DoctorProgress[] = Array.from(doctorMap.entries())
        .map(([doctor, stats]) => ({
          doctor,
          progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          appointments: stats.total,
        }))
        .sort((a, b) => b.appointments - a.appointments)
        .slice(0, 10); // Top 10 doctors

      return doctorProgress;
    } catch (error) {
      this.logger.error(`Error getting doctor progress: ${error.message}`);
      return [];
    }
  }

  /**
   * Get popular treatments/services based on appointment counts
   */
  private async getPopularTreatments(
    businessLocationId: string,
    dateRange: DateRange,
  ): Promise<TreatmentCount[]> {
    try {
      // Get all appointments in the month
      const appointments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'appointment',
        })
        .andWhere('resource.startDate >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.startDate <= :endDate', {
          endDate: dateRange.endDate,
        })
        .getMany();

      // Count appointments by service.id
      const serviceIdCountMap = new Map<string, number>();

      appointments.forEach((apt) => {
        const serviceId = apt.data.service?.id;
        if (serviceId) {
          serviceIdCountMap.set(serviceId, (serviceIdCountMap.get(serviceId) || 0) + 1);
        }
      });

      // Get treatment resources for these service IDs
      const serviceIds = Array.from(serviceIdCountMap.keys());
      
      if (serviceIds.length === 0) {
        return [];
      }

      const treatments = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType = :resourceType', {
          resourceType: 'treatment',
        })
        .andWhere('resource.resourceId IN (:...serviceIds)', {
          serviceIds,
        })
        .getMany();

      // Map service IDs to treatment names
      const treatmentNameMap = new Map<string, string>();
      treatments.forEach((treatment) => {
        treatmentNameMap.set(treatment.resourceId, treatment.data.name || treatment.data.treatmentType || 'Consultație');
      });

      // Build the result with treatment names and counts
      const treatmentCounts: TreatmentCount[] = Array.from(serviceIdCountMap.entries())
        .map(([serviceId, count]) => ({
          treatment: treatmentNameMap.get(serviceId) || `Tratament ${serviceId}`,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 treatments

      return treatmentCounts;
    } catch (error) {
      this.logger.error(`Error getting popular treatments: ${error.message}`);
      return [];
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
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

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
      const targetResourceTypes = [
        'appointment',
        'patient',
        'product',
        'pickups',
        'sales',
        'invoice',
        'medic',
        'treatment',
      ];

      const activities = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', {
          businessLocationId,
        })
        .andWhere('resource.resourceType IN (:...resourceTypes)', {
          resourceTypes: targetResourceTypes,
        })
        .andWhere('resource.updatedAt >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('resource.updatedAt < :endDate', {
          endDate: dateRange.endDate,
        })
        .getMany();

      return activities.map((res) => {
        const activityType = this.mapResourceTypeToActivityType(
          res.resourceType,
        );

        // Determine action based on timestamps
        const action = this.getActivityAction(res);

        // Base activity object
        const activity: RecentActivity = {
          id: res.id.toString(),
          resourceType: res.resourceType,
          resourceId: res.resourceId,
          activityType,
          title:
            res.data.title ||
            res.data.name ||
            this.getDefaultTitle(res.resourceType),
          description:
            res.data.description ||
            res.data.notes ||
            this.getDefaultDescription(res.resourceType),
          amount: res.data.amount || res.data.price || res.data.total,
          status: res.data.status || res.data.state,
          action,
          time: this.extractTime(res),
          updatedAt: res.updatedAt,
          createdAt: res.createdAt,
        };

        // Add specific fields based on resource type
        if (res.resourceType === 'appointment') {
          activity.serviceName = res.data.service?.name || res.data.serviceName;
          activity.medicName = res.data.medic?.name || res.data.medicName || res.data.doctor;
          activity.patientName = res.data.patient?.name || res.data.patientName;
        } else if (res.resourceType === 'patient') {
          activity.patientName = res.data.name || res.data.patientName || res.data.fullName;
        } else if (res.resourceType === 'invoice') {
          activity.patientName = res.data.patient?.name || res.data.patientName;
          activity.amount = res.data.total || res.data.amount || res.data.totalAmount;
        } else if (res.resourceType === 'medic') {
          activity.medicName = res.data.name || res.data.fullName || res.data.medicName;
        } else if (res.resourceType === 'treatment') {
          activity.serviceName = res.data.name || res.data.treatmentType;
          activity.amount = res.data.price || res.data.cost || res.data.amount;
        } else if (res.resourceType === 'product') {
          activity.serviceName = res.data.name || res.data.productName;
          activity.amount = res.data.price || res.data.cost || res.data.amount;
        }

        return activity;
      });
    } catch (error) {
      this.logger.error(`Error fetching all activities: ${error.message}`);
      return [];
    }
  }

  /**
   * Map resource type to activity type
   */
  private mapResourceTypeToActivityType(
    resourceType: string,
  ): RecentActivity['activityType'] {
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
      case 'invoice':
        return 'invoice';
      case 'medic':
        return 'medic';
      case 'treatment':
        return 'treatment';
      default:
        return 'other';
    }
  }

  /**
   * Determine the action performed on a resource
   */
  private getActivityAction(resource: ResourceEntity): string {
    const createdTime = new Date(resource.createdAt).getTime();
    const updatedTime = new Date(resource.updatedAt).getTime();
    
    // If created and updated are within 1 second, it's a new creation
    if (Math.abs(updatedTime - createdTime) < 1000) {
      return 'Creat';
    }
    
    // Check for status changes or specific actions in data
    if (resource.data.action) {
      return resource.data.action;
    }
    
    return 'Actualizat';
  }

  /**
   * Extract time from resource data
   */
  private extractTime(resource: ResourceEntity): string {
    // Try different time field formats
    if (resource.data.time) {
      return resource.data.time;
    }
    
    if (resource.data.startTime) {
      return resource.data.startTime;
    }
    
    if (resource.data.appointmentTime) {
      return resource.data.appointmentTime;
    }
    
    // For appointments, try to extract from startDate if it has time component
    if (resource.resourceType === 'appointment' && resource.startDate) {
      const date = new Date(resource.startDate);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('ro-RO', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    }
    
    // Fallback to updatedAt time
    return new Date(resource.updatedAt).toLocaleTimeString('ro-RO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
      case 'invoice':
        return 'Factură';
      case 'medic':
        return 'Medic';
      case 'treatment':
        return 'Tratament';
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
      case 'invoice':
        return 'Factură nouă sau actualizată';
      case 'medic':
        return 'Medic nou sau actualizat';
      case 'treatment':
        return 'Tratament nou sau actualizat';
      default:
        return 'Activitate nouă';
    }
  }
}
