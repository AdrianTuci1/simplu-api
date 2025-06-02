import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, tenantId: string): Promise<Employee> {
    const employee = new Employee();
    Object.assign(employee, {
      ...createEmployeeDto,
      tenant: { id: tenantId },
    });
    return this.employeesRepository.save(employee);
  }

  async findAll(tenantId: string): Promise<Employee[]> {
    return this.employeesRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['tenant', 'user'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant', 'user'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, tenantId: string): Promise<Employee> {
    const employee = await this.findOne(id, tenantId);
    Object.assign(employee, updateEmployeeDto);
    return this.employeesRepository.save(employee);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const employee = await this.findOne(id, tenantId);
    await this.employeesRepository.remove(employee);
  }

  async findByUserId(userId: string, tenantId: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { user: { id: userId }, tenant: { id: tenantId } },
      relations: ['tenant', 'user'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee not found for user ID ${userId}`);
    }

    return employee;
  }
} 