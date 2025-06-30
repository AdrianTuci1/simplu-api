import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentType, AppointmentStatus } from './entities/appointment.entity';
import { Service, ServiceType } from '../services/entities/service.entity';
import { Package } from '../packages/entities/package.entity';

export interface CreateAppointmentDto {
  clientId: string;
  doctorId?: string;
  trainerId?: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  notes?: string;
  status: string;
  // Dental-specific
  doctorNotes?: string;
  treatmentType?: string;
  packageIds?: string[];
  // Gym-specific
  classType?: string;
  trainerNotes?: string;
  serviceIds?: string[];
  // Hotel-specific
  roomNumber?: string;
  checkIn?: string;
  checkOut?: string;
  specialRequests?: string;
  roomServiceIds?: string[]; // Multiple rooms for hotel reservations
}

export interface DentalFilters {
  startDate: string;
  endDate: string;
  doctorId?: string;
  status?: string;
}

export interface GymFilters {
  type: 'today' | 'active-members' | 'all-members';
  date?: string;
  classType?: string;
  trainerId?: string;
}

export interface HotelFilters {
  startDate: string;
  endDate: string;
  roomType?: string;
  status?: string;
}

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
  ) {}

  async getDentalTimeline(tenantId: string, locationId: string, filters: DentalFilters) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.employee', 'employee')
      .leftJoinAndSelect('appointment.packages', 'packages')
      .where('appointment.type = :type', { type: AppointmentType.DENTAL })
      .andWhere('appointment.tenant.id = :tenantId', { tenantId })
      .andWhere('appointment.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

    if (locationId) {
      queryBuilder.andWhere('appointment.locationId = :locationId', { locationId });
    }

    if (filters.doctorId) {
      queryBuilder.andWhere('appointment.employee.id = :doctorId', { doctorId: filters.doctorId });
    }

    if (filters.status) {
      queryBuilder.andWhere('appointment.status = :status', { status: filters.status });
    }

    const appointments = await queryBuilder
      .orderBy('appointment.date', 'ASC')
      .addOrderBy('appointment.time', 'ASC')
      .getMany();

    return {
      appointments,
      total: appointments.length,
      filters,
      tenantId,
      locationId,
    };
  }

  async createDentalAppointment(createAppointmentDto: CreateAppointmentDto, tenantId: string, locationId: string) {
    const appointmentData: any = {
      type: AppointmentType.DENTAL,
      status: createAppointmentDto.status as AppointmentStatus,
      date: new Date(createAppointmentDto.date),
      time: createAppointmentDto.time,
      duration: createAppointmentDto.duration,
      service: createAppointmentDto.service,
      notes: createAppointmentDto.notes,
      doctorNotes: createAppointmentDto.doctorNotes,
      treatmentType: createAppointmentDto.treatmentType,
      tenant: Promise.resolve({ id: tenantId } as any),
      client: Promise.resolve({ id: createAppointmentDto.clientId } as any),
      locationId,
    };

    if (createAppointmentDto.doctorId) {
      appointmentData.employee = Promise.resolve({ id: createAppointmentDto.doctorId } as any);
    }

    const appointment = this.appointmentRepository.create(appointmentData);
    const savedAppointment = await this.appointmentRepository.save(appointment) as unknown as Appointment;

    // Add packages if provided
    if (createAppointmentDto.packageIds && createAppointmentDto.packageIds.length > 0) {
      const packages = await this.packageRepository.findByIds(createAppointmentDto.packageIds);
      savedAppointment.packages = Promise.resolve(packages);
      await this.appointmentRepository.save(savedAppointment);
    }

    return this.getAppointmentWithRelations(savedAppointment.id);
  }

  async getGymTimeline(tenantId: string, locationId: string, filters: GymFilters) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.employee', 'employee')
      .leftJoinAndSelect('appointment.services', 'services')
      .where('appointment.type = :type', { type: AppointmentType.GYM })
      .andWhere('appointment.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      queryBuilder.andWhere('appointment.locationId = :locationId', { locationId });
    }

    if (filters.type === 'today') {
      const today = new Date().toISOString().split('T')[0];
      queryBuilder.andWhere('appointment.date = :date', { date: today });
    } else if (filters.type === 'active-members') {
      // Get active gym members (clients with active memberships)
      queryBuilder.andWhere('appointment.status = :status', { status: AppointmentStatus.CONFIRMED });
    } else if (filters.type === 'all-members' && filters.date) {
      queryBuilder.andWhere('appointment.date = :date', { date: filters.date });
    }

    if (filters.classType) {
      queryBuilder.andWhere('appointment.classType = :classType', { classType: filters.classType });
    }

    if (filters.trainerId) {
      queryBuilder.andWhere('appointment.employee.id = :trainerId', { trainerId: filters.trainerId });
    }

    const appointments = await queryBuilder
      .orderBy('appointment.date', 'ASC')
      .addOrderBy('appointment.time', 'ASC')
      .getMany();

    return {
      appointments,
      total: appointments.length,
      filters,
      tenantId,
      locationId,
    };
  }

  async createGymAppointment(createAppointmentDto: CreateAppointmentDto, tenantId: string, locationId: string) {
    const appointmentData: any = {
      type: AppointmentType.GYM,
      status: createAppointmentDto.status as AppointmentStatus,
      date: new Date(createAppointmentDto.date),
      time: createAppointmentDto.time,
      duration: createAppointmentDto.duration,
      service: createAppointmentDto.service,
      notes: createAppointmentDto.notes,
      classType: createAppointmentDto.classType,
      trainerNotes: createAppointmentDto.trainerNotes,
      tenant: Promise.resolve({ id: tenantId } as any),
      client: Promise.resolve({ id: createAppointmentDto.clientId } as any),
      locationId,
    };

    if (createAppointmentDto.trainerId) {
      appointmentData.employee = Promise.resolve({ id: createAppointmentDto.trainerId } as any);
    }

    const appointment = this.appointmentRepository.create(appointmentData);
    const savedAppointment = await this.appointmentRepository.save(appointment) as unknown as Appointment;

    // Add services if provided
    if (createAppointmentDto.serviceIds && createAppointmentDto.serviceIds.length > 0) {
      const services = await this.serviceRepository.findByIds(createAppointmentDto.serviceIds);
      savedAppointment.services = Promise.resolve(services);
      await this.appointmentRepository.save(savedAppointment);
    }

    return this.getAppointmentWithRelations(savedAppointment.id);
  }

  async getHotelTimeline(tenantId: string, locationId: string, filters: HotelFilters) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.services', 'services')
      .where('appointment.type = :type', { type: AppointmentType.HOTEL })
      .andWhere('appointment.tenant.id = :tenantId', { tenantId })
      .andWhere('appointment.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

    if (locationId) {
      queryBuilder.andWhere('appointment.locationId = :locationId', { locationId });
    }

    if (filters.roomType) {
      queryBuilder.andWhere('appointment.service = :roomType', { roomType: filters.roomType });
    }

    if (filters.status) {
      queryBuilder.andWhere('appointment.status = :status', { status: filters.status });
    }

    const reservations = await queryBuilder
      .orderBy('appointment.date', 'ASC')
      .addOrderBy('appointment.time', 'ASC')
      .getMany();

    return {
      reservations,
      total: reservations.length,
      filters,
      tenantId,
      locationId,
    };
  }

  async createHotelReservation(createAppointmentDto: CreateAppointmentDto, tenantId: string, locationId: string) {
    const reservations: Appointment[] = [];

    // If multiple rooms are specified, create a reservation for each room
    if (createAppointmentDto.roomServiceIds && createAppointmentDto.roomServiceIds.length > 0) {
      for (const roomServiceId of createAppointmentDto.roomServiceIds) {
        const appointmentData: any = {
          type: AppointmentType.HOTEL,
          status: createAppointmentDto.status as AppointmentStatus,
          date: new Date(createAppointmentDto.date),
          time: createAppointmentDto.time,
          duration: createAppointmentDto.duration,
          service: createAppointmentDto.service,
          notes: createAppointmentDto.notes,
          roomNumber: createAppointmentDto.roomNumber,
          checkIn: createAppointmentDto.checkIn ? new Date(createAppointmentDto.checkIn) : null,
          checkOut: createAppointmentDto.checkOut ? new Date(createAppointmentDto.checkOut) : null,
          specialRequests: createAppointmentDto.specialRequests,
          tenant: Promise.resolve({ id: tenantId } as any),
          client: Promise.resolve({ id: createAppointmentDto.clientId } as any),
          locationId,
        };

        const appointment = this.appointmentRepository.create(appointmentData);
        const savedAppointment = await this.appointmentRepository.save(appointment) as unknown as Appointment;

        // Add the specific room service
        const roomService = await this.serviceRepository.findOne({ where: { id: roomServiceId } });
        if (roomService) {
          savedAppointment.services = Promise.resolve([roomService]);
          await this.appointmentRepository.save(savedAppointment);
        }

        const appointmentWithRelations = await this.getAppointmentWithRelations(savedAppointment.id);
        if (appointmentWithRelations) {
          reservations.push(appointmentWithRelations);
        }
      }
    } else {
      // Single room reservation
      const appointmentData: any = {
        type: AppointmentType.HOTEL,
        status: createAppointmentDto.status as AppointmentStatus,
        date: new Date(createAppointmentDto.date),
        time: createAppointmentDto.time,
        duration: createAppointmentDto.duration,
        service: createAppointmentDto.service,
        notes: createAppointmentDto.notes,
        roomNumber: createAppointmentDto.roomNumber,
        checkIn: createAppointmentDto.checkIn ? new Date(createAppointmentDto.checkIn) : null,
        checkOut: createAppointmentDto.checkOut ? new Date(createAppointmentDto.checkOut) : null,
        specialRequests: createAppointmentDto.specialRequests,
        tenant: Promise.resolve({ id: tenantId } as any),
        client: Promise.resolve({ id: createAppointmentDto.clientId } as any),
        locationId,
      };

      const appointment = this.appointmentRepository.create(appointmentData);
      const savedAppointment = await this.appointmentRepository.save(appointment) as unknown as Appointment;
      const appointmentWithRelations = await this.getAppointmentWithRelations(savedAppointment.id);
      if (appointmentWithRelations) {
        reservations.push(appointmentWithRelations);
      }
    }

    return {
      reservations,
      total: reservations.length,
      clientId: createAppointmentDto.clientId,
      tenantId,
      locationId,
    };
  }

  private async getAppointmentWithRelations(id: string) {
    return this.appointmentRepository.findOne({
      where: { id },
      relations: ['client', 'employee', 'tenant', 'packages', 'services'],
    });
  }
} 