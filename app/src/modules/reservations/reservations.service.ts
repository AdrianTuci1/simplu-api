import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Client } from '../clients/entities/client.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Service } from '../services/entities/service.entity';
import { ClientsService } from '../clients/clients.service';
import { EmployeesService } from '../employees/employees.service';
import { ServicesService } from '../services/services.service';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
    private clientsService: ClientsService,
    private employeesService: EmployeesService,
    private servicesService: ServicesService,
    private kafkaService: KafkaService,
  ) {}

  async create(createReservationDto: CreateReservationDto, tenantId: string): Promise<Reservation> {
    const { clientId, employeeId, serviceId, ...reservationData } = createReservationDto;

    const client = await this.clientsService.findOne(clientId, tenantId);
    const employee = await this.employeesService.findOne(employeeId, tenantId);
    const service = await this.servicesService.findOne(serviceId, tenantId);

    // Check if employee is available at the requested time
    const isAvailable = await this.checkEmployeeAvailability(
      employeeId,
      createReservationDto.startTime,
      createReservationDto.endTime,
      tenantId,
    );
    if (!isAvailable) {
      throw new BadRequestException('Employee is not available at the requested time');
    }

    const reservation = new Reservation();
    Object.assign(reservation, {
      ...reservationData,
      tenant: { id: tenantId },
      client: { id: clientId },
      employee: { id: employeeId },
      service: { id: serviceId },
    });

    const savedReservation = await this.reservationsRepository.save(reservation);
    
    // Publish reservation created event
    await this.kafkaService.publishEvent('reservations', {
      type: 'reservation.created',
      data: savedReservation,
    });

    return savedReservation;
  }

  async findAll(tenantId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['tenant', 'client', 'employee', 'service'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant', 'client', 'employee', 'service'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto, tenantId: string): Promise<Reservation> {
    const reservation = await this.findOne(id, tenantId);

    if (updateReservationDto.startTime || updateReservationDto.endTime) {
      const employee = await reservation.employee;
      const isAvailable = await this.checkEmployeeAvailability(
        employee.id,
        updateReservationDto.startTime || reservation.startTime,
        updateReservationDto.endTime || reservation.endTime,
        tenantId,
        id, // Exclude current reservation from availability check
      );
      if (!isAvailable) {
        throw new BadRequestException('Employee is not available at the requested time');
      }
    }

    Object.assign(reservation, updateReservationDto);
    return this.reservationsRepository.save(reservation);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const reservation = await this.findOne(id, tenantId);
    await this.reservationsRepository.remove(reservation);
  }

  async findByClient(clientId: string, tenantId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { client: { id: clientId }, tenant: { id: tenantId } },
      relations: ['tenant', 'client', 'employee', 'service'],
    });
  }

  async findByEmployee(employeeId: string, tenantId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { employee: { id: employeeId }, tenant: { id: tenantId } },
      relations: ['tenant', 'client', 'employee', 'service'],
    });
  }

  async updateStatus(id: string, status: ReservationStatus, tenantId: string): Promise<Reservation> {
    const reservation = await this.findOne(id, tenantId);
    reservation.status = status;
    const updatedReservation = await this.reservationsRepository.save(reservation);

    // Publish reservation status updated event
    await this.kafkaService.publishEvent('reservations', {
      type: 'reservation.status_updated',
      data: updatedReservation,
    });

    return updatedReservation;
  }

  private async checkEmployeeAvailability(
    employeeId: string,
    startTime: Date,
    endTime: Date,
    tenantId: string,
    excludeReservationId?: string,
  ): Promise<boolean> {
    const query = this.reservationsRepository
      .createQueryBuilder('reservation')
      .where('reservation.employee.id = :employeeId', { employeeId })
      .andWhere('reservation.tenant.id = :tenantId', { tenantId })
      .andWhere('reservation.status NOT IN (:...statuses)', {
        statuses: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
      })
      .andWhere(
        '(reservation.startTime <= :endTime AND reservation.endTime >= :startTime)',
        { startTime, endTime },
      );

    if (excludeReservationId) {
      query.andWhere('reservation.id != :excludeReservationId', { excludeReservationId });
    }

    const conflictingReservations = await query.getMany();
    return conflictingReservations.length === 0;
  }
} 