import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createServiceDto: CreateServiceDto, tenantId: string): Promise<Service> {
    const service = new Service();
    Object.assign(service, {
      ...createServiceDto,
      tenant: { id: tenantId },
    });
    return this.serviceRepository.save(service);
  }

  async findAll(tenantId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['tenant', 'employees'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant', 'employees'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto, tenantId: string): Promise<Service> {
    const service = await this.findOne(id, tenantId);
    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const service = await this.findOne(id, tenantId);
    await this.serviceRepository.remove(service);
  }

  async addEmployee(id: string, employeeId: string, tenantId: string): Promise<Service> {
    const service = await this.findOne(id, tenantId);
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, tenant: { id: tenantId } },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const employees = await service.employees;
    if (!employees.some(e => e.id === employeeId)) {
      employees.push(employee);
      service.employees = Promise.resolve(employees);
      return this.serviceRepository.save(service);
    }

    return service;
  }

  async removeEmployee(id: string, employeeId: string, tenantId: string): Promise<Service> {
    const service = await this.findOne(id, tenantId);
    const employees = await service.employees;
    service.employees = Promise.resolve(employees.filter(e => e.id !== employeeId));
    return this.serviceRepository.save(service);
  }
} 